/**
 * @file Constraint system implementation
 *
 * Handles DiagramML constraints (constr elements) that define
 * size, position, and spacing rules for layout nodes.
 *
 * @see ECMA-376 Part 1, Section 21.4.2.4 - constr
 * @see ECMA-376 Part 1, Section 21.4.7.20 - ST_ConstraintType
 * @see ECMA-376 Part 1, Section 21.4.7.21 - ST_ConstraintRelationship
 */

import type {
  DiagramConstraint,
  DiagramConstraintType,
  DiagramConstraintRelationship,
  DiagramRule,
} from "../types";
import type { LayoutNode, LayoutBounds, LayoutContext } from "./types";

// =============================================================================
// Types
// =============================================================================

/**
 * Resolved constraint value
 */
export type ResolvedConstraint = {
  /** The constraint type */
  readonly type: DiagramConstraintType;
  /** Resolved numeric value */
  readonly value: number;
  /** Whether this is a reference to another constraint */
  readonly isReference: boolean;
  /** Target node name (if applicable) */
  readonly forName?: string;
};

/**
 * Constraint context for resolution
 */
export type ConstraintContext = {
  /** Available bounds */
  readonly bounds: LayoutBounds;
  /** Parent node bounds (if in child context) */
  readonly parentBounds?: LayoutBounds;
  /** Sibling nodes (for reference) */
  readonly siblings: readonly LayoutNode[];
  /** Named nodes map */
  readonly namedNodes: ReadonlyMap<string, LayoutNode>;
  /** Previously resolved constraints */
  readonly resolvedConstraints: Map<string, number>;
};

/**
 * Constraint application result
 */
