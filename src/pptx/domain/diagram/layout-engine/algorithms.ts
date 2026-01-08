/**
 * @file Layout algorithms implementation
 *
 * Implements various diagram layout algorithms according to ECMA-376.
 *
 * @see ECMA-376 Part 1, Section 21.4.2 (Algorithms)
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
import { createEmptyResult, getParam, mergeBounds } from "./types";
import type { DiagramAlgorithmType, DiagramLinearDirection } from "../types";

// =============================================================================
// Linear Layout (lin)
// =============================================================================

/**
 * Linear layout algorithm.
 * Arranges nodes in a horizontal or vertical line.
 *
 * @see ECMA-376 Part 1, Section 21.4.2.17 (lin)
 */
export const linearLayout: LayoutAlgorithmFn = (nodes, context) => {
  if (nodes.length === 0) {
    return createEmptyResult();
  }

  const linDir = getParam<DiagramLinearDirection>(context, "linDir", "fromL");
  const isVertical = linDir === "fromT" || linDir === "fromB";
  const isReverse = linDir === "fromR" || linDir === "fromB";

  const { bounds, defaultNodeWidth, defaultNodeHeight, defaultSpacing } = context;
  const nodeWidth = defaultNodeWidth;
  const nodeHeight = defaultNodeHeight;

  const orderedNodes = isReverse ? [...nodes].reverse() : nodes;

  let currentX = bounds.x;
  let currentY = bounds.y;

  const layoutNodes: LayoutNode[] = [];

  for (const node of orderedNodes) {
    const layoutNode: LayoutNode = {
      treeNode: node,
      x: currentX,
      y: currentY,
      width: nodeWidth,
      height: nodeHeight,
      children: [],
    };
    layoutNodes.push(layoutNode);

    if (isVertical) {
      currentY += nodeHeight + defaultSpacing;
    } else {
      currentX += nodeWidth + defaultSpacing;
    }
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
 * @see ECMA-376 Part 1, Section 21.4.2.26 (sp)
 */
export const spaceLayout: LayoutAlgorithmFn = (nodes, context) => {
  if (nodes.length === 0) {
    return createEmptyResult();
  }

  const { bounds, defaultNodeWidth, defaultNodeHeight } = context;

  // Space layout typically creates a single positioned element
  const node = nodes[0];
  const layoutNode: LayoutNode = {
    treeNode: node,
    x: bounds.x,
    y: bounds.y,
    width: defaultNodeWidth,
    height: defaultNodeHeight,
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
 * @see ECMA-376 Part 1, Section 21.4.2.13 (hierChild)
 */
export const hierChildLayout: LayoutAlgorithmFn = (nodes, context) => {
  if (nodes.length === 0) {
    return createEmptyResult();
  }

  const linDir = getParam(context, "linDir", "fromT");
  const chDir = getParam(context, "chDir", "horz");
  const { bounds, defaultNodeWidth, defaultNodeHeight, defaultSpacing } = context;

  const isVertical = linDir === "fromT" || linDir === "fromB";
  const childHorizontal = chDir === "horz";

  const layoutNodes: LayoutNode[] = [];
  let currentPosition = isVertical ? bounds.y : bounds.x;

  for (const node of nodes) {
    // Calculate children layout first
    const childBounds: LayoutBounds = {
      x: isVertical
        ? bounds.x + defaultNodeWidth + defaultSpacing
        : bounds.x,
      y: isVertical
        ? currentPosition
        : bounds.y + defaultNodeHeight + defaultSpacing,
      width: bounds.width - defaultNodeWidth - defaultSpacing,
      height: bounds.height - defaultNodeHeight - defaultSpacing,
    };

    const childContext: LayoutContext = {
      ...context,
      bounds: childBounds,
    };

    // Recursively layout children
    const childResults = node.children.length > 0
      ? layoutChildrenHierarchy(node.children, childContext, childHorizontal)
      : [];

    const childTotalHeight = childResults.length > 0
      ? childResults.reduce((sum, c) => sum + c.height + defaultSpacing, -defaultSpacing)
      : 0;

    const nodeY = childResults.length > 0
      ? currentPosition + (childTotalHeight - defaultNodeHeight) / 2
      : currentPosition;

    const layoutNode: LayoutNode = {
      treeNode: node,
      x: bounds.x,
      y: isVertical ? nodeY : bounds.y,
      width: defaultNodeWidth,
      height: defaultNodeHeight,
      children: childResults,
    };
    layoutNodes.push(layoutNode);

    const advanceAmount = Math.max(
      defaultNodeHeight + defaultSpacing,
      childTotalHeight + defaultSpacing
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
  horizontal: boolean
): LayoutNode[] {
  const { bounds, defaultNodeWidth, defaultNodeHeight, defaultSpacing } = context;
  const results: LayoutNode[] = [];

  let currentPos = horizontal ? bounds.x : bounds.y;

  for (const child of children) {
    const childNode: LayoutNode = {
      treeNode: child,
      x: horizontal ? currentPos : bounds.x,
      y: horizontal ? bounds.y : currentPos,
      width: defaultNodeWidth,
      height: defaultNodeHeight,
      children: [],
    };
    results.push(childNode);

    currentPos += (horizontal ? defaultNodeWidth : defaultNodeHeight) + defaultSpacing;
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
 * @see ECMA-376 Part 1, Section 21.4.2.6 (cycle)
 */
export const cycleLayout: LayoutAlgorithmFn = (nodes, context) => {
  if (nodes.length === 0) {
    return createEmptyResult();
  }

  const { bounds, defaultNodeWidth, defaultNodeHeight } = context;
  const stAng = getParam(context, "stAng", 0) as number;
  const spanAng = getParam(context, "spanAng", 360) as number;

  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const radius = Math.min(bounds.width, bounds.height) / 2 - Math.max(defaultNodeWidth, defaultNodeHeight) / 2;

  const layoutNodes: LayoutNode[] = [];
  const angleStep = (spanAng / nodes.length) * (Math.PI / 180);
  let currentAngle = (stAng - 90) * (Math.PI / 180); // Start from top

  for (const node of nodes) {
    const x = centerX + radius * Math.cos(currentAngle) - defaultNodeWidth / 2;
    const y = centerY + radius * Math.sin(currentAngle) - defaultNodeHeight / 2;

    const layoutNode: LayoutNode = {
      treeNode: node,
      x,
      y,
      width: defaultNodeWidth,
      height: defaultNodeHeight,
      rotation: (currentAngle + Math.PI / 2) * (180 / Math.PI),
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
 * @see ECMA-376 Part 1, Section 21.4.2.25 (snake)
 */
export const snakeLayout: LayoutAlgorithmFn = (nodes, context) => {
  if (nodes.length === 0) {
    return createEmptyResult();
  }

  const { bounds, defaultNodeWidth, defaultNodeHeight, defaultSpacing } = context;
  const flowDir = getParam(context, "flowDir", "row");
  const grDir = getParam(context, "grDir", "tL");
  const bkpt = getParam(context, "bkpt", "endCnv");

  const isRowFlow = flowDir === "row";
  const nodesPerRow = isRowFlow
    ? Math.floor((bounds.width + defaultSpacing) / (defaultNodeWidth + defaultSpacing))
    : Math.floor((bounds.height + defaultSpacing) / (defaultNodeHeight + defaultSpacing));

  const maxPerRow = Math.max(1, nodesPerRow);

  const layoutNodes: LayoutNode[] = [];
  let row = 0;
  let col = 0;
  let reverseRow = false;

  for (const node of nodes) {
    const actualCol = reverseRow ? (maxPerRow - 1 - col) : col;

    const x = isRowFlow
      ? bounds.x + actualCol * (defaultNodeWidth + defaultSpacing)
      : bounds.x + row * (defaultNodeWidth + defaultSpacing);
    const y = isRowFlow
      ? bounds.y + row * (defaultNodeHeight + defaultSpacing)
      : bounds.y + actualCol * (defaultNodeHeight + defaultSpacing);

    const layoutNode: LayoutNode = {
      treeNode: node,
      x,
      y,
      width: defaultNodeWidth,
      height: defaultNodeHeight,
      children: [],
    };
    layoutNodes.push(layoutNode);

    col++;
    if (col >= maxPerRow) {
      col = 0;
      row++;
      reverseRow = !reverseRow; // Snake pattern alternates direction
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
 * @see ECMA-376 Part 1, Section 21.4.2.20 (pyra)
 */
export const pyramidLayout: LayoutAlgorithmFn = (nodes, context) => {
  if (nodes.length === 0) {
    return createEmptyResult();
  }

  const { bounds, defaultNodeWidth, defaultNodeHeight, defaultSpacing } = context;
  const linDir = getParam(context, "linDir", "fromT");
  const isFromTop = linDir === "fromT";

  const centerX = bounds.x + bounds.width / 2;
  const layoutNodes: LayoutNode[] = [];

  // Calculate pyramid levels
  // Each level has progressively more width
  const totalHeight = nodes.length * (defaultNodeHeight + defaultSpacing) - defaultSpacing;
  const widthStep = (bounds.width - defaultNodeWidth) / Math.max(1, nodes.length - 1);

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[isFromTop ? i : nodes.length - 1 - i];
    const levelIndex = isFromTop ? i : nodes.length - 1 - i;
    const levelWidth = defaultNodeWidth + widthStep * levelIndex;

    const x = centerX - levelWidth / 2;
    const y = bounds.y + i * (defaultNodeHeight + defaultSpacing);

    const layoutNode: LayoutNode = {
      treeNode: node,
      x,
      y,
      width: levelWidth,
      height: defaultNodeHeight,
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
 * Container for other layout algorithms.
 *
 * @see ECMA-376 Part 1, Section 21.4.2.5 (composite)
 */
export const compositeLayout: LayoutAlgorithmFn = (nodes, context) => {
  // Composite is a container that delegates to child algorithms
  // For now, use linear as default
  return linearLayout(nodes, context);
};

// =============================================================================
// Connector Layout (conn)
// =============================================================================

/**
 * Connector layout algorithm.
 * Creates connections between nodes.
 *
 * @see ECMA-376 Part 1, Section 21.4.2.4 (conn)
 */
export const connectorLayout: LayoutAlgorithmFn = (nodes, context) => {
  // Connectors are lines between nodes, handled separately
  return createEmptyResult();
};

// =============================================================================
// Text Layout (tx)
// =============================================================================

/**
 * Text layout algorithm.
 * Layout for text content nodes.
 *
 * @see ECMA-376 Part 1, Section 21.4.2.28 (tx)
 */
export const textLayout: LayoutAlgorithmFn = (nodes, context) => {
  // Text layout is similar to space layout
  return spaceLayout(nodes, context);
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
