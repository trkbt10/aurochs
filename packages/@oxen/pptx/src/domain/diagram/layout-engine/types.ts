/**
 * @file Layout engine types
 *
 * Common types used by diagram layout algorithms.
 *
 * @see ECMA-376 Part 1, Section 21.4 - DrawingML Diagrams
 */

import type { DiagramTreeNode } from "./tree-builder";
import type {
  DiagramAlgorithmType,
  DiagramAlgorithmParam,
  DiagramAnimLvlStr,
  DiagramAnimOneStr,
  DiagramConstraint,
  DiagramConstraintType,
  DiagramDirection,
  DiagramHierBranchStyle,
  DiagramResizeHandlesStr,
} from "../types";

// =============================================================================
// Layout Result Types
// =============================================================================

/**
 * Positioned node with calculated bounds
 */
export type LayoutNode = {
  /** Reference to the tree node */
  readonly treeNode: DiagramTreeNode;
  /** X position (left edge) */
  readonly x: number;
  /** Y position (top edge) */
  readonly y: number;
  /** Width */
  readonly width: number;
  /** Height */
  readonly height: number;
  /** Rotation angle in degrees (optional) */
  readonly rotation?: number;
  /** Child layout nodes */
  readonly children: readonly LayoutNode[];
  /** Whether this node represents a connector (line/arrow between shapes) */
  readonly isConnector?: boolean;
};

/**
 * Layout bounds for a region
 */
export type LayoutBounds = {
  /** X position */
  readonly x: number;
  /** Y position */
  readonly y: number;
  /** Width */
  readonly width: number;
  /** Height */
  readonly height: number;
};

/**
 * Result of layout calculation
 */
export type LayoutResult = {
  /** Root layout nodes */
  readonly nodes: readonly LayoutNode[];
  /** Total bounds of the layout */
  readonly bounds: LayoutBounds;
};

// =============================================================================
// Layout Context
// =============================================================================

/**
 * Context passed to layout algorithms
 *
 * @see ECMA-376 Part 1, Section 21.4.2 - Layout Definition
 */
export type LayoutContext = {
  /** Available bounds for layout */
  readonly bounds: LayoutBounds;
  /** Algorithm parameters */
  readonly params: ReadonlyMap<string, DiagramAlgorithmParamValue>;
  /** Constraints to apply */
  readonly constraints: readonly DiagramConstraint[];
  /** Default spacing between nodes (from constraints or config) */
  readonly defaultSpacing?: number;
  /** Default node width (from constraints or config) */
  readonly defaultNodeWidth?: number;
  /** Default node height (from constraints or config) */
  readonly defaultNodeHeight?: number;

  // ECMA-376 21.4.2.6 forEach / 21.4.2.7 if context
  /** Current tree node being processed (for forEach/if evaluation) */
  readonly currentNode?: DiagramTreeNode;
  /** Position in current forEach iteration (1-based, per 21.4.7.27 pos) */
  readonly position?: number;
  /** Total count in current forEach iteration */
  readonly totalCount?: number;
  /** All tree nodes for axis traversal */
  readonly allNodes?: readonly DiagramTreeNode[];
  /** Parent context (for nested forEach/choose) */
  readonly parent?: LayoutContext;

  // ECMA-376 21.4.2.16 varLst
  /** Variable map for var function evaluation */
  readonly variables: ReadonlyMap<string, DiagramVariableValue>;

  // ECMA-376 21.4.2.4 constr - resolved constraints
  /** Resolved constraint values by type */
  readonly resolvedConstraints: ReadonlyMap<DiagramConstraintType, number>;

  // ECMA-376 21.4.2.9 layoutNode - named node references
  /** Named layout nodes for constraint references */
  readonly namedNodes: ReadonlyMap<string, LayoutNode>;
};

/**
 * Variable value types
 * @see ECMA-376 Part 1, Section 21.4.7 (ST_VariableType values)
 */
export type DiagramVariableValue =
  | DiagramAnimLvlStr
  | DiagramAnimOneStr
  | DiagramDirection
  | DiagramHierBranchStyle
  | DiagramResizeHandlesStr
  | boolean
  | number;

/**
 * Resolved algorithm parameter value
 */