export type ConstraintResult = {
  /** Modified node bounds */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

// =============================================================================
// Constraint Resolution
// =============================================================================

/**
 * Resolve a constraint value
 */
export function resolveConstraint(
  constraint: DiagramConstraint,
  context: ConstraintContext
): ResolvedConstraint | undefined {
  const { type } = constraint;
  if (!type) {
    return undefined;
  }

  // Parse numeric value
  const numericValue = parseConstraintValue(constraint.value);
  const factor = parseConstraintValue(constraint.factor) ?? 1;
  const min = parseConstraintValue(constraint.min);
  const max = parseConstraintValue(constraint.max);

  // Check if this references another constraint
  if (constraint.referenceType) {
    const refKey = buildConstraintKey(constraint.referenceType, constraint.referenceForName);
    const refValue = context.resolvedConstraints.get(refKey);

    if (refValue !== undefined) {
      let resolvedValue = refValue * factor;
      resolvedValue = applyMinMax(resolvedValue, min, max);

      return {
        type,
        value: resolvedValue,
        isReference: true,
        forName: constraint.forName,
      };
    }
  }

  // Resolve based on constraint type
  const baseValue = resolveConstraintType(type, numericValue, context);
  let resolvedValue = baseValue * factor;
  resolvedValue = applyMinMax(resolvedValue, min, max);

  return {
    type,
    value: resolvedValue,
    isReference: false,
    forName: constraint.forName,
  };
}

/**
 * Resolve constraint value based on type
 */
function resolveConstraintType(
  type: DiagramConstraintType,
  explicitValue: number | undefined,
  context: ConstraintContext
): number {
  const { bounds } = context;

  // If explicit value provided, use it
  if (explicitValue !== undefined) {
    return explicitValue;
  }

  // Resolve based on type
  switch (type) {
    // Width/Height constraints
    case "w":
      return bounds.width;
    case "h":
      return bounds.height;

    // Position constraints
    case "l":
      return bounds.x;
    case "t":
      return bounds.y;
    case "r":
      return bounds.x + bounds.width;
    case "b":
      return bounds.y + bounds.height;

    // Center constraints
    case "ctrX":
      return bounds.x + bounds.width / 2;
    case "ctrY":
      return bounds.y + bounds.height / 2;

    // Offset constraints
    case "wOff":
    case "hOff":
    case "lOff":
    case "tOff":
    case "rOff":
    case "bOff":
    case "ctrXOff":
    case "ctrYOff":
      return 0;

    // Margin constraints
    case "lMarg":
    case "rMarg":
    case "tMarg":
    case "bMarg":
      return 10; // Default margin

    // Spacing constraints
    case "sp":
    case "sibSp":
    case "secSibSp":
      return 10; // Default spacing

    // Font size constraints
    case "primFontSz":
      return 18; // Default primary font size (1800 EMU / 100)
    case "secFontSz":
      return 14; // Default secondary font size

    // Connector distance
    case "connDist":
    case "bendDist":
      return 20;

    // Padding
    case "begPad":
    case "endPad":
    case "begMarg":
    case "endMarg":
      return 5;

    // Arrow dimensions
    case "wArH":
    case "hArH":
      return 10;

    // Pyramid ratio
    case "pyraAcctRatio":
      return 0.3;

    // Stem thickness
    case "stemThick":
      return 2;

    // Diameter (for cycle layouts)
    case "diam":
      return Math.min(bounds.width, bounds.height);

    // Alignment offset
    case "alignOff":
      return 0;

    // User-defined constraints (userA-Z)
    default:
      if (type.startsWith("user")) {
        return 0;
      }
      return 0;
  }
}

// =============================================================================
// Constraint Application
// =============================================================================

/**
 * Apply constraints to a layout node
 */
export function applyConstraints(
  node: LayoutNode,
  constraints: readonly DiagramConstraint[],
  context: ConstraintContext
): ConstraintResult {
  let x = node.x;
  let y = node.y;
  let width = node.width;
  let height = node.height;

  // Resolve and apply each constraint
  for (const constraint of constraints) {
    // Skip if constraint doesn't apply to this node
    if (constraint.forName && constraint.forRelationship === "self") {
      // Check if this is the target node
      // For now, apply to all nodes
    }

    const resolved = resolveConstraint(constraint, context);
    if (!resolved) {
      continue;
    }

    // Store resolved value for reference by other constraints
    const key = buildConstraintKey(resolved.type, resolved.forName);
    context.resolvedConstraints.set(key, resolved.value);

    // Apply constraint
    switch (resolved.type) {
      case "w":
        width = resolved.value;
        break;
      case "h":
        height = resolved.value;
        break;
      case "l":
        x = resolved.value;
        break;
      case "t":
        y = resolved.value;
        break;
      case "r":
        x = resolved.value - width;
        break;
      case "b":
        y = resolved.value - height;
        break;
      case "ctrX":
        x = resolved.value - width / 2;
        break;
      case "ctrY":
        y = resolved.value - height / 2;
        break;
      case "wOff":
        width += resolved.value;
        break;
      case "hOff":
        height += resolved.value;
        break;
      case "lOff":
        x += resolved.value;
        break;
      case "tOff":
        y += resolved.value;
        break;
      case "rOff":
        x -= resolved.value;
        break;
      case "bOff":
        y -= resolved.value;
        break;
      case "ctrXOff":
        x += resolved.value;
        break;
      case "ctrYOff":
        y += resolved.value;
        break;
      // Margin and spacing constraints affect layout calculations
      // but don't directly modify x/y/width/height
      default:
        break;
    }
  }

  return { x, y, width, height };
}

/**
 * Apply constraints to all nodes in a layout
 */
export function applyConstraintsToLayout(
  nodes: readonly LayoutNode[],
  constraints: readonly DiagramConstraint[],
  bounds: LayoutBounds
): LayoutNode[] {
  const resolvedConstraints = new Map<string, number>();
  const namedNodes = new Map<string, LayoutNode>();

  // Build named nodes map
  for (const node of nodes) {
    if (node.treeNode.propertySet?.presentationName) {
      namedNodes.set(node.treeNode.propertySet.presentationName, node);
    }
  }

  return nodes.map((node) => {
    const context: ConstraintContext = {
      bounds,
      siblings: nodes,
      namedNodes,
      resolvedConstraints,
    };

    const result = applyConstraints(node, constraints, context);

    return {
      ...node,
      x: result.x,
      y: result.y,
      width: result.width,
      height: result.height,
    };
  });
}

// =============================================================================
// Constraint Evaluation
// =============================================================================

/**
 * Evaluate constraint operator
 */
export function evaluateConstraintOperator(
  leftValue: number,
  operator: string | undefined,
  rightValue: number
): boolean {
  switch (operator) {
    case "equ":
      return leftValue === rightValue;
    case "gte":
      return leftValue >= rightValue;
    case "lte":
      return leftValue <= rightValue;
    case "none":
    default:
      return true;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse a constraint value string to number
 */
function parseConstraintValue(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const num = parseFloat(value);
  if (isNaN(num)) {
    return undefined;
  }

  return num;
}

/**
 * Apply min/max bounds to a value
 */
function applyMinMax(
  value: number,
  min: number | undefined,
  max: number | undefined
): number {
  let result = value;
  if (min !== undefined && result < min) {
    result = min;
  }
  if (max !== undefined && result > max) {
    result = max;
  }
  return result;
}

/**
 * Build a key for constraint lookup
 */
function buildConstraintKey(type: DiagramConstraintType, forName?: string): string {
  return forName ? `${type}:${forName}` : type;
}

// =============================================================================
// Constraint Utilities
// =============================================================================

/**
 * Get spacing constraint value
 */
export function getSpacingConstraint(
  constraints: readonly DiagramConstraint[],
  context: ConstraintContext,
  defaultValue: number = 10
): number {
  const spacingConstraint = constraints.find(
    (c) => c.type === "sp" || c.type === "sibSp"
  );

  if (spacingConstraint) {
    const resolved = resolveConstraint(spacingConstraint, context);
    if (resolved) {
      return resolved.value;
    }
  }

  return defaultValue;
}

/**
 * Get width constraint value
 */
export function getWidthConstraint(
  constraints: readonly DiagramConstraint[],
  context: ConstraintContext,
  defaultValue: number
): number {
  const widthConstraint = constraints.find((c) => c.type === "w");

  if (widthConstraint) {
    const resolved = resolveConstraint(widthConstraint, context);
    if (resolved) {
      return resolved.value;
    }
  }

  return defaultValue;
}

/**
 * Get height constraint value
 */
export function getHeightConstraint(
  constraints: readonly DiagramConstraint[],
  context: ConstraintContext,
  defaultValue: number
): number {
  const heightConstraint = constraints.find((c) => c.type === "h");

  if (heightConstraint) {
    const resolved = resolveConstraint(heightConstraint, context);
    if (resolved) {
      return resolved.value;
    }
  }

  return defaultValue;
}

// =============================================================================
// Topological Constraint Resolution
// =============================================================================

/**
 * Sort constraints topologically to handle dependencies.
 * Constraints that reference other constraints must be resolved after their dependencies.
 *
 * @see ECMA-376 Part 1, Section 21.4.2.4 - refType attribute
 */
export function sortConstraintsByDependency(
  constraints: readonly DiagramConstraint[]
): DiagramConstraint[] {
  // Build adjacency list: key -> set of keys that depend on it
  // Also track which constraints depend on which
  const dependsOn = new Map<string, Set<string>>();
  const constraintMap = new Map<string, DiagramConstraint>();

  for (const constraint of constraints) {
    if (!constraint.type) {continue;}

    const key = buildConstraintKey(constraint.type, constraint.forName);
    constraintMap.set(key, constraint);

    if (!dependsOn.has(key)) {
      dependsOn.set(key, new Set());
    }

    // If this constraint references another, it depends on that reference
    if (constraint.referenceType) {
      const refKey = buildConstraintKey(constraint.referenceType, constraint.referenceForName);
      dependsOn.get(key)!.add(refKey);
    }
  }

  // Kahn's algorithm: process constraints with no dependencies first
  const inDegree = new Map<string, number>();

  // Initialize in-degrees
  for (const key of constraintMap.keys()) {
    inDegree.set(key, dependsOn.get(key)?.size ?? 0);
  }

  // Queue starts with nodes that have no dependencies
  const queue: string[] = [];
  for (const [key, degree] of inDegree) {
    if (degree === 0) {
      queue.push(key);
    }
  }

  const sorted: DiagramConstraint[] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const key = queue.shift()!;
    if (visited.has(key)) {continue;}
    visited.add(key);

    const constraint = constraintMap.get(key);
    if (constraint) {
      sorted.push(constraint);
    }

    // For each constraint that was waiting on this one, decrement its in-degree
    for (const [otherKey, deps] of dependsOn) {
      if (deps.has(key)) {
        const newDegree = (inDegree.get(otherKey) ?? 1) - 1;
        inDegree.set(otherKey, newDegree);
        if (newDegree === 0 && !visited.has(otherKey)) {
          queue.push(otherKey);
        }
      }
    }
  }

  // Add any remaining constraints (circular dependencies or isolated)
  for (const constraint of constraints) {
    if (!constraint.type) {continue;}
    const key = buildConstraintKey(constraint.type, constraint.forName);
    if (!visited.has(key)) {
      sorted.push(constraint);
    }
  }

  return sorted;
}

/**
 * Resolve all constraints for a layout context.
 * Returns a map of constraint type to resolved value.
 *
 * @see ECMA-376 Part 1, Section 21.4.2.4 - constr
 */
export function resolveAllConstraints(
  constraints: readonly DiagramConstraint[],
  context: ConstraintContext
): ReadonlyMap<DiagramConstraintType, number> {
  const sorted = sortConstraintsByDependency(constraints);
  const resolved = new Map<DiagramConstraintType, number>();

  for (const constraint of sorted) {
    const result = resolveConstraint(constraint, context);
    if (result) {
      resolved.set(result.type, result.value);
      // Also store in context for reference by subsequent constraints
      const key = buildConstraintKey(result.type, result.forName);
      context.resolvedConstraints.set(key, result.value);
    }
  }

  return resolved;
}

/**
 * Get nodes matching a constraint relationship.
 *
 * @see ECMA-376 Part 1, Section 21.4.7.21 - ST_ConstraintRelationship
 */
export function getNodesForRelationship(
  relationship: DiagramConstraintRelationship | undefined,
  forName: string | undefined,
  currentNode: LayoutNode,
  allNodes: readonly LayoutNode[],
  namedNodes: ReadonlyMap<string, LayoutNode>
): LayoutNode[] {
  // If forName is specified, look up by name
  if (forName) {
    const namedNode = namedNodes.get(forName);
    return namedNode ? [namedNode] : [];
  }

  // Otherwise use relationship
  switch (relationship) {
    case "self":
      return [currentNode];

    case "ch":
      // Child nodes (not directly available from LayoutNode, need tree structure)
      return currentNode.children as LayoutNode[];

    case "des": {
      // Descendant nodes
      const descendants: LayoutNode[] = [];
      function collectDescendants(node: LayoutNode): void {
        for (const child of node.children) {
          descendants.push(child);
          collectDescendants(child);
        }
      }
      collectDescendants(currentNode);
      return descendants;
    }

    default:
      return [currentNode];
  }
}

// =============================================================================
// Rule Processing
// =============================================================================

/**
 * Apply rules to resolved constraints.
 * Rules can set bounds (min/max) on constraint values.
 */
export function applyRules(
  resolved: Map<DiagramConstraintType, number>,
  rules: readonly DiagramRule[]
): void {
  for (const rule of rules) {
    if (!rule.type) {continue;}

    const constraintType = rule.type as DiagramConstraintType;
    const currentValue = resolved.get(constraintType);

    if (currentValue === undefined) {continue;}

    let newValue = currentValue;

    // Apply factor
    if (rule.factor) {
      const factor = parseFloat(rule.factor);
      if (!isNaN(factor)) {
        newValue *= factor;
      }
    }

    // Apply explicit value
    if (rule.value) {
      const value = parseFloat(rule.value);
      if (!isNaN(value)) {
        newValue = value;
      }
    }

    // Apply min/max bounds
    if (rule.min) {
      const min = parseFloat(rule.min);
      if (!isNaN(min) && newValue < min) {
        newValue = min;
      }
    }

    if (rule.max) {
      const max = parseFloat(rule.max);
      if (!isNaN(max) && newValue > max) {
        newValue = max;
      }
    }

    resolved.set(constraintType, newValue);
  }
}

/**
 * Create constraint context from layout context.
 */
export function createConstraintContext(
  layoutContext: LayoutContext,
  siblings: readonly LayoutNode[] = []
): ConstraintContext {
  return {
    bounds: layoutContext.bounds,
    siblings,
    namedNodes: layoutContext.namedNodes,
    resolvedConstraints: new Map(layoutContext.resolvedConstraints),
  };
}
