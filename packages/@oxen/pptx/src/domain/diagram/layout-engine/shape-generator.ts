/**
 * @file Dynamic shape generator for diagrams
 *
 * Generates SpShape objects from diagram data model by:
 * 1. Building tree from data model
 * 2. Processing layout definition
 * 3. Applying layout algorithms
 * 4. Resolving styles and colors
 * 5. Generating positioned, styled SpShape objects
 *
 * Output is compatible with DiagramContent.shapes for direct use
 * in the rendering pipeline.
 *
 * @see ECMA-376 Part 1, Section 21.4 - DrawingML Diagrams
 */

import type {
  DiagramDataModel,
  DiagramLayoutDefinition,
  DiagramStyleDefinition,
  DiagramColorsDefinition,
  DiagramLayoutNode,
  DiagramLayoutContent,
  DiagramConstraint,
} from "../types";
import type { PresetShapeType } from "../../types";
import { px, deg } from "@oxen/ooxml/domain/units";
import type { SpShape, ShapeProperties, PresetGeometry, AdjustValue } from "../../shape";
import type { Fill, Line } from "../../color/types";
import type { Transform } from "../../geometry";
import type { TextBody } from "../../text";

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
import type { ColorContext } from "../../color/context";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of shape generation
 */
export type ShapeGenerationResult = {
  /** All generated shapes (SpShape for compatibility with DiagramContent) */
  readonly shapes: readonly SpShape[];
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
): SpShape[] {
  if (layoutNode) {
    return processLayoutNode(layoutNode, roots, config, styleContext, algorithmRegistry);
  }
  return generateDefaultLayout(roots, config, styleContext);
}

/**
 * Generate SpShape objects from diagram data model
 */
