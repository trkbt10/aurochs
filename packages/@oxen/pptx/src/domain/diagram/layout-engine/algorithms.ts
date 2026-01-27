/**
 * @file Layout algorithms implementation
 *
 * Implements various diagram layout algorithms according to ECMA-376.
 *
 * @see ECMA-376 Part 1, Section 21.4.2 (Algorithms)
 * @see ECMA-376 Part 1, Section 21.4.7 (Simple Types)
 */

import type { DiagramTreeNode } from "./tree-builder";
import type {
  LayoutAlgorithmFn,
  LayoutAlgorithmRegistry,
  LayoutContext,
  LayoutNode,
  LayoutBounds,
} from "./types";
import { createEmptyResult, getParam, getConstraint, mergeBounds } from "./types";
import type {
  DiagramAlgorithmType,
  DiagramLinearDirection,
  DiagramChildDirection,
  DiagramNodeHorizontalAlignment,
  DiagramNodeVerticalAlignment,
  DiagramFlowDirection,
  DiagramGrowDirection,
  DiagramRotationPath,
  DiagramCenterShapeMapping,
} from "../types";

// =============================================================================
// Helper Functions
// =============================================================================

// Implementation-defined fallback values when not specified by constraints or config
const FALLBACK_NODE_WIDTH = 100;
const FALLBACK_NODE_HEIGHT = 60;
const FALLBACK_SPACING = 10;

/**
 * Get node dimensions from constraints or defaults
 */
function getNodeDimensions(context: LayoutContext): { width: number; height: number } {
  const width = getConstraint(context, "w", context.defaultNodeWidth ?? FALLBACK_NODE_WIDTH);
  const height = getConstraint(context, "h", context.defaultNodeHeight ?? FALLBACK_NODE_HEIGHT);
  return { width, height };
}

/**
 * Get spacing from constraints or defaults
 */
function getSpacing(context: LayoutContext): number {
  return getConstraint(context, "sibSp", context.defaultSpacing ?? FALLBACK_SPACING);
}

/**
 * Align node horizontally within bounds
 */
function alignHorizontally(
  bounds: LayoutBounds,
  nodeWidth: number,
  alignment: DiagramNodeHorizontalAlignment
): number {
  switch (alignment) {
    case "l":
      return bounds.x;
    case "r":
      return bounds.x + bounds.width - nodeWidth;
    case "ctr":
    default:
      return bounds.x + (bounds.width - nodeWidth) / 2;
  }
}

/**
 * Align node vertically within bounds
 */
function alignVertically(
  bounds: LayoutBounds,
  nodeHeight: number,
  alignment: DiagramNodeVerticalAlignment
): number {
  switch (alignment) {
    case "t":
      return bounds.y;
    case "b":
      return bounds.y + bounds.height - nodeHeight;
    case "mid":
    default:
      return bounds.y + (bounds.height - nodeHeight) / 2;
  }
}

// =============================================================================
// Linear Layout (lin)
// =============================================================================

/**
 * Calculate total size for linear layout
 */
function calculateTotalPrimarySize(
  nodeCount: number,
  nodeSize: number,
  spacing: number
): number {
  return nodeCount * nodeSize + (nodeCount - 1) * spacing;
}

/**
 * Calculate starting position for vertical linear layout
 */
function calculateVerticalStartPosition(
  bounds: LayoutBounds,
  totalSize: number,
  alignment: DiagramNodeVerticalAlignment
): number {
  switch (alignment) {
    case "b":
      return bounds.y + bounds.height - totalSize;
    case "mid":
      return bounds.y + (bounds.height - totalSize) / 2;
    case "t":
    default:
      return bounds.y;
  }
}

/**
 * Calculate starting position for horizontal linear layout
 */
function calculateHorizontalStartPosition(
  bounds: LayoutBounds,
  totalSize: number,
  alignment: DiagramNodeHorizontalAlignment
): number {
  switch (alignment) {
    case "r":
      return bounds.x + bounds.width - totalSize;
    case "ctr":
      return bounds.x + (bounds.width - totalSize) / 2;
    case "l":
    default:
      return bounds.x;
  }
}

/**
 * Calculate starting position for linear layout
 */
function calculateLinearStartPosition(
  isVertical: boolean,
  bounds: LayoutBounds,
  totalSize: number,
  horzAlign: DiagramNodeHorizontalAlignment,
  vertAlign: DiagramNodeVerticalAlignment
): number {
  if (isVertical) {
    return calculateVerticalStartPosition(bounds, totalSize, vertAlign);
  }
  return calculateHorizontalStartPosition(bounds, totalSize, horzAlign);
}

