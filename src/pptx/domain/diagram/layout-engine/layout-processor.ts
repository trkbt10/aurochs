/**
 * @file Layout Definition Processor
 *
 * Processes DiagramML layout definitions (layoutDef) to generate layout nodes.
 * This is the core engine that interprets ECMA-376 layout definitions.
 *
 * @see ECMA-376 Part 1, Section 21.4.2 - Diagram Definition
 */

import type {
  DiagramLayoutDefinition,
  DiagramLayoutNode,
  DiagramLayoutContent,
  DiagramForEach,
  DiagramChoose,
  DiagramIf,
  DiagramAlgorithm,
  DiagramAxisType,
  DiagramElementType,
} from "../types";
import type { DiagramTreeNode } from "./tree-builder";
import {
  getAncestors,
  getAncestorsOrSelf,
  getDescendants,
  getDescendantsOrSelf,
  getFollowingSiblings,
  getPrecedingSiblings,
  getRoot,
  calculateMaxDepth,
} from "./tree-builder";
import type {
  LayoutContext,
  LayoutNode,
  LayoutResult,
  LayoutBounds,
  DiagramVariableValue,
} from "./types";
import {
  createDefaultContext,
  createChildContext,
  createEmptyResult,
  mergeBounds,
} from "./types";
import {
  createAlgorithmRegistry,
  getLayoutAlgorithm,
} from "./algorithms";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of processing a layout definition
 */
export type LayoutProcessResult = {
  /** Generated layout nodes */
  readonly nodes: readonly LayoutNode[];
  /** Bounds of the generated layout */
  readonly bounds: LayoutBounds;
  /** Named nodes for constraint references */
  readonly namedNodes: ReadonlyMap<string, LayoutNode>;
};

/**
 * Options for layout processing
 */
export type LayoutProcessOptions = {
  /** Available bounds for layout */
  readonly bounds: LayoutBounds;
  /** Tree nodes from data model */
  readonly dataNodes: readonly DiagramTreeNode[];
  /** All tree nodes including nested */
  readonly allNodes: readonly DiagramTreeNode[];
  /** Maximum depth of tree */
  readonly maxDepth: number;
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate result bounds from array of bounds, or empty bounds if array is empty
 */
function calculateResultBounds(allBounds: LayoutBounds[]): LayoutBounds {
  if (allBounds.length > 0) {
    return mergeBounds(...allBounds);
  }
  return { x: 0, y: 0, width: 0, height: 0 };
}

/**
 * Convert a value to a number for comparison
 */
function toComparisonNumber(value: number | boolean | string): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return parseFloat(value) || 0;
}

/**
 * Compare two string values for equality
 */
function compareStrings(left: unknown, right: unknown, negate: boolean): boolean | null {
  if (typeof left === "string" && typeof right === "string") {
    return negate ? left !== right : left === right;
  }
  return null;
}

// =============================================================================
// Main Processor
// =============================================================================

/**
 * Process a layout definition to generate layout nodes.
 *
 * @see ECMA-376 Part 1, Section 21.4.2.8 - layoutDef
 */
export function processLayoutDefinition(
  layoutDef: DiagramLayoutDefinition,
  options: LayoutProcessOptions
): LayoutProcessResult {
  const { bounds, dataNodes, allNodes } = options;

  // Get root layout node from definition
  const rootLayoutNode = layoutDef.layoutNode;
  if (!rootLayoutNode) {
    return {
      nodes: [],
      bounds: { x: 0, y: 0, width: 0, height: 0 },
      namedNodes: new Map(),
    };
  }

  // Create initial context
  const algorithmRegistry = createAlgorithmRegistry();
  const namedNodes = new Map<string, LayoutNode>();

  const initialContext: LayoutContext = createDefaultContext({
    bounds,
    allNodes,
    variables: new Map(),
    resolvedConstraints: new Map(),
    namedNodes,
  });

  // Process root layout node with data nodes
  const result = processLayoutNode(
    rootLayoutNode,
    dataNodes,
    initialContext,
    algorithmRegistry,
    namedNodes
  );

  return {
    nodes: result.nodes,
    bounds: result.bounds,
    namedNodes,
  };
}

