/**
 * @file ForEach and conditional branching implementation
 *
 * Handles DiagramML forEach and choose/if/else elements that
 * control iteration and conditional layout generation.
 *
 * @see ECMA-376 Part 1, Section 21.4.5 (ForEach)
 * @see ECMA-376 Part 1, Section 21.4.6 (Choose/If/Else)
 */

import type {
  DiagramForEach,
  DiagramChoose,
  DiagramIf,
  DiagramLayoutContent,
  DiagramFunctionType,
  DiagramFunctionArgument,
  DiagramFunctionOperator,
  DiagramFunctionValue,
  DiagramAxisType,
  DiagramElementType,
} from "../types";
import type { DiagramTreeNode } from "./tree-builder";

// =============================================================================
// Types
// =============================================================================

/**
 * Context for forEach iteration
 */
export type ForEachContext = {
  /** Current tree node being processed */
  readonly currentNode: DiagramTreeNode;
  /** All tree nodes in the data model */
  readonly allNodes: readonly DiagramTreeNode[];
  /** Current iteration index (1-based) */
  readonly position: number;
  /** Total number of iterations */
  readonly count: number;
  /** Variables set by layout */
  readonly variables: ReadonlyMap<string, DiagramFunctionValue>;
  /** Parent context (for nested iterations) */
  readonly parent?: ForEachContext;
};

/**
 * Result of forEach iteration
 */
export type ForEachResult = {
  /** Nodes selected by the forEach */
  readonly selectedNodes: readonly DiagramTreeNode[];
  /** Content to apply for each node */
  readonly content: DiagramLayoutContent;
};

/**
 * Result of choose evaluation
 */
export type ChooseResult = {
  /** Whether condition was matched */
  readonly matched: boolean;
  /** Content to apply (from matching if or else) */
  readonly content?: DiagramLayoutContent;
  /** Name of the branch taken */
  readonly branchName?: string;
};

// =============================================================================
// ForEach Processing
// =============================================================================

/**
 * Process a forEach element
 */
export function processForEach(
  forEach: DiagramForEach,
  context: ForEachContext
): ForEachResult {
  const { currentNode } = context;

  // Select nodes based on axis and pointType
  let selectedNodes = selectNodesByAxis(
    currentNode,
    forEach.axis ?? ["ch"],
    context.allNodes
  );

  // Filter by point type if specified
  if (forEach.pointType && forEach.pointType.length > 0) {
    selectedNodes = filterNodesByPointType(selectedNodes, forEach.pointType);
  }

  // Apply start, step, and count
  selectedNodes = applyIterationParams(
    selectedNodes,
    forEach.start?.[0],
    forEach.step?.[0],
    forEach.count?.[0]
  );

  // Apply hideLastTransition if specified
  if (forEach.hideLastTransition?.[0] === true) {
    selectedNodes = hideLastTransitionNode(selectedNodes);
  }

  return {
    selectedNodes,
    content: forEach.content,
  };
}

/**
 * Select nodes based on axis type
 */
export function selectNodesByAxis(
  currentNode: DiagramTreeNode,
  axes: readonly DiagramAxisType[],
  allNodes: readonly DiagramTreeNode[]
): DiagramTreeNode[] {
  const result: DiagramTreeNode[] = [];

  for (const axis of axes) {
    const axisNodes = selectNodesBySingleAxis(currentNode, axis, allNodes);
    for (const node of axisNodes) {
      if (!result.some((n) => n.id === node.id)) {
        result.push(node);
      }
    }
  }

  return result;
}

/**
 * Select nodes by a single axis type
 */
function selectNodesBySingleAxis(
  currentNode: DiagramTreeNode,
  axis: DiagramAxisType,
  allNodes: readonly DiagramTreeNode[]
): DiagramTreeNode[] {
  switch (axis) {
    case "self":
      return [currentNode];

    case "ch":
      return [...currentNode.children];

    case "des":
      return getDescendants(currentNode, false);

    case "desOrSelf":
      return getDescendants(currentNode, true);

    case "par":
      return findParent(currentNode, allNodes);

    case "ancst":
      return getAncestors(currentNode, allNodes, false);

    case "ancstOrSelf":
      return getAncestors(currentNode, allNodes, true);

    case "root":
      return getRootNode(currentNode, allNodes);

    case "follow":
      return getFollowingSiblings(currentNode, allNodes);

    case "followSib":
      return getFollowingSiblings(currentNode, allNodes);

    case "preced":
      return getPrecedingSiblings(currentNode, allNodes);

    case "precedSib":
      return getPrecedingSiblings(currentNode, allNodes);

    case "none":
      return [];

    default:
      return [];
  }
}

/**
 * Get all descendants of a node
 */