/**
 * Build layout nodes for linear layout using reduce
 */
function buildLinearLayoutNodes(
  orderedNodes: readonly DiagramTreeNode[],
  startPosition: number,
  isVertical: boolean,
  bounds: LayoutBounds,
  nodeWidth: number,
  nodeHeight: number,
  nodeHorzAlign: DiagramNodeHorizontalAlignment,
  nodeVertAlign: DiagramNodeVerticalAlignment,
  spacing: number
): LayoutNode[] {
  return orderedNodes.reduce<{ nodes: LayoutNode[]; position: number }>(
    (acc, node) => {
      const x = isVertical ? alignHorizontally(bounds, nodeWidth, nodeHorzAlign) : acc.position;
      const y = isVertical ? acc.position : alignVertically(bounds, nodeHeight, nodeVertAlign);

      const layoutNode: LayoutNode = {
        treeNode: node,
        x,
        y,
        width: nodeWidth,
        height: nodeHeight,
        children: [],
      };

      return {
        nodes: [...acc.nodes, layoutNode],
        position: acc.position + (isVertical ? nodeHeight : nodeWidth) + spacing,
      };
    },
    { nodes: [], position: startPosition }
  ).nodes;
}

/**
 * Linear layout algorithm.
 * Arranges nodes in a horizontal or vertical line.
 *
 * Supported parameters (ECMA-376 21.4.2.17):
 * - linDir: Direction of linear flow (fromL, fromR, fromT, fromB)
 * - nodeHorzAlign: Horizontal alignment within cell (l, ctr, r)
 * - nodeVertAlign: Vertical alignment within cell (t, mid, b)
 * - fallback: Fallback algorithm when space is insufficient
 *
 * @see ECMA-376 Part 1, Section 21.4.2.17 (lin)
 */
export const linearLayout: LayoutAlgorithmFn = (nodes, context) => {
  if (nodes.length === 0) {
    return createEmptyResult();
  }

  // Get parameters
  const linDir = getParam<DiagramLinearDirection>(context, "linDir", "fromL");
  const nodeHorzAlign = getParam<DiagramNodeHorizontalAlignment>(context, "nodeHorzAlign", "ctr");
  const nodeVertAlign = getParam<DiagramNodeVerticalAlignment>(context, "nodeVertAlign", "mid");

  const isVertical = linDir === "fromT" || linDir === "fromB";
  const isReverse = linDir === "fromR" || linDir === "fromB";

  const { bounds } = context;

  // Get dimensions from constraints
  const { width: nodeWidth, height: nodeHeight } = getNodeDimensions(context);
  const spacing = getSpacing(context);

  const orderedNodes = isReverse ? [...nodes].reverse() : nodes;

  // Calculate total size needed
  const primaryNodeSize = isVertical ? nodeHeight : nodeWidth;
  const totalPrimarySize = calculateTotalPrimarySize(nodes.length, primaryNodeSize, spacing);

  // Calculate starting position based on alignment
  const startPosition = calculateLinearStartPosition(
    isVertical,
    bounds,
    totalPrimarySize,
    nodeHorzAlign,
    nodeVertAlign
  );

  const layoutNodes = buildLinearLayoutNodes(
    orderedNodes,
    startPosition,
    isVertical,
    bounds,
    nodeWidth,
    nodeHeight,
    nodeHorzAlign,
    nodeVertAlign,
    spacing
  );

  const resultBounds = mergeBounds(
    ...layoutNodes.map((n) => ({
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
    }))
  );

  return {
    nodes: layoutNodes,
    bounds: resultBounds,
  };
};

// =============================================================================
// Space Layout (sp)
// =============================================================================

/**
 * Space layout algorithm.
 * Single node layout, typically used for spacing elements.
 *
 * Supported parameters (ECMA-376 21.4.2.26):
 * - nodeHorzAlign: Horizontal alignment (l, ctr, r)
 * - nodeVertAlign: Vertical alignment (t, mid, b)
 *
 * @see ECMA-376 Part 1, Section 21.4.2.26 (sp)
 */