/**
 * Process a single layoutNode element.
 *
 * @see ECMA-376 Part 1, Section 21.4.2.9 - layoutNode
 */
function processLayoutNode(
  layoutNode: DiagramLayoutNode,
  dataNodes: readonly DiagramTreeNode[],
  context: LayoutContext,
  algorithmRegistry: ReturnType<typeof createAlgorithmRegistry>,
  namedNodes: Map<string, LayoutNode>
): LayoutResult {
  // 1. Process variables (varLst)
  const variables = processVariables(layoutNode.variables, context);

  // Set currentNode if not already set and we have data nodes
  const currentNode = context.currentNode ?? (dataNodes.length > 0 ? dataNodes[0] : undefined);

  const contextWithVars: LayoutContext = {
    ...context,
    variables,
    currentNode,
  };

  // 2. Collect nodes to process via forEach/choose or direct children
  const processedNodes: LayoutNode[] = [];
  const allBounds: LayoutBounds[] = [];

  // 3. Process forEach elements if present
  if (layoutNode.forEach && layoutNode.forEach.length > 0) {
    for (const forEach of layoutNode.forEach) {
      const forEachResult = processForEachElement(
        forEach,
        dataNodes,
        contextWithVars,
        algorithmRegistry,
        namedNodes
      );
      processedNodes.push(...forEachResult.nodes);
      if (forEachResult.nodes.length > 0) {
        allBounds.push(forEachResult.bounds);
      }
    }
  }

  // 4. Process choose elements if present
  if (layoutNode.choose && layoutNode.choose.length > 0) {
    for (const choose of layoutNode.choose) {
      const chooseResult = processChooseElement(
        choose,
        dataNodes,
        contextWithVars,
        algorithmRegistry,
        namedNodes
      );
      processedNodes.push(...chooseResult.nodes);
      if (chooseResult.nodes.length > 0) {
        allBounds.push(chooseResult.bounds);
      }
    }
  }

  // 5. Process child layoutNode elements
  if (layoutNode.children && layoutNode.children.length > 0) {
    for (const child of layoutNode.children) {
      const childResult = processLayoutNode(
        child,
        dataNodes,
        contextWithVars,
        algorithmRegistry,
        namedNodes
      );
      processedNodes.push(...childResult.nodes);
      if (childResult.nodes.length > 0) {
        allBounds.push(childResult.bounds);
      }
    }
  }

  // 6. Apply algorithm if present and we have data nodes
  if (layoutNode.algorithm && dataNodes.length > 0 && processedNodes.length === 0) {
    const algorithmResult = applyAlgorithm(
      layoutNode.algorithm,
      dataNodes,
      contextWithVars,
      algorithmRegistry
    );
    processedNodes.push(...algorithmResult.nodes);
    allBounds.push(algorithmResult.bounds);
  }

  // 7. Register named node if name is specified
  if (layoutNode.name && processedNodes.length > 0) {
    namedNodes.set(layoutNode.name, processedNodes[0]);
  }

  // 8. Calculate merged bounds
  const resultBounds = calculateResultBounds(allBounds);

  return {
    nodes: processedNodes,
    bounds: resultBounds,
  };
}

// =============================================================================
// forEach Processing
// =============================================================================

/**
 * Process a forEach element.
 *
 * @see ECMA-376 Part 1, Section 21.4.2.6 - forEach
 */