export type DiagramAlgorithmParamValue = string | number | boolean;

// =============================================================================
// Algorithm Registration
// =============================================================================

/**
 * Layout algorithm function signature
 */
export type LayoutAlgorithmFn = (
  nodes: readonly DiagramTreeNode[],
  context: LayoutContext
) => LayoutResult;

/**
 * Registry of layout algorithms by type
 */
export type LayoutAlgorithmRegistry = ReadonlyMap<
  DiagramAlgorithmType,
  LayoutAlgorithmFn
>;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Options for creating a layout context
 */
export type CreateContextOptions = {
  readonly bounds: LayoutBounds;
  readonly params?: readonly DiagramAlgorithmParam[];
  readonly constraints?: readonly DiagramConstraint[];
  readonly currentNode?: DiagramTreeNode;
  readonly position?: number;
  readonly totalCount?: number;
  readonly allNodes?: readonly DiagramTreeNode[];
  readonly parent?: LayoutContext;
  readonly variables?: ReadonlyMap<string, DiagramVariableValue>;
  readonly resolvedConstraints?: ReadonlyMap<DiagramConstraintType, number>;
  readonly namedNodes?: ReadonlyMap<string, LayoutNode>;
};

/**
 * Create a default layout context
 *
 * @see ECMA-376 Part 1, Section 21.4.2 - Layout Definition
 */
export function createDefaultContext(options: CreateContextOptions): LayoutContext {
  const paramMap = new Map<string, DiagramAlgorithmParamValue>();
  if (options.params) {
    for (const param of options.params) {
      if (param.type && param.value !== undefined) {
        paramMap.set(param.type, param.value);
      }
    }
  }

  return {
    bounds: options.bounds,
    params: paramMap,
    constraints: options.constraints ?? [],
    // ECMA-376 21.4.2.6 forEach context
    currentNode: options.currentNode,
    position: options.position,
    totalCount: options.totalCount,
    allNodes: options.allNodes,
    parent: options.parent,
    // ECMA-376 21.4.2.16 varLst
    variables: options.variables ?? new Map(),
    // ECMA-376 21.4.2.4 constr
    resolvedConstraints: options.resolvedConstraints ?? new Map(),
    // ECMA-376 21.4.2.9 layoutNode references
    namedNodes: options.namedNodes ?? new Map(),
  };
}

/**
 * Create a child context for forEach iteration
 *
 * @see ECMA-376 Part 1, Section 21.4.2.6 - forEach
 */
export function createChildContext(
  parent: LayoutContext,
  currentNode: DiagramTreeNode,
  position: number,
  totalCount: number,
  bounds?: LayoutBounds
): LayoutContext {
  return {
    ...parent,
    bounds: bounds ?? parent.bounds,
    currentNode,
    position,
    totalCount,
    parent,
  };
}

/**
 * Get a parameter value with fallback
 */
export function getParam<T extends DiagramAlgorithmParamValue>(
  context: LayoutContext,
  key: string,
  defaultValue: T
): T {
  const value = context.params.get(key);
  if (value === undefined) {
    return defaultValue;
  }
  return value as T;
}

/**
 * Get a resolved constraint value
 *
 * @see ECMA-376 Part 1, Section 21.4.2.4 - constr
 */
export function getConstraint(
  context: LayoutContext,
  type: DiagramConstraintType,
  defaultValue: number
): number {
  const value = context.resolvedConstraints.get(type);
  return value ?? defaultValue;
}

/**
 * Get a variable value
 *
 * @see ECMA-376 Part 1, Section 21.4.2.16 - varLst
 */
export function getVariable<T extends DiagramVariableValue>(
  context: LayoutContext,
  name: string,
  defaultValue: T
): T {
  const value = context.variables.get(name);
  if (value === undefined) {
    return defaultValue;
  }
  return value as T;
}

/**
 * Create empty layout result
 */
export function createEmptyResult(): LayoutResult {
  return {
    nodes: [],
    bounds: { x: 0, y: 0, width: 0, height: 0 },
  };
}

/**
 * Merge bounds to encompass all
 */
export function mergeBounds(...bounds: LayoutBounds[]): LayoutBounds {
  if (bounds.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const b of bounds) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