export const spaceLayout: LayoutAlgorithmFn = (nodes, context) => {
  if (nodes.length === 0) {
    return createEmptyResult();
  }

  const { bounds } = context;

  // Get alignment parameters
  const nodeHorzAlign = getParam<DiagramNodeHorizontalAlignment>(context, "nodeHorzAlign", "ctr");
  const nodeVertAlign = getParam<DiagramNodeVerticalAlignment>(context, "nodeVertAlign", "mid");

  // Get dimensions from constraints
  const { width: nodeWidth, height: nodeHeight } = getNodeDimensions(context);

  // Space layout creates a single positioned element
  const node = nodes[0];
  const x = alignHorizontally(bounds, nodeWidth, nodeHorzAlign);
  const y = alignVertically(bounds, nodeHeight, nodeVertAlign);

  const layoutNode: LayoutNode = {
    treeNode: node,
    x,
    y,
    width: nodeWidth,
    height: nodeHeight,
    children: [],
  };

  return {
    nodes: [layoutNode],
    bounds: {
      x: layoutNode.x,
      y: layoutNode.y,
      width: layoutNode.width,
      height: layoutNode.height,
    },
  };
};

// =============================================================================
// Hierarchy Child Layout (hierChild)
// =============================================================================

/**
 * Calculate child bounds for hierarchy layout
 */
function calculateChildBounds(
  bounds: LayoutBounds,
  isVertical: boolean,
  currentPosition: number,
  nodeWidth: number,
  nodeHeight: number,
  spacing: number
): LayoutBounds {
  return {
    x: isVertical ? bounds.x + nodeWidth + spacing : bounds.x,
    y: isVertical ? currentPosition : bounds.y + nodeHeight + spacing,
    width: bounds.width - nodeWidth - spacing,
    height: bounds.height - nodeHeight - spacing,
  };
}

/**
 * Calculate total height of child results
 */
function calculateChildTotalHeight(childResults: readonly LayoutNode[], spacing: number): number {
  if (childResults.length === 0) {
    return 0;
  }
  return childResults.reduce((sum, c) => sum + c.height + spacing, -spacing);
}

/**
 * Calculate node position for hierarchy layout
 */
function calculateHierNodePosition(
  bounds: LayoutBounds,
  isVertical: boolean,
  currentPosition: number,
  nodeWidth: number,
  nodeHeight: number,
  nodeHorzAlign: DiagramNodeHorizontalAlignment,
  nodeVertAlign: DiagramNodeVerticalAlignment,
  childResults: readonly LayoutNode[],
  childTotalHeight: number
): { x: number; y: number } {
  if (isVertical) {
    const x = alignHorizontally(bounds, nodeWidth, nodeHorzAlign);
    const y = calculateVerticalChildOffset(childResults.length, currentPosition, childTotalHeight, nodeHeight);
    return { x, y };
  }
  return {
    x: bounds.x,
    y: alignVertically(bounds, nodeHeight, nodeVertAlign),
  };
}

function calculateVerticalChildOffset(
  childCount: number,
  currentPosition: number,
  childTotalHeight: number,
  nodeHeight: number
): number {
  if (childCount > 0) {
    return currentPosition + (childTotalHeight - nodeHeight) / 2;
  }
  return currentPosition;
}

function getChildResults(
  children: readonly DiagramTreeNode[],
  childContext: LayoutContext,
  childHorizontal: boolean,
  nodeWidth: number,
  nodeHeight: number,
  spacing: number
): LayoutNode[] {
  if (children.length === 0) {
    return [];
  }
  return buildChildrenHierarchy(children, childContext, childHorizontal, nodeWidth, nodeHeight, spacing);
}

/**
 * Build hierarchy layout nodes using reduce
 */
function buildHierarchyLayoutNodes(
  nodes: readonly DiagramTreeNode[],
  context: LayoutContext,
  isVertical: boolean,
  childHorizontal: boolean,
  bounds: LayoutBounds,
  nodeWidth: number,
  nodeHeight: number,
  nodeHorzAlign: DiagramNodeHorizontalAlignment,
  nodeVertAlign: DiagramNodeVerticalAlignment,
  spacing: number
): LayoutNode[] {
  const startPosition = isVertical ? bounds.y : bounds.x;

  return nodes.reduce<{ nodes: LayoutNode[]; position: number }>(
    (acc, node) => {
      const childBounds = calculateChildBounds(
        bounds,
        isVertical,
        acc.position,
        nodeWidth,
        nodeHeight,
        spacing
      );

      const childContext: LayoutContext = { ...context, bounds: childBounds };

      const childResults = getChildResults(
        node.children,
        childContext,
        childHorizontal,
        nodeWidth,
        nodeHeight,
        spacing
      );

      const childTotalHeight = calculateChildTotalHeight(childResults, spacing);

      const { x: nodeX, y: nodeY } = calculateHierNodePosition(
        bounds,
        isVertical,
        acc.position,
        nodeWidth,
        nodeHeight,
        nodeHorzAlign,
        nodeVertAlign,
        childResults,
        childTotalHeight
      );

      const layoutNode: LayoutNode = {
        treeNode: node,
        x: nodeX,
        y: nodeY,
        width: nodeWidth,
        height: nodeHeight,
        children: childResults,
      };

      const advanceAmount = Math.max(nodeHeight + spacing, childTotalHeight + spacing);
      const nextPosition = isVertical ? acc.position + advanceAmount : acc.position;

      return {
        nodes: [...acc.nodes, layoutNode],
        position: nextPosition,
      };
    },
    { nodes: [], position: startPosition }
  ).nodes;
}