function processForEachElement(
  forEach: DiagramForEach,
  dataNodes: readonly DiagramTreeNode[],
  context: LayoutContext,
  algorithmRegistry: ReturnType<typeof createAlgorithmRegistry>,
  namedNodes: Map<string, LayoutNode>
): LayoutResult {
  const allResults: LayoutNode[] = [];
  const allBounds: LayoutBounds[] = [];

  // Get the current node to iterate from
  const currentNode = context.currentNode ?? (dataNodes.length > 0 ? dataNodes[0] : undefined);
  if (!currentNode) {
    return createEmptyResult();
  }

  // Select nodes based on axis
  // eslint-disable-next-line no-restricted-syntax
  let selectedNodes = selectNodesByAxis(currentNode, forEach.axis);

  // Filter by point type
  if (forEach.pointType && forEach.pointType.length > 0) {
    selectedNodes = filterByPointType(selectedNodes, forEach.pointType);
  }

  // Apply start, step, count
  selectedNodes = applyIterationParams(
    selectedNodes,
    forEach.start,
    forEach.step,
    forEach.count
  );

  // Apply hideLastTransition
  if (forEach.hideLastTransition?.[0] === true) {
    selectedNodes = selectedNodes.filter((n, i) => {
      if (i === selectedNodes.length - 1) {
        return n.type !== "parTrans" && n.type !== "sibTrans";
      }
      return true;
    });
  }

  // Process each selected node
  for (let i = 0; i < selectedNodes.length; i++) {
    const node = selectedNodes[i];
    const position = i + 1;
    const totalCount = selectedNodes.length;

    // Create child context for this iteration
    const childContext = createChildContext(
      context,
      node,
      position,
      totalCount
    );

    // Process the forEach content
    const contentResult = processLayoutContent(
      forEach.content,
      [node],
      childContext,
      algorithmRegistry,
      namedNodes
    );

    allResults.push(...contentResult.nodes);
    if (contentResult.nodes.length > 0) {
      allBounds.push(contentResult.bounds);
    }
  }

  return {
    nodes: allResults,
    bounds: allBounds.length > 0 ? mergeBounds(...allBounds) : { x: 0, y: 0, width: 0, height: 0 },
  };
}

// =============================================================================
// choose Processing
// =============================================================================

/**
 * Process a choose element.
 *
 * @see ECMA-376 Part 1, Section 21.4.2.7 - choose/if/else
 */
function processChooseElement(
  choose: DiagramChoose,
  dataNodes: readonly DiagramTreeNode[],
  context: LayoutContext,
  algorithmRegistry: ReturnType<typeof createAlgorithmRegistry>,
  namedNodes: Map<string, LayoutNode>
): LayoutResult {
  // Evaluate if condition
  if (choose.if && evaluateIfCondition(choose.if, context)) {
    return processLayoutContent(
      choose.if,
      dataNodes,
      context,
      algorithmRegistry,
      namedNodes
    );
  }

  // Fall through to else
  if (choose.else) {
    return processLayoutContent(
      choose.else,
      dataNodes,
      context,
      algorithmRegistry,
      namedNodes
    );
  }

  return createEmptyResult();
}

/**
 * Evaluate an if condition.
 *
 * @see ECMA-376 Part 1, Section 21.4.7.27 - ST_FunctionType
 */
function evaluateIfCondition(
  ifElement: DiagramIf,
  context: LayoutContext
): boolean {
  const { function: funcType, argument, operator, value } = ifElement;

  // No function means always true
  if (!funcType) {
    return true;
  }

  // Evaluate function
  const leftValue = evaluateFunction(funcType, argument, context);

  // No operator means truthy evaluation
  if (!operator || value === undefined) {
    return Boolean(leftValue);
  }

  // Compare values
  return evaluateComparison(leftValue, operator, value);
}

/**
 * Evaluate a function.
 */
function evaluateFunction(
  funcType: string,
  argument: string | undefined,
  context: LayoutContext
): number | boolean | string {
  const currentNode = context.currentNode;
  const position = context.position ?? 1;
  const totalCount = context.totalCount ?? 1;
  const allNodes = context.allNodes ?? [];

  switch (funcType) {
    case "cnt":
      return currentNode?.children.length ?? 0;

    case "depth":
      return currentNode?.depth ?? 0;

    case "maxDepth":
      return calculateMaxDepth(allNodes);

    case "pos":
      return position;

    case "posEven":
      return position % 2 === 0;

    case "posOdd":
      return position % 2 === 1;

    case "revPos":
      return totalCount - position + 1;

    case "var":
      if (argument) {
        return context.variables.get(argument) ?? 0;
      }
      return 0;

    default:
      return 0;
  }
}

