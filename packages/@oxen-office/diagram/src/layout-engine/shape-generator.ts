/**
 * @file Dynamic shape generator for diagrams
 *
 * Generates format-agnostic layout results from diagram data model by:
 * 1. Building tree from data model
 * 2. Processing layout definition
 * 3. Applying layout algorithms
 * 4. Resolving styles and colors
 * 5. Generating positioned, styled LayoutShapeResult objects
 *
 * @see ECMA-376 Part 1, Section 21.4 - DrawingML Diagrams
 */

/* eslint-disable custom/max-params -- Ported generator uses positional params; refactoring would be noisy. */

import type {
  DiagramDataModel,
  DiagramLayoutDefinition,
  DiagramStyleDefinition,
  DiagramColorsDefinition,
  DiagramLayoutNode,
  DiagramLayoutContent,
  DiagramConstraint,
} from "../domain/types";
import type {
  AdjustValue,
  LayoutShapeResult,
  LayoutTransform,
  PresetGeometry,
  PresetShapeType,
} from "../domain/layout-shape-result";

import { buildDiagramTree, type DiagramTreeNode, type DiagramTreeBuildResult } from "./tree-builder";
import {
  type LayoutNode,
  type LayoutBounds,
  type LayoutContext,
  createDefaultContext,
} from "./types";
import { createAlgorithmRegistry, getLayoutAlgorithm } from "./algorithms";
import { applyConstraintsToLayout } from "./constraints";
import {
  processForEach,
  processChoose,
  createForEachContext,
  type ForEachContext,
} from "./iteration";
import {
  resolveNodeStyle,
  createStyleContext,
  createEmptyColorContext,
  type StyleResolverContext,
  type ResolvedDiagramStyle,
} from "./style-resolver";
import type { ColorContext } from "@oxen-office/ooxml/domain/color-context";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of shape generation
 */
export type ShapeGenerationResult = {
  /** All generated shapes (format-agnostic layout results) */
  readonly shapes: readonly LayoutShapeResult[];
  /** Total bounds of all shapes */
  readonly bounds: LayoutBounds;
  /** Tree build result for reference */
  readonly treeResult: DiagramTreeBuildResult;
};

/**
 * Configuration for shape generation
 */
export type ShapeGenerationConfig = {
  /** Available bounds for the diagram */
  readonly bounds: LayoutBounds;
  /** Color context for theme/scheme color resolution */
  readonly colorContext?: ColorContext;
  /** Default shape type when not specified */
  readonly defaultShapeType?: PresetShapeType;
  /** Default node width */
  readonly defaultNodeWidth?: number;
  /** Default node height */
  readonly defaultNodeHeight?: number;
  /** Default spacing between nodes */
  readonly defaultSpacing?: number;
};

// =============================================================================
// Shape Generation
// =============================================================================

function generateShapesFromLayout(
  layoutNode: DiagramLayoutNode | undefined,
  roots: readonly DiagramTreeNode[],
  config: ShapeGenerationConfig,
  styleContext: StyleResolverContext,
  algorithmRegistry: ReturnType<typeof createAlgorithmRegistry>
): LayoutShapeResult[] {
  if (layoutNode) {
    return processLayoutNode(layoutNode, roots, config, styleContext, algorithmRegistry);
  }
  return generateDefaultLayout(roots, config, styleContext);
}

/**
 * Generate LayoutShapeResult objects from diagram data model
 */
export function generateDiagramLayoutResults(
  dataModel: DiagramDataModel,
  layoutDefinition: DiagramLayoutDefinition | undefined,
  styleDefinition: DiagramStyleDefinition | undefined,
  colorDefinition: DiagramColorsDefinition | undefined,
  config: ShapeGenerationConfig
): ShapeGenerationResult {
  // Build tree from data model
  const treeResult = buildDiagramTree(dataModel);

  if (treeResult.roots.length === 0) {
    return {
      shapes: [],
      bounds: config.bounds,
      treeResult,
    };
  }

  // Create contexts
  const algorithmRegistry = createAlgorithmRegistry();
  const colorContext = config.colorContext ?? createEmptyColorContext();
  const styleContext = createStyleContext(
    colorContext,
    styleDefinition,
    colorDefinition
  );

  // Process layout definition or use default layout
  const layoutNode = layoutDefinition?.layoutNode;
  const shapes = generateShapesFromLayout(
    layoutNode,
    treeResult.roots,
    config,
    styleContext,
    algorithmRegistry
  );

  // Calculate total bounds
  const bounds = calculateTotalBounds(shapes, config.bounds);

  return {
    shapes,
    bounds,
    treeResult,
  };
}