/**
 * Hierarchy child layout algorithm.
 * Arranges children in a hierarchical tree structure.
 *
 * Supported parameters (ECMA-376 21.4.2.13):
 * - linDir: Direction of linear flow (fromL, fromR, fromT, fromB)
 * - chDir: Child direction (horz, vert)
 * - chAlign: Child alignment (l, ctr, r, t, mid, b)
 * - secChAlign: Secondary child alignment
 * - secLinDir: Secondary linear direction
 * - nodeHorzAlign: Horizontal alignment (l, ctr, r)
 * - nodeVertAlign: Vertical alignment (t, mid, b)
 *
 * @see ECMA-376 Part 1, Section 21.4.2.13 (hierChild)
 */
export const hierChildLayout: LayoutAlgorithmFn = (nodes, context) => {
  if (nodes.length === 0) {
    return createEmptyResult();
  }

  const linDir = getParam<DiagramLinearDirection>(context, "linDir", "fromT");
  const chDir = getParam<DiagramChildDirection>(context, "chDir", "horz");
  const nodeHorzAlign = getParam<DiagramNodeHorizontalAlignment>(context, "nodeHorzAlign", "l");
  const nodeVertAlign = getParam<DiagramNodeVerticalAlignment>(context, "nodeVertAlign", "t");

  const { bounds } = context;

  // Get dimensions from constraints
  const { width: nodeWidth, height: nodeHeight } = getNodeDimensions(context);
  const spacing = getSpacing(context);

  const isVertical = linDir === "fromT" || linDir === "fromB";
  const childHorizontal = chDir === "horz";

  const layoutNodes = buildHierarchyLayoutNodes(
    nodes,
    context,
    isVertical,
    childHorizontal,
    bounds,
    nodeWidth,
    nodeHeight,
    nodeHorzAlign,
    nodeVertAlign,
    spacing
  );

  const allBounds = layoutNodes.flatMap((n) => [
    { x: n.x, y: n.y, width: n.width, height: n.height },
    ...flattenChildBounds(n.children),
  ]);

  return {
    nodes: layoutNodes,
    bounds: mergeBounds(...allBounds),
  };
};

/**
 * Build children layout nodes for hierarchy using reduce
 */
function buildChildrenHierarchy(
  children: readonly DiagramTreeNode[],
  context: LayoutContext,
  horizontal: boolean,
  nodeWidth: number,
  nodeHeight: number,
  spacing: number
): LayoutNode[] {
  const { bounds } = context;
  const startPos = horizontal ? bounds.x : bounds.y;
  const step = (horizontal ? nodeWidth : nodeHeight) + spacing;

  return children.map((child, index) => ({
    treeNode: child,
    x: horizontal ? startPos + index * step : bounds.x,
    y: horizontal ? bounds.y : startPos + index * step,
    width: nodeWidth,
    height: nodeHeight,
    children: [],
  }));
}

function flattenChildBounds(children: readonly LayoutNode[]): LayoutBounds[] {
  return children.flatMap((child) => [
    { x: child.x, y: child.y, width: child.width, height: child.height },
    ...flattenChildBounds(child.children),
  ]);
}

// =============================================================================
// Cycle Layout (cycle)
// =============================================================================

/**
 * Build cycle layout nodes using map
 */