/**
 * Evaluate a comparison.
 */
function evaluateComparison(
  left: number | boolean | string,
  operator: string,
  right: number | boolean | string
): boolean {
  // Convert to numbers for numeric comparison
  const leftNum = toComparisonNumber(left);
  const rightNum = toComparisonNumber(right);

  switch (operator) {
    case "equ": {
      const strResult = compareStrings(left, right, false);
      return strResult !== null ? strResult : leftNum === rightNum;
    }

    case "neq": {
      const strResult = compareStrings(left, right, true);
      return strResult !== null ? strResult : leftNum !== rightNum;
    }

    case "gt":
      return leftNum > rightNum;

    case "gte":
      return leftNum >= rightNum;

    case "lt":
      return leftNum < rightNum;

    case "lte":
      return leftNum <= rightNum;

    default:
      return true;
  }
}

// =============================================================================
// Content Processing
// =============================================================================

/**
 * Process layout content (shared structure for layoutNode, forEach, if, else).
 */
function processLayoutContent(
  content: DiagramLayoutContent,
  dataNodes: readonly DiagramTreeNode[],
  context: LayoutContext,
  algorithmRegistry: ReturnType<typeof createAlgorithmRegistry>,
  namedNodes: Map<string, LayoutNode>
): LayoutResult {
  const allResults: LayoutNode[] = [];
  const allBounds: LayoutBounds[] = [];

  // Process forEach elements
  if (content.forEach) {
    for (const forEach of content.forEach) {
      const result = processForEachElement(
        forEach,
        dataNodes,
        context,
        algorithmRegistry,
        namedNodes
      );
      allResults.push(...result.nodes);
      if (result.nodes.length > 0) {
        allBounds.push(result.bounds);
      }
    }
  }

  // Process choose elements
  if (content.choose) {
    for (const choose of content.choose) {
      const result = processChooseElement(
        choose,
        dataNodes,
        context,
        algorithmRegistry,
        namedNodes
      );
      allResults.push(...result.nodes);
      if (result.nodes.length > 0) {
        allBounds.push(result.bounds);
      }
    }
  }

  // Process child layoutNodes
  if (content.children) {
    for (const child of content.children) {
      const result = processLayoutNode(
        child,
        dataNodes,
        context,
        algorithmRegistry,
        namedNodes
      );
      allResults.push(...result.nodes);
      if (result.nodes.length > 0) {
        allBounds.push(result.bounds);
      }
    }
  }

  // Apply algorithm if no other content and we have data nodes
  if (allResults.length === 0 && content.algorithm && dataNodes.length > 0) {
    const result = applyAlgorithm(
      content.algorithm,
      dataNodes,
      context,
      algorithmRegistry
    );
    allResults.push(...result.nodes);
    allBounds.push(result.bounds);
  }

  return {
    nodes: allResults,
    bounds: allBounds.length > 0 ? mergeBounds(...allBounds) : { x: 0, y: 0, width: 0, height: 0 },
  };
}

// =============================================================================
// Algorithm Application
// =============================================================================

/**
 * Apply a layout algorithm to data nodes.
 */
function applyAlgorithm(
  algorithm: DiagramAlgorithm,
  dataNodes: readonly DiagramTreeNode[],
  context: LayoutContext,
  algorithmRegistry: ReturnType<typeof createAlgorithmRegistry>
): LayoutResult {
  // Get algorithm function
  const algorithmFn = getLayoutAlgorithm(algorithmRegistry, algorithm.type);

  // Create context with algorithm params
  const paramMap = new Map<string, string | number | boolean>();
  if (algorithm.params) {
    for (const param of algorithm.params) {
      if (param.type && param.value !== undefined) {
        paramMap.set(param.type, param.value);
      }
    }
  }

  const algorithmContext: LayoutContext = {
    ...context,
    params: paramMap,
  };

  // Execute algorithm
  return algorithmFn(dataNodes, algorithmContext);
}

// =============================================================================
// Axis Selection
// =============================================================================

/**
 * Select nodes based on axis types.
 *
 * @see ECMA-376 Part 1, Section 21.4.7.6 - ST_AxisType
 */