function getDescendants(
  node: DiagramTreeNode,
  includeSelf: boolean
): DiagramTreeNode[] {
  const result: DiagramTreeNode[] = [];

  if (includeSelf) {
    result.push(node);
  }

  function collectDescendants(n: DiagramTreeNode): void {
    for (const child of n.children) {
      result.push(child);
      collectDescendants(child);
    }
  }

  collectDescendants(node);
  return result;
}

/**
 * Find parent of a node
 */
function findParent(
  node: DiagramTreeNode,
  allNodes: readonly DiagramTreeNode[]
): DiagramTreeNode[] {
  function findInTree(
    searchNode: DiagramTreeNode,
    parent: DiagramTreeNode | undefined
  ): DiagramTreeNode | undefined {
    if (searchNode.id === node.id) {
      return parent;
    }
    for (const child of searchNode.children) {
      const found = findInTree(child, searchNode);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  for (const root of allNodes) {
    const parent = findInTree(root, undefined);
    if (parent) {
      return [parent];
    }
  }

  return [];
}

/**
 * Get ancestors of a node
 */
function getAncestors(
  node: DiagramTreeNode,
  allNodes: readonly DiagramTreeNode[],
  includeSelf: boolean
): DiagramTreeNode[] {
  const result: DiagramTreeNode[] = [];

  if (includeSelf) {
    result.push(node);
  }

  let current = node;
  let parent = findParent(current, allNodes);

  while (parent.length > 0) {
    result.push(parent[0]);
    current = parent[0];
    parent = findParent(current, allNodes);
  }

  return result;
}

/**
 * Get root node
 */
function getRootNode(
  node: DiagramTreeNode,
  allNodes: readonly DiagramTreeNode[]
): DiagramTreeNode[] {
  const ancestors = getAncestors(node, allNodes, true);
  if (ancestors.length > 0) {
    return [ancestors[ancestors.length - 1]];
  }
  return [node];
}

/**
 * Get following siblings
 */
function getFollowingSiblings(
  node: DiagramTreeNode,
  allNodes: readonly DiagramTreeNode[]
): DiagramTreeNode[] {
  const parent = findParent(node, allNodes);
  if (parent.length === 0) {
    return [];
  }

  const siblings = parent[0].children;
  const index = siblings.findIndex((s) => s.id === node.id);
  if (index === -1) {
    return [];
  }

  return siblings.slice(index + 1);
}

/**
 * Get preceding siblings
 */
function getPrecedingSiblings(
  node: DiagramTreeNode,
  allNodes: readonly DiagramTreeNode[]
): DiagramTreeNode[] {
  const parent = findParent(node, allNodes);
  if (parent.length === 0) {
    return [];
  }

  const siblings = parent[0].children;
  const index = siblings.findIndex((s) => s.id === node.id);
  if (index === -1) {
    return [];
  }

  return siblings.slice(0, index);
}

/**
 * Filter nodes by point type
 */
export function filterNodesByPointType(
  nodes: readonly DiagramTreeNode[],
  pointTypes: readonly DiagramElementType[]
): DiagramTreeNode[] {
  return nodes.filter((node) => {
    for (const pt of pointTypes) {
      if (matchesPointType(node, pt)) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Check if a node matches a point type
 */
function matchesPointType(
  node: DiagramTreeNode,
  pointType: DiagramElementType
): boolean {
  switch (pointType) {
    case "all":
      return true;
    case "node":
      return node.type === "node";
    case "doc":
      return node.type === "doc";
    case "asst":
      return node.type === "asst";
    case "parTrans":
      return node.type === "parTrans";
    case "sibTrans":
      return node.type === "sibTrans";
    case "pres":
      return node.type === "pres";
    case "nonAsst":
      return node.type !== "asst";
    case "nonNorm":
      return node.type !== "node";
    case "norm":
      return node.type === "node";
    default:
      return false;
  }
}

/**
 * Apply iteration parameters (start, step, count)
 */
function applyIterationParams(
  nodes: readonly DiagramTreeNode[],
  start?: number,
  step?: number,
  count?: number
): DiagramTreeNode[] {
  const startIndex = (start ?? 1) - 1; // Convert to 0-based
  const stepValue = step ?? 1;
  const maxCount = count ?? nodes.length;

  const result: DiagramTreeNode[] = [];
  let collected = 0;

  for (let i = startIndex; i < nodes.length && collected < maxCount; i += stepValue) {
    if (i >= 0 && i < nodes.length) {
      result.push(nodes[i]);
      collected++;
    }
  }

  return result;
}

/**
 * Hide last transition node
 */
function hideLastTransitionNode(
  nodes: readonly DiagramTreeNode[]
): DiagramTreeNode[] {
  if (nodes.length === 0) {
    return [];
  }

  const lastNode = nodes[nodes.length - 1];
  if (lastNode.type === "parTrans" || lastNode.type === "sibTrans") {
    return nodes.slice(0, -1);
  }

  return [...nodes];
}

// =============================================================================
// Choose/If/Else Processing
// =============================================================================

/**
 * Process a choose element
 */
export function processChoose(
  choose: DiagramChoose,
  context: ForEachContext
): ChooseResult {
  // Evaluate if condition
  if (choose.if) {
    const ifResult = evaluateIf(choose.if, context);
    if (ifResult) {
      return {
        matched: true,
        content: choose.if,
        branchName: choose.if.name,
      };
    }
  }

  // Fall through to else
  if (choose.else) {
    return {
      matched: true,
      content: choose.else,
      branchName: choose.else.name,
    };
  }

  return { matched: false };
}

/**
 * Evaluate an if condition
 */
export function evaluateIf(
  ifElement: DiagramIf,
  context: ForEachContext
): boolean {
  const { function: funcType, argument, operator, value } = ifElement;

  if (!funcType) {
    return true; // No condition means always true
  }

  const leftValue = evaluateFunction(funcType, argument, context);
  const rightValue = value;

  return evaluateOperator(leftValue, operator, rightValue);
}

/**
 * Evaluate a function
 */
export function evaluateFunction(
  funcType: DiagramFunctionType,
  argument: DiagramFunctionArgument | undefined,
  context: ForEachContext
): DiagramFunctionValue {
  const { currentNode, position, allNodes, variables } = context;

  switch (funcType) {
    case "cnt":
      // Count of children
      return currentNode.children.length;

    case "depth":
      // Depth in tree
      return currentNode.depth;

    case "maxDepth":
      // Maximum depth in tree
      return calculateMaxDepth(allNodes);

    case "pos":
      // Position in iteration (1-based)
      return position;

    case "posEven":
      // Is position even?
      return position % 2 === 0;

    case "posOdd":
      // Is position odd?
      return position % 2 === 1;

    case "revPos":
      // Reverse position
      return context.count - position + 1;

    case "var":
      // Variable lookup
      if (argument) {
        return variables.get(argument) ?? 0;
      }
      return 0;

    default:
      return 0;
  }
}

/**
 * Calculate maximum depth in tree
 */
function calculateMaxDepth(nodes: readonly DiagramTreeNode[]): number {
  let maxDepth = 0;

  function traverse(node: DiagramTreeNode): void {
    if (node.depth > maxDepth) {
      maxDepth = node.depth;
    }
    for (const child of node.children) {
      traverse(child);
    }
  }

  for (const node of nodes) {
    traverse(node);
  }

  return maxDepth;
}

/**
 * Convert a function value to a numeric value for comparison
 */
function toNumericValue(value: DiagramFunctionValue): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return parseFloat(String(value)) || 0;
}

/**
 * Evaluate comparison operator
 */
export function evaluateOperator(
  leftValue: DiagramFunctionValue,
  operator: DiagramFunctionOperator | undefined,
  rightValue: DiagramFunctionValue | undefined
): boolean {
  if (!operator || rightValue === undefined) {
    return true;
  }

  // Convert to numbers for comparison if possible
  const left = toNumericValue(leftValue);
  const right = toNumericValue(rightValue);

  switch (operator) {
    case "equ":
      // For string comparison, compare as strings
      if (typeof leftValue === "string" && typeof rightValue === "string") {
        return leftValue === rightValue;
      }
      return left === right;

    case "neq":
      if (typeof leftValue === "string" && typeof rightValue === "string") {
        return leftValue !== rightValue;
      }
      return left !== right;

    case "gt":
      return left > right;

    case "gte":
      return left >= right;

    case "lt":
      return left < right;

    case "lte":
      return left <= right;

    default:
      return true;
  }
}

// =============================================================================
// Context Creation
// =============================================================================

/**
 * Create initial ForEach context
 */
export function createForEachContext(
  currentNode: DiagramTreeNode,
  allNodes: readonly DiagramTreeNode[],
  variables?: Map<string, DiagramFunctionValue>
): ForEachContext {
  return {
    currentNode,
    allNodes,
    position: 1,
    count: 1,
    variables: variables ?? new Map(),
  };
}

/**
 * Create child context for nested iteration
 */
export function createForEachChildContext(
  parent: ForEachContext,
  currentNode: DiagramTreeNode,
  position: number,
  count: number
): ForEachContext {
  return {
    currentNode,
    allNodes: parent.allNodes,
    position,
    count,
    variables: parent.variables,
    parent,
  };
}