function buildCycleLayoutNodes(
  cycleNodes: readonly DiagramTreeNode[],
  centerX: number,
  centerY: number,
  radius: number,
  nodeWidth: number,
  nodeHeight: number,
  startAngle: number,
  angleStep: number,
  rotPath: DiagramRotationPath
): LayoutNode[] {
  return cycleNodes.map((node, index) => {
    const currentAngle = startAngle + index * angleStep;
    const x = centerX + radius * Math.cos(currentAngle) - nodeWidth / 2;
    const y = centerY + radius * Math.sin(currentAngle) - nodeHeight / 2;
    const rotation = calculateCycleRotation(rotPath, currentAngle);

    return {
      treeNode: node,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      rotation,
      children: [],
    };
  });
}

function calculateCycleRotation(rotPath: DiagramRotationPath, currentAngle: number): number | undefined {
  if (rotPath === "alongPath") {
    return (currentAngle + Math.PI / 2) * (180 / Math.PI);
  }
  return undefined;
}

function getCenterNodes(
  hasCenterNode: boolean,
  nodes: readonly DiagramTreeNode[],
  centerX: number,
  centerY: number,
  nodeWidth: number,
  nodeHeight: number
): LayoutNode[] {
  if (!hasCenterNode) {
    return [];
  }
  return [createCenterNode(nodes[0], centerX, centerY, nodeWidth, nodeHeight)];
}

/**
 * Create center node for cycle layout
 */
function createCenterNode(
  treeNode: DiagramTreeNode,
  centerX: number,
  centerY: number,
  nodeWidth: number,
  nodeHeight: number
): LayoutNode {
  return {
    treeNode,
    x: centerX - nodeWidth / 2,
    y: centerY - nodeHeight / 2,
    width: nodeWidth,
    height: nodeHeight,
    children: [],
  };
}

/**
 * Cycle layout algorithm.
 * Arranges nodes in a circular pattern.
 *
 * Supported parameters (ECMA-376 21.4.2.6):
 * - stAng: Start angle in degrees (default 0)
 * - spanAng: Span angle in degrees (default 360)
 * - ctrShpMap: Center shape mapping (none, fNode)
 * - rotPath: Rotation path (none, alongPath)
 *
 * @see ECMA-376 Part 1, Section 21.4.2.6 (cycle)
 */
export const cycleLayout: LayoutAlgorithmFn = (nodes, context) => {
  if (nodes.length === 0) {
    return createEmptyResult();
  }

  const { bounds } = context;

  // Get parameters
  const stAng = getParam<number>(context, "stAng", 0);
  const spanAng = getParam<number>(context, "spanAng", 360);
  const ctrShpMap = getParam<DiagramCenterShapeMapping>(context, "ctrShpMap", "none");
  const rotPath = getParam<DiagramRotationPath>(context, "rotPath", "none");

  // Get dimensions from constraints
  const { width: nodeWidth, height: nodeHeight } = getNodeDimensions(context);

  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  // Calculate radius, accounting for node size
  const diameter = getConstraint(context, "diam", Math.min(bounds.width, bounds.height));
  const radius = diameter / 2 - Math.max(nodeWidth, nodeHeight) / 2;

  // Handle center shape if needed
  const hasCenterNode = ctrShpMap === "fNode" && nodes.length > 0;
  const centerNodes = getCenterNodes(hasCenterNode, nodes, centerX, centerY, nodeWidth, nodeHeight);
  const cycleNodes = hasCenterNode ? nodes.slice(1) : nodes;

  // Calculate angle step
  const nodeCount = cycleNodes.length;
  if (nodeCount === 0) {
    return {
      nodes: centerNodes,
      bounds: mergeBounds(
        ...centerNodes.map((n) => ({
          x: n.x,
          y: n.y,
          width: n.width,
          height: n.height,
        }))
      ),
    };
  }

  const angleStep = (spanAng / nodeCount) * (Math.PI / 180);
  const startAngle = (stAng - 90) * (Math.PI / 180); // Start from top

  const cycleLayoutNodes = buildCycleLayoutNodes(
    cycleNodes,
    centerX,
    centerY,
    radius,
    nodeWidth,
    nodeHeight,
    startAngle,
    angleStep,
    rotPath
  );

  const allNodes = [...centerNodes, ...cycleLayoutNodes];

  return {
    nodes: allNodes,
    bounds: mergeBounds(
      ...allNodes.map((n) => ({
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
      }))
    ),
  };
};

// =============================================================================
// Snake Layout (snake)
// =============================================================================

type SnakeLayoutConfig = {
  readonly bounds: LayoutBounds;
  readonly nodeWidth: number;
  readonly nodeHeight: number;
  readonly spacing: number;
  readonly maxPerRow: number;
  readonly isRowFlow: boolean;
  readonly startFromRight: boolean;
  readonly startFromBottom: boolean;
  readonly reverseDirection: boolean;
};

