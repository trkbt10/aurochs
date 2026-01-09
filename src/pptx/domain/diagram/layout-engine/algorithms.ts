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
  LayoutResult,
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

/**
 * Get node dimensions from constraints or defaults
 */
function getNodeDimensions(context: LayoutContext): { width: number; height: number } {
  const width = getConstraint(context, "w", context.defaultNodeWidth);
  const height = getConstraint(context, "h", context.defaultNodeHeight);
  return { width, height };
}

/**
 * Get spacing from constraints or defaults
 */
function getSpacing(context: LayoutContext): number {
  return getConstraint(context, "sibSp", context.defaultSpacing);
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
  const totalPrimarySize = isVertical
    ? nodes.length * nodeHeight + (nodes.length - 1) * spacing
    : nodes.length * nodeWidth + (nodes.length - 1) * spacing;

  // Calculate starting position based on alignment
  let currentPrimary: number;
  if (isVertical) {
    currentPrimary = alignVertically(
      { ...bounds, height: bounds.height - totalPrimarySize + nodeHeight },
      nodeHeight,
      nodeVertAlign === "t" ? "t" : nodeVertAlign === "b" ? "b" : "mid"
    );
    // Adjust for full layout
    if (nodeVertAlign === "mid") {
      currentPrimary = bounds.y + (bounds.height - totalPrimarySize) / 2;
    } else if (nodeVertAlign === "b") {
      currentPrimary = bounds.y + bounds.height - totalPrimarySize;
    } else {
      currentPrimary = bounds.y;
    }
  } else {
    if (nodeHorzAlign === "ctr") {
      currentPrimary = bounds.x + (bounds.width - totalPrimarySize) / 2;
    } else if (nodeHorzAlign === "r") {
      currentPrimary = bounds.x + bounds.width - totalPrimarySize;
    } else {
      currentPrimary = bounds.x;
    }
  }

  const layoutNodes: LayoutNode[] = [];

  for (const node of orderedNodes) {
    // Calculate secondary axis position based on alignment
    const x = isVertical
      ? alignHorizontally(bounds, nodeWidth, nodeHorzAlign)
      : currentPrimary;
    const y = isVertical
      ? currentPrimary
      : alignVertically(bounds, nodeHeight, nodeVertAlign);

    const layoutNode: LayoutNode = {
      treeNode: node,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      children: [],
    };
    layoutNodes.push(layoutNode);

    currentPrimary += (isVertical ? nodeHeight : nodeWidth) + spacing;
  }

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

  const layoutNodes: LayoutNode[] = [];
  let currentPosition = isVertical ? bounds.y : bounds.x;

  for (const node of nodes) {
    // Calculate children layout first
    const childBounds: LayoutBounds = {
      x: isVertical
        ? bounds.x + nodeWidth + spacing
        : bounds.x,
      y: isVertical
        ? currentPosition
        : bounds.y + nodeHeight + spacing,
      width: bounds.width - nodeWidth - spacing,
      height: bounds.height - nodeHeight - spacing,
    };

    const childContext: LayoutContext = {
      ...context,
      bounds: childBounds,
    };

    // Recursively layout children
    const childResults = node.children.length > 0
      ? layoutChildrenHierarchy(node.children, childContext, childHorizontal, nodeWidth, nodeHeight, spacing)
      : [];

    const childTotalHeight = childResults.length > 0
      ? childResults.reduce((sum, c) => sum + c.height + spacing, -spacing)
      : 0;

    // Calculate node position
    let nodeX = bounds.x;
    let nodeY = currentPosition;

    if (isVertical) {
      nodeX = alignHorizontally(bounds, nodeWidth, nodeHorzAlign);
      if (childResults.length > 0) {
        nodeY = currentPosition + (childTotalHeight - nodeHeight) / 2;
      }
    } else {
      nodeY = alignVertically(bounds, nodeHeight, nodeVertAlign);
    }

    const layoutNode: LayoutNode = {
      treeNode: node,
      x: nodeX,
      y: nodeY,
      width: nodeWidth,
      height: nodeHeight,
      children: childResults,
    };
    layoutNodes.push(layoutNode);

    const advanceAmount = Math.max(
      nodeHeight + spacing,
      childTotalHeight + spacing
    );
    currentPosition += isVertical ? advanceAmount : 0;
  }

  const allBounds = layoutNodes.flatMap((n) => [
    { x: n.x, y: n.y, width: n.width, height: n.height },
    ...flattenChildBounds(n.children),
  ]);

  return {
    nodes: layoutNodes,
    bounds: mergeBounds(...allBounds),
  };
};