/**
 * Apply constraints to layout nodes if constraints are defined
 */
function applyConstraintsIfPresent(
  nodes: readonly LayoutNode[],
  constraints: readonly DiagramConstraint[] | undefined,
  bounds: LayoutBounds
): readonly LayoutNode[] {
  if (constraints) {
    return applyConstraintsToLayout(nodes, constraints, bounds);
  }
  return nodes;
}

/**
 * Process a layout node definition
 */
function processLayoutNode(
  layoutNode: DiagramLayoutNode,
  dataNodes: readonly DiagramTreeNode[],
  config: ShapeGenerationConfig,
  styleContext: StyleResolverContext,
  algorithmRegistry: ReturnType<typeof createAlgorithmRegistry>
): LayoutShapeResult[] {
  const shapes: LayoutShapeResult[] = [];

  // Get algorithm type
  const algorithmType = layoutNode.algorithm?.type ?? "lin";
  const algorithm = getLayoutAlgorithm(algorithmRegistry, algorithmType);

  // Create layout context
  const layoutContext = createLayoutContext(layoutNode, config);

  // Create forEach context for iteration
  const rootNode = dataNodes[0];
  const forEachContext = createForEachContext(rootNode, dataNodes);

  // Process content (forEach, choose, children)
  const processedNodes = processLayoutContent(
    layoutNode,
    dataNodes,
    forEachContext
  );

  // Apply layout algorithm
  const layoutResult = algorithm(processedNodes, layoutContext);

  // Apply constraints if any
  const constrainedNodes = applyConstraintsIfPresent(
    layoutResult.nodes,
    layoutNode.constraints,
    config.bounds
  );

  // Generate shapes from layout nodes (flattened)
  collectShapesFromLayoutNodes(constrainedNodes, layoutNode, styleContext, config, shapes);

  return shapes;
}

/**
 * Collect shapes from layout nodes recursively (flattened output)
 */
function collectShapesFromLayoutNodes(
  layoutNodes: readonly LayoutNode[],
  layoutDef: DiagramLayoutNode | undefined,
  styleContext: StyleResolverContext,
  config: ShapeGenerationConfig,
  shapes: LayoutShapeResult[]
): void {
  for (let i = 0; i < layoutNodes.length; i++) {
    const layoutNode = layoutNodes[i];
    const style = resolveNodeStyle({
      node: layoutNode.treeNode,
      nodeIndex: i,
      totalNodes: layoutNodes.length,
      context: styleContext,
    });

    const shape = createLayoutShapeResultFromLayoutNode(
      layoutNode,
      layoutDef,
      style,
      config
    );
    shapes.push(shape);

    // Process children recursively
    if (layoutNode.children.length > 0) {
      collectShapesFromLayoutNodes(
        layoutNode.children,
        undefined,
        styleContext,
        config,
        shapes
      );
    }
  }
}

/**
 * Process layout content (forEach, choose, children)
 */
function processLayoutContent(
  content: DiagramLayoutContent,
  dataNodes: readonly DiagramTreeNode[],
  context: ForEachContext
): DiagramTreeNode[] {
  let result: DiagramTreeNode[] = [...dataNodes];

  // Process forEach elements
  if (content.forEach && content.forEach.length > 0) {
    const forEachResults: DiagramTreeNode[] = [];

    for (const forEach of content.forEach) {
      const forEachResult = processForEach(forEach, context);
      forEachResults.push(...forEachResult.selectedNodes);
    }

    result = forEachResults;
  }

  // Process choose elements
  if (content.choose && content.choose.length > 0) {
    for (const choose of content.choose) {
      processChoose(choose, context);
      // If a branch was taken, we could process its content recursively
      // For now, just mark that a choice was made
    }
  }

  return result;
}

/**
 * Generate default layout when no layout definition
 */