/**
 * Calculate snake node position
 */
function shouldReverseSnakeRow(
  reverseDirection: boolean,
  row: number,
  startFromRight: boolean
): boolean {
  if (reverseDirection) {
    return row % 2 === 0 ? startFromRight : !startFromRight;
  }
  return startFromRight;
}

function calculateSnakeRowY(
  bounds: LayoutBounds,
  row: number,
  nodeHeight: number,
  spacing: number,
  startFromBottom: boolean
): number {
  if (startFromBottom) {
    return bounds.y + bounds.height - (row + 1) * (nodeHeight + spacing) + spacing;
  }
  return bounds.y + row * (nodeHeight + spacing);
}

function calculateSnakeColX(
  bounds: LayoutBounds,
  row: number,
  nodeWidth: number,
  spacing: number,
  startFromRight: boolean
): number {
  if (startFromRight) {
    return bounds.x + bounds.width - (row + 1) * (nodeWidth + spacing) + spacing;
  }
  return bounds.x + row * (nodeWidth + spacing);
}

function calculateNodesPerRow(
  isRowFlow: boolean,
  bounds: LayoutBounds,
  nodeWidth: number,
  nodeHeight: number,
  spacing: number
): number {
  if (isRowFlow) {
    return Math.floor((bounds.width + spacing) / (nodeWidth + spacing));
  }
  return Math.floor((bounds.height + spacing) / (nodeHeight + spacing));
}

function calculateSnakePosition(
  index: number,
  config: SnakeLayoutConfig
): { x: number; y: number } {
  const { bounds, nodeWidth, nodeHeight, spacing, maxPerRow, isRowFlow, startFromRight, startFromBottom, reverseDirection } = config;

  const row = Math.floor(index / maxPerRow);
  const col = index % maxPerRow;

  // Determine if this row should be reversed
  const shouldReverse = shouldReverseSnakeRow(reverseDirection, row, startFromRight);
  const rawActualCol = shouldReverse ? (maxPerRow - 1 - col) : col;
  const actualCol = Math.max(0, rawActualCol);

  if (isRowFlow) {
    const x = bounds.x + actualCol * (nodeWidth + spacing);
    const y = calculateSnakeRowY(bounds, row, nodeHeight, spacing, startFromBottom);
    return { x, y };
  }

  const x = calculateSnakeColX(bounds, row, nodeWidth, spacing, startFromRight);
  const y = bounds.y + actualCol * (nodeHeight + spacing);
  return { x, y };
}

/**
 * Build snake layout nodes using map
 */
function buildSnakeLayoutNodes(
  nodes: readonly DiagramTreeNode[],
  config: SnakeLayoutConfig
): LayoutNode[] {
  return nodes.map((node, index) => {
    const { x, y } = calculateSnakePosition(index, config);
    return {
      treeNode: node,
      x,
      y,
      width: config.nodeWidth,
      height: config.nodeHeight,
      children: [],
    };
  });
}

/**
 * Snake layout algorithm.
 * Arranges nodes in a snake/zigzag pattern.
 *
 * Supported parameters (ECMA-376 21.4.2.25):
 * - flowDir: Flow direction (row, col)
 * - grDir: Grow direction (tL, tR, bL, bR, etc.)
 * - bkpt: Breakpoint type (endCnv, bal, fixed)
 * - contDir: Continue direction (sameDir, revDir)
 * - off: Offset amount
 *
 * @see ECMA-376 Part 1, Section 21.4.2.25 (snake)
 */
export const snakeLayout: LayoutAlgorithmFn = (nodes, context) => {
  if (nodes.length === 0) {
    return createEmptyResult();
  }

  const { bounds } = context;

  // Get parameters
  const flowDir = getParam<DiagramFlowDirection>(context, "flowDir", "row");
  const grDir = getParam<DiagramGrowDirection>(context, "grDir", "tL");
  const contDir = getParam<string>(context, "contDir", "revDir");

  // Get dimensions from constraints
  const { width: nodeWidth, height: nodeHeight } = getNodeDimensions(context);
  const spacing = getSpacing(context);

  const isRowFlow = flowDir === "row";
  const nodesPerRow = calculateNodesPerRow(isRowFlow, bounds, nodeWidth, nodeHeight, spacing);
  const maxPerRow = Math.max(1, nodesPerRow);

  // Determine starting corner based on grDir
  const startFromRight = grDir === "tR" || grDir === "bR";
  const startFromBottom = grDir === "bL" || grDir === "bR";

  const config: SnakeLayoutConfig = {
    bounds,
    nodeWidth,
    nodeHeight,
    spacing,
    maxPerRow,
    isRowFlow,
    startFromRight,
    startFromBottom,
    reverseDirection: contDir === "revDir",
  };

  const layoutNodes = buildSnakeLayoutNodes(nodes, config);

  return {
    nodes: layoutNodes,
    bounds: mergeBounds(
      ...layoutNodes.map((n) => ({
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
      }))
    ),
  };
};