function layoutChildrenHierarchy(
  children: readonly DiagramTreeNode[],
  context: LayoutContext,
  horizontal: boolean,
  nodeWidth: number,
  nodeHeight: number,
  spacing: number
): LayoutNode[] {
  const { bounds } = context;
  const results: LayoutNode[] = [];

  let currentPos = horizontal ? bounds.x : bounds.y;

  for (const child of children) {
    const childNode: LayoutNode = {
      treeNode: child,
      x: horizontal ? currentPos : bounds.x,
      y: horizontal ? bounds.y : currentPos,
      width: nodeWidth,
      height: nodeHeight,
      children: [],
    };
    results.push(childNode);

    currentPos += (horizontal ? nodeWidth : nodeHeight) + spacing;
  }

  return results;
}

function flattenChildBounds(children: readonly LayoutNode[]): LayoutBounds[] {
  const result: LayoutBounds[] = [];
  for (const child of children) {
    result.push({ x: child.x, y: child.y, width: child.width, height: child.height });
    result.push(...flattenChildBounds(child.children));
  }
  return result;
}

// =============================================================================
// Hierarchy Root Layout (hierRoot)
// =============================================================================

/**
 * Hierarchy root layout algorithm.
 * Root container for hierarchical layouts.
 *
 * @see ECMA-376 Part 1, Section 21.4.2.14 (hierRoot)
 */
export const hierRootLayout: LayoutAlgorithmFn = (nodes, context) => {
  // hierRoot typically wraps hierChild
  return hierChildLayout(nodes, context);
};

// =============================================================================
// Cycle Layout (cycle)
// =============================================================================

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

  const layoutNodes: LayoutNode[] = [];

  // Handle center shape if needed
  let cycleNodes = nodes;
  if (ctrShpMap === "fNode" && nodes.length > 0) {
    // First node goes in center
    const centerNode: LayoutNode = {
      treeNode: nodes[0],
      x: centerX - nodeWidth / 2,
      y: centerY - nodeHeight / 2,
      width: nodeWidth,
      height: nodeHeight,
      children: [],
    };
    layoutNodes.push(centerNode);
    cycleNodes = nodes.slice(1);
  }

  // Calculate angle step
  const nodeCount = cycleNodes.length;
  if (nodeCount === 0) {
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
  }

  const angleStep = (spanAng / nodeCount) * (Math.PI / 180);
  let currentAngle = (stAng - 90) * (Math.PI / 180); // Start from top

  for (const node of cycleNodes) {
    const x = centerX + radius * Math.cos(currentAngle) - nodeWidth / 2;
    const y = centerY + radius * Math.sin(currentAngle) - nodeHeight / 2;

    // Calculate rotation if following path
    const rotation = rotPath === "alongPath"
      ? (currentAngle + Math.PI / 2) * (180 / Math.PI)
      : undefined;

    const layoutNode: LayoutNode = {
      treeNode: node,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      rotation,
      children: [],
    };
    layoutNodes.push(layoutNode);

    currentAngle += angleStep;
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
// Snake Layout (snake)
// =============================================================================

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
  const nodesPerRow = isRowFlow
    ? Math.floor((bounds.width + spacing) / (nodeWidth + spacing))
    : Math.floor((bounds.height + spacing) / (nodeHeight + spacing));

  const maxPerRow = Math.max(1, nodesPerRow);

  // Determine starting corner based on grDir
  const startFromRight = grDir === "tR" || grDir === "bR";
  const startFromBottom = grDir === "bL" || grDir === "bR";

  const layoutNodes: LayoutNode[] = [];
  let row = 0;
  let col = 0;
  let reverseRow = startFromRight;

  for (const node of nodes) {
    let actualCol = reverseRow ? (maxPerRow - 1 - col) : col;
    if (actualCol < 0) actualCol = 0;

    let x: number;
    let y: number;

    if (isRowFlow) {
      x = bounds.x + actualCol * (nodeWidth + spacing);
      y = startFromBottom
        ? bounds.y + bounds.height - (row + 1) * (nodeHeight + spacing) + spacing
        : bounds.y + row * (nodeHeight + spacing);
    } else {
      x = startFromRight
        ? bounds.x + bounds.width - (row + 1) * (nodeWidth + spacing) + spacing
        : bounds.x + row * (nodeWidth + spacing);
      y = bounds.y + actualCol * (nodeHeight + spacing);
    }

    const layoutNode: LayoutNode = {
      treeNode: node,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      children: [],
    };
    layoutNodes.push(layoutNode);

    col++;
    if (col >= maxPerRow) {
      col = 0;
      row++;
      // Snake pattern alternates direction if contDir is revDir
      if (contDir === "revDir") {
        reverseRow = !reverseRow;
      }
    }
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
// Pyramid Layout (pyra)
// =============================================================================

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
  const widthStep = nodes.length > 1
    ? (bounds.width - baseWidth) / (nodes.length - 1)
    : 0;

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
  registry.set("hierRoot", hierRootLayout);
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