function selectNodesByAxis(
  currentNode: DiagramTreeNode,
  axes: readonly DiagramAxisType[] | undefined
): DiagramTreeNode[] {
  if (!axes || axes.length === 0) {
    // Default to children
    return [...currentNode.children];
  }

  const result: DiagramTreeNode[] = [];
  const seenIds = new Set<string>();

  for (const axis of axes) {
    const nodes = selectByAxis(currentNode, axis);
    for (const node of nodes) {
      if (!seenIds.has(node.id)) {
        seenIds.add(node.id);
        result.push(node);
      }
    }
  }

  return result;
}

/**
 * Select nodes by a single axis type.
 */
function selectByAxis(
  currentNode: DiagramTreeNode,
  axis: DiagramAxisType
): DiagramTreeNode[] {
  switch (axis) {
    case "self":
      return [currentNode];

    case "ch":
      return [...currentNode.children];

    case "des":
      return getDescendants(currentNode);

    case "desOrSelf":
      return getDescendantsOrSelf(currentNode);

    case "par":
      return currentNode.parent ? [currentNode.parent] : [];

    case "ancst":
      return getAncestors(currentNode);

    case "ancstOrSelf":
      return getAncestorsOrSelf(currentNode);

    case "root":
      return [getRoot(currentNode)];

    case "follow":
    case "followSib":
      return getFollowingSiblings(currentNode);

    case "preced":
    case "precedSib":
      return getPrecedingSiblings(currentNode);

    case "none":
      return [];

    default:
      return [];
  }
}

// =============================================================================
// Point Type Filtering
// =============================================================================

/**
 * Filter nodes by point types.
 *
 * @see ECMA-376 Part 1, Section 21.4.7.46 - ST_ElementType
 */
function filterByPointType(
  nodes: readonly DiagramTreeNode[],
  pointTypes: readonly DiagramElementType[]
): DiagramTreeNode[] {
  return nodes.filter((node) =>
    pointTypes.some((pt) => matchesPointType(node, pt))
  );
}

/**
 * Check if a node matches a point type.
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

// =============================================================================
// Iteration Parameters
// =============================================================================

/**
 * Apply iteration parameters (start, step, count).
 */
function applyIterationParams(
  nodes: readonly DiagramTreeNode[],
  start?: readonly number[],
  step?: readonly number[],
  count?: readonly number[]
): DiagramTreeNode[] {
  const startIndex = ((start?.[0] ?? 1) - 1); // Convert to 0-based
  const stepValue = step?.[0] ?? 1;
  const maxCount = count?.[0] ?? nodes.length;

  const result: DiagramTreeNode[] = [];
  let collected = 0;

  for (let i = startIndex; i < nodes.length && collected < maxCount; i += stepValue) {
    if (i >= 0) {
      result.push(nodes[i]);
      collected++;
    }
  }

  return result;
}

// =============================================================================
// Variable Processing
// =============================================================================

/**
 * Process variables from varLst.
 *
 * @see ECMA-376 Part 1, Section 21.4.2.16 - varLst
 */
function processVariables(
  varLst: { readonly variables: readonly { readonly name: string; readonly value?: string }[] } | undefined,
  context: LayoutContext
): ReadonlyMap<string, DiagramVariableValue> {
  const variables = new Map<string, DiagramVariableValue>(context.variables);

  if (varLst?.variables) {
    for (const v of varLst.variables) {
      if (v.name && v.value !== undefined) {
        // Parse value (could be number, boolean, or string)
        const parsedValue = parseVariableValue(v.value);
        variables.set(v.name, parsedValue);
      }
    }
  }

  return variables;
}

/**
 * Parse a variable value string.
 */
function parseVariableValue(value: string): DiagramVariableValue {
  // Try boolean
  if (value === "true") {return true;}
  if (value === "false") {return false;}

  // Try number
  const num = parseFloat(value);
  if (!isNaN(num)) {return num;}

  // Return as string (will be cast to appropriate type when used)
  return value as DiagramVariableValue;
}