// =============================================================================
// Pyramid Layout (pyra)
// =============================================================================

function calculatePyramidWidthStep(nodeCount: number, boundsWidth: number, baseWidth: number): number {
  if (nodeCount <= 1) {
    return 0;
  }
  return (boundsWidth - baseWidth) / (nodeCount - 1);
}

/**
 * Pyramid layout algorithm.
 * Arranges nodes in a pyramid/triangle pattern.
 *
 * Supported parameters (ECMA-376 21.4.2.20):
 * - linDir: Direction of linear flow (fromT, fromB)
 * - pyraAcctPos: Account position (aft, bef)
 * - pyraAcctTxMar: Account text margin
 * - pyraAcctBkgdNode: Account background node
 * - pyraAcctRatio: Account ratio
 * - pyraLvlNode: Level node name
 *
 * @see ECMA-376 Part 1, Section 21.4.2.20 (pyra)
 */
export const pyramidLayout: LayoutAlgorithmFn = (nodes, context) => {
  if (nodes.length === 0) {
    return createEmptyResult();
  }

  const { bounds } = context;

  // Get parameters
  const linDir = getParam<DiagramLinearDirection>(context, "linDir", "fromT");
  const isFromTop = linDir === "fromT";

  // Get dimensions from constraints
  const { width: baseWidth, height: nodeHeight } = getNodeDimensions(context);
  const spacing = getSpacing(context);

  const centerX = bounds.x + bounds.width / 2;
  const layoutNodes: LayoutNode[] = [];

  // Calculate pyramid levels
  // Each level has progressively more/less width depending on direction
  const widthStep = calculatePyramidWidthStep(nodes.length, bounds.width, baseWidth);

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[isFromTop ? i : nodes.length - 1 - i];
    const levelIndex = isFromTop ? i : nodes.length - 1 - i;

    // For pyramid from top: narrow at top, wide at bottom
    // For pyramid from bottom: wide at top, narrow at bottom
    const levelWidth = baseWidth + widthStep * levelIndex;

    const x = centerX - levelWidth / 2;
    const y = bounds.y + i * (nodeHeight + spacing);

    const layoutNode: LayoutNode = {
      treeNode: node,
      x,
      y,
      width: levelWidth,
      height: nodeHeight,
      children: [],
    };
    layoutNodes.push(layoutNode);
  }

  return {
    nodes: layoutNodes,
    bounds: mergeBounds(
      ...layoutNodes.map((n) => ({
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
      }))
    ),
  };
};

// =============================================================================
// Composite Layout (composite)
// =============================================================================

/**
 * Composite layout algorithm.
 * Container for other layout algorithms. Used to combine multiple layouts.
 *
 * Composite layouts position child layout nodes within a container.
 * Each child layout node has its own bounds and constraints.
 *
 * @see ECMA-376 Part 1, Section 21.4.2.5 (composite)
 */
export const compositeLayout: LayoutAlgorithmFn = (nodes, context) => {
  if (nodes.length === 0) {
    return createEmptyResult();
  }

  const { bounds } = context;

  // Get dimensions from constraints
  const { width: nodeWidth, height: nodeHeight } = getNodeDimensions(context);

  // Composite layout positions a single shape at the center
  // Child layouts are processed separately
  const layoutNodes: LayoutNode[] = [];

  for (const node of nodes) {
    const x = bounds.x + (bounds.width - nodeWidth) / 2;
    const y = bounds.y + (bounds.height - nodeHeight) / 2;

    const layoutNode: LayoutNode = {
      treeNode: node,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      children: [],
    };
    layoutNodes.push(layoutNode);
  }

  return {
    nodes: layoutNodes,
    bounds: mergeBounds(
      ...layoutNodes.map((n) => ({
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
      }))
    ),
  };
};

// =============================================================================
// Connector Layout (conn)
// =============================================================================