export function generateDiagramShapes(
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
): SpShape[] {
  const shapes: SpShape[] = [];

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
  shapes: SpShape[]
): void {
  for (let i = 0; i < layoutNodes.length; i++) {
    const layoutNode = layoutNodes[i];
    const style = resolveNodeStyle(
      layoutNode.treeNode,
      i,
      layoutNodes.length,
      styleContext
    );

    const shape = createSpShapeFromLayoutNode(
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
): SpShape[] {
  const shapes: SpShape[] = [];
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
 * Create an SpShape from layout node
 *
 * @see ECMA-376 Part 1, Section 21.4.2.24 (shape element)
 */
function createSpShapeFromLayoutNode(
  layoutNode: LayoutNode,
  layoutDef: DiagramLayoutNode | undefined,
  style: ResolvedDiagramStyle,
  config: ShapeGenerationConfig
): SpShape {
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
  const transform: Transform = {
    x: px(layoutNode.x),
    y: px(layoutNode.y),
    width: px(layoutNode.width),
    height: px(layoutNode.height),
    rotation: deg(layoutNode.rotation ?? 0),
    flipH: false,
    flipV: false,
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

  // Create fill (hide if shape type is "none")
  const fill = isHidden ? undefined : createFillFromStyle(style);

  // Create line (hide if shape type is "none")
  const line = isHidden ? undefined : createLineFromStyle(style);

  // Create shape properties
  const properties: ShapeProperties = {
    transform,
    geometry: isHidden ? undefined : geometry,
    fill,
    line,
  };

  // Create text body if there's text content
  const textBody = createTextBodyFromNode(treeNode, style);

  return {
    type: "sp",
    nonVisual: {
      id: `shape-${treeNode.id}`,
      name: `Diagram Shape ${treeNode.id}`,
    },
    properties,
    textBody,
    modelId: treeNode.id,
  };
}

/**
 * Create Fill from resolved style
 *
 * Returns the Fill directly from the resolved style.
 * The style already contains a proper Fill (SolidFill, GradientFill, etc.).
 */
function createFillFromStyle(style: ResolvedDiagramStyle): Fill | undefined {
  return style.fill;
}

/**
 * Create Line from resolved style
 *
 * Returns the Line directly from the resolved style.
 */
function createLineFromStyle(style: ResolvedDiagramStyle): Line | undefined {
  return style.line;
}

/**
 * Create TextBody from tree node
 *
 * Uses the textBody from the diagram point, applying style fills
 * from the diagram style definition when the run doesn't have its own fill.
 *
 * @see ECMA-376 Part 1, Section 21.4.3.5 (text properties in diagram)
 */
function createTextBodyFromNode(
  node: DiagramTreeNode,
  style: ResolvedDiagramStyle
): TextBody | undefined {
  if (!node.textBody) {
    return undefined;
  }

  // If no style text fill, return as-is
  if (!style.textFill) {
    return node.textBody;
  }

  // Apply style text fill to runs that don't have their own fill
  return applyStyleFillToTextBody(node.textBody, style.textFill);
}

/**
 * Apply diagram style text fill to a TextBody
 *
 * Supports all Fill types (solid, gradient, pattern, etc.)
 * Only applies to runs that don't already have a fill defined.
 * Preserves the full paragraph/run structure.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */
function applyStyleFillToTextBody(
  textBody: TextBody,
  textFill: Fill
): TextBody {
  const updatedParagraphs = textBody.paragraphs.map((paragraph) => {
    if (!paragraph.runs) {
      return paragraph;
    }

    const updatedRuns = paragraph.runs.map((run) => {
      // Only apply style fill if run doesn't have its own fill
      if (run.type === "text" && !run.properties?.fill) {
        return {
          ...run,
          properties: {
            ...run.properties,
            fill: textFill,
          },
        };
      }
      return run;
    });

    return {
      ...paragraph,
      runs: updatedRuns,
    };
  });

  return {
    ...textBody,
    paragraphs: updatedParagraphs,
  };
}

/**
 * Calculate total bounds of all shapes
 */
function calculateTotalBounds(
  shapes: readonly SpShape[],
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
    const transform = shape.properties.transform;
    if (transform) {
      minX = Math.min(minX, transform.x);
      minY = Math.min(minY, transform.y);
      maxX = Math.max(maxX, transform.x + transform.width);
      maxY = Math.max(maxY, transform.y + transform.height);
    }
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


/**
 * Extract CSS color from Fill
 */
function extractColorFromFill(fill: Fill | undefined): string | undefined {
  if (!fill || fill.type !== "solidFill") {
    return undefined;
  }
  const spec = fill.color.spec;
  if (spec.type === "srgb") {
    return `#${spec.value}`;
  }
  return undefined;
}

/**
 * Extract text string from TextBody
 */
function extractTextFromTextBody(textBody: TextBody | undefined): string | undefined {
  if (!textBody?.paragraphs) {
    return undefined;
  }
  const text = textBody.paragraphs
    .flatMap((p) => p.runs?.map((r) => {
      // Only RegularRun has text property
      if (r.type === "text") {
        return r.text;
      }
      // LineBreakRun: return newline
      if (r.type === "break") {
        return "\n";
      }
      // FieldRun: skip
      return "";
    }) ?? [])
    .join("");
  return text || undefined;
}


/**
 * Convert SpShape to SVG attributes
 */
export function shapeToSvgAttributes(shape: SpShape): Record<string, string> {
  const transform = shape.properties.transform;
  const fill = shape.properties.fill;
  const line = shape.properties.line;

  const x = transform?.x ?? 0;
  const y = transform?.y ?? 0;
  const width = transform?.width ?? 0;
  const height = transform?.height ?? 0;

  const attrs: Record<string, string> = {
    x: String(x),
    y: String(y),
    width: String(width),
    height: String(height),
  };

  const fillColor = extractColorFromFill(fill);
  if (fillColor) {
    attrs.fill = fillColor;
  } else {
    attrs.fill = "none";
  }

  const lineColor = extractColorFromFill(line?.fill);
  if (lineColor) {
    attrs.stroke = lineColor;
    attrs["stroke-width"] = String(line?.width ?? 1);
  }

  const rotation = transform?.rotation;
  if (rotation) {
    const cx = x + width / 2;
    const cy = y + height / 2;
    attrs.transform = `rotate(${rotation}, ${cx}, ${cy})`;
  }

  return attrs;
}

/**
 * Generate simple SVG for a shape
 */
export function generateShapeSvg(shape: SpShape): string {
  const attrs = shapeToSvgAttributes(shape);
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");

  const elements: string[] = [];

  // Shape background
  elements.push(`<rect ${attrStr}/>`);

  // Text content
  const text = extractTextFromTextBody(shape.textBody);

  if (text) {
    const x = Number(attrs.x);
    const y = Number(attrs.y);
    const width = Number(attrs.width);
    const height = Number(attrs.height);
    const textX = x + width / 2;
    const textY = y + height / 2;

    // Default text styling
    const textColor = "#000000";
    const fontSize = 12;

    elements.push(
      `<text x="${textX}" y="${textY}" fill="${textColor}" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle">${escapeXml(text)}</text>`
    );
  }

  return elements.join("");
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