function generateDefaultLayout(
  dataNodes: readonly DiagramTreeNode[],
  config: ShapeGenerationConfig,
  styleContext: StyleResolverContext
): LayoutShapeResult[] {
  const shapes: LayoutShapeResult[] = [];
  const algorithmRegistry = createAlgorithmRegistry();
  const algorithm = getLayoutAlgorithm(algorithmRegistry, "lin");

  const layoutContext: LayoutContext = {
    bounds: config.bounds,
    params: new Map(),
    constraints: [],
    defaultSpacing: config.defaultSpacing ?? 10,
    defaultNodeWidth: config.defaultNodeWidth ?? 100,
    defaultNodeHeight: config.defaultNodeHeight ?? 60,
    // ECMA-376 required fields
    variables: new Map(),
    resolvedConstraints: new Map(),
    namedNodes: new Map(),
  };

  // Get content nodes only (exclude transitions and presentation nodes)
  const contentNodes = dataNodes.flatMap((n) => getContentNodesFlat(n));

  const layoutResult = algorithm(contentNodes, layoutContext);

  collectShapesFromLayoutNodes(layoutResult.nodes, undefined, styleContext, config, shapes);

  return shapes;
}

/**
 * Get content nodes from tree (flattened)
 */
function getContentNodesFlat(node: DiagramTreeNode): DiagramTreeNode[] {
  const result: DiagramTreeNode[] = [];

  if (node.type === "node" || node.type === "doc" || node.type === "asst") {
    result.push(node);
  }

  for (const child of node.children) {
    result.push(...getContentNodesFlat(child));
  }

  return result;
}

/**
 * Create a layout context from layout node
 */
function createLayoutContext(
  layoutNode: DiagramLayoutNode,
  config: ShapeGenerationConfig
): LayoutContext {
  return createDefaultContext({
    bounds: config.bounds,
    params: layoutNode.algorithm?.params,
    constraints: layoutNode.constraints,
  });
}

/**
 * Create a LayoutShapeResult from layout node.
 */
function createLayoutShapeResultFromLayoutNode(
  layoutNode: LayoutNode,
  layoutDef: DiagramLayoutNode | undefined,
  style: ResolvedDiagramStyle,
  config: ShapeGenerationConfig
): LayoutShapeResult {
  const { treeNode, isConnector } = layoutNode;

  // Determine shape type from layoutDef or defaults
  const shapeSpec = layoutDef?.shape;
  let shapeType: PresetShapeType = config.defaultShapeType ?? "rect";
  let isHidden = false;

  if (shapeSpec?.type) {
    if (shapeSpec.type === "none") {
      // Shape geometry is hidden but text may still be visible
      isHidden = true;
    } else if (shapeSpec.type === "conn") {
      // Connector shape - use line or straight connector
      shapeType = "line";
    } else {
      shapeType = shapeSpec.type as PresetShapeType;
    }
  }

  // If this is a connector from layout algorithm, override shape type
  if (isConnector) {
    shapeType = "straightConnector1";
  }

  // Create transform with branded types
  const transform: LayoutTransform = {
    x: layoutNode.x,
    y: layoutNode.y,
    width: layoutNode.width,
    height: layoutNode.height,
    rotation: layoutNode.rotation ?? 0,
    flipHorizontal: false,
    flipVertical: false,
  };

  // Create geometry with adjustments from layoutDef
  // Note: AdjustValue uses name (e.g., "adj1") not index
  const adjustValues: AdjustValue[] = [];
  if (shapeSpec?.adjustments) {
    for (const adj of shapeSpec.adjustments) {
      if (adj.index !== undefined && adj.value !== undefined) {
        // Parse the value (could be percentage or absolute)
        const numValue = parseFloat(adj.value);
        if (!isNaN(numValue)) {
          // Convert index to name format (adj1, adj2, etc.)
          const name = `adj${adj.index + 1}`;
          adjustValues.push({ name, value: numValue });
        }
      }
    }
  }

  const geometry: PresetGeometry = {
    type: "preset",
    preset: shapeType,
    adjustValues,
  };

  return {
    id: `shape-${treeNode.id}`,
    name: `Diagram Shape ${treeNode.id}`,
    modelId: treeNode.id,
    transform,
    geometry: isHidden ? undefined : geometry,
    fill: isHidden ? undefined : style.fill,
    line: isHidden ? undefined : style.line,
    textFill: style.textFill,
    textLine: style.textLine,
    textBody: treeNode.textBody,
  };
}

/**
 * Calculate total bounds of all shapes
 */
function calculateTotalBounds(
  shapes: readonly LayoutShapeResult[],
  defaultBounds: LayoutBounds
): LayoutBounds {
  if (shapes.length === 0) {
    return defaultBounds;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const shape of shapes) {
    const transform = shape.transform;
    minX = Math.min(minX, transform.x);
    minY = Math.min(minY, transform.y);
    maxX = Math.max(maxX, transform.x + transform.width);
    maxY = Math.max(maxY, transform.y + transform.height);
  }

  if (minX === Infinity) {
    return defaultBounds;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