/**
 * Connector layout algorithm.
 * Creates connections between nodes.
 *
 * Connectors are typically lines or arrows that connect two shapes.
 * The layout calculates the path between source and destination.
 *
 * Supported parameters (ECMA-376 21.4.2.4):
 * - begPts: Beginning attachment points
 * - endPts: Ending attachment points
 * - connRout: Connection routing style
 * - srcNode: Source node name
 * - dstNode: Destination node name
 *
 * @see ECMA-376 Part 1, Section 21.4.2.4 (conn)
 */
export const connectorLayout: LayoutAlgorithmFn = (nodes, context) => {
  if (nodes.length === 0) {
    return createEmptyResult();
  }

  const { bounds } = context;

  // Get dimensions from constraints - connectors may have different sizing
  const connWidth = getConstraint(context, "connDist", 20);
  const { height: nodeHeight } = getNodeDimensions(context);

  // Position connectors - typically between nodes
  const layoutNodes: LayoutNode[] = [];

  for (const node of nodes) {
    const layoutNode: LayoutNode = {
      treeNode: node,
      x: bounds.x,
      y: bounds.y,
      width: connWidth,
      height: nodeHeight,
      children: [],
      // Mark as connector for special rendering
      isConnector: true,
    };
    layoutNodes.push(layoutNode);
  }

  if (layoutNodes.length === 0) {
    return createEmptyResult();
  }

  return {
    nodes: layoutNodes,
    bounds: mergeBounds(
      ...layoutNodes.map((n) => ({
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
      }))
    ),
  };
};

// =============================================================================
// Text Layout (tx)
// =============================================================================

/**
 * Text layout algorithm.
 * Layout for text content nodes.
 *
 * Supported parameters (ECMA-376 21.4.2.28):
 * - txAnchorHorz: Text anchor horizontal position
 * - txAnchorVert: Text anchor vertical position
 * - txAnchorHorzCh: Child text anchor horizontal
 * - txAnchorVertCh: Child text anchor vertical
 *
 * @see ECMA-376 Part 1, Section 21.4.2.28 (tx)
 */
export const textLayout: LayoutAlgorithmFn = (nodes, context) => {
  if (nodes.length === 0) {
    return createEmptyResult();
  }

  const { bounds } = context;

  // Get alignment parameters
  const nodeHorzAlign = getParam<DiagramNodeHorizontalAlignment>(context, "nodeHorzAlign", "ctr");
  const nodeVertAlign = getParam<DiagramNodeVerticalAlignment>(context, "nodeVertAlign", "mid");

  // Get dimensions from constraints
  const { width: nodeWidth, height: nodeHeight } = getNodeDimensions(context);

  // Position text node
  const node = nodes[0];
  const x = alignHorizontally(bounds, nodeWidth, nodeHorzAlign);
  const y = alignVertically(bounds, nodeHeight, nodeVertAlign);

  const layoutNode: LayoutNode = {
    treeNode: node,
    x,
    y,
    width: nodeWidth,
    height: nodeHeight,
    children: [],
  };

  return {
    nodes: [layoutNode],
    bounds: {
      x: layoutNode.x,
      y: layoutNode.y,
      width: layoutNode.width,
      height: layoutNode.height,
    },
  };
};

// =============================================================================
// Algorithm Registry
// =============================================================================

/**
 * Create the default algorithm registry
 */
export function createAlgorithmRegistry(): LayoutAlgorithmRegistry {
  const registry = new Map<DiagramAlgorithmType, LayoutAlgorithmFn>();

  registry.set("lin", linearLayout);
  registry.set("sp", spaceLayout);
  registry.set("hierChild", hierChildLayout);
  registry.set("hierRoot", hierChildLayout); // hierRoot uses same algorithm as hierChild
  registry.set("cycle", cycleLayout);
  registry.set("snake", snakeLayout);
  registry.set("pyra", pyramidLayout);
  registry.set("composite", compositeLayout);
  registry.set("conn", connectorLayout);
  registry.set("tx", textLayout);

  return registry;
}

/**
 * Get layout algorithm by type
 */
export function getLayoutAlgorithm(
  registry: LayoutAlgorithmRegistry,
  type: DiagramAlgorithmType | undefined
): LayoutAlgorithmFn {
  if (!type) {
    return linearLayout; // Default to linear
  }

  const algorithm = registry.get(type);
  if (!algorithm) {
    console.warn(`Unknown layout algorithm: ${type}, using linear`);
    return linearLayout;
  }

  return algorithm;
}
