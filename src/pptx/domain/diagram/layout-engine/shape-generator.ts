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
} from "../types";
import type { PresetShapeType } from "../../types";
import { px, deg } from "../../types";
import type { SpShape, ShapeProperties, PresetGeometry } from "../../shape";
import type { Fill, SolidFill, Line } from "../../color";
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
  createDefaultStyleContext,
  type StyleResolverContext,
  type ResolvedDiagramStyle,
} from "./style-resolver";

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
  /** Theme colors (scheme name -> CSS color) */
  readonly themeColors?: Map<string, string>;
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
  const styleContext = createDefaultStyleContext(
    styleDefinition,
    colorDefinition,
    config.themeColors
  );

  // Process layout definition or use default layout
  const layoutNode = layoutDefinition?.layoutNode;
  const shapes = layoutNode
    ? processLayoutNode(layoutNode, treeResult.roots, config, styleContext, algorithmRegistry)
    : generateDefaultLayout(treeResult.roots, config, styleContext);

  // Calculate total bounds
  const bounds = calculateTotalBounds(shapes, config.bounds);

  return {
    shapes,
    bounds,
    treeResult,
  };
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
  const constrainedNodes = layoutNode.constraints
    ? applyConstraintsToLayout(
        layoutResult.nodes,
        layoutNode.constraints,
        config.bounds
      )
    : layoutResult.nodes;

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
  return createDefaultContext(
    config.bounds,
    layoutNode.algorithm?.params,
    layoutNode.constraints
  );
}

/**
 * Create an SpShape from layout node
 */
function createSpShapeFromLayoutNode(
  layoutNode: LayoutNode,
  layoutDef: DiagramLayoutNode | undefined,
  style: ResolvedDiagramStyle,
  config: ShapeGenerationConfig
): SpShape {
  const { treeNode } = layoutNode;

  // Determine shape type
  let shapeType: PresetShapeType = config.defaultShapeType ?? "rect";
  if (layoutDef?.shape?.type && layoutDef.shape.type !== "none" && layoutDef.shape.type !== "conn") {
    shapeType = layoutDef.shape.type as PresetShapeType;
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

  // Create geometry
  const geometry: PresetGeometry = {
    type: "preset",
    preset: shapeType,
    adjustValues: [],
  };

  // Create fill
  const fill = createFillFromStyle(style);

  // Create line
  const line = createLineFromStyle(style);

  // Create shape properties
  const properties: ShapeProperties = {
    transform,
    geometry,
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
 */
function createFillFromStyle(style: ResolvedDiagramStyle): Fill | undefined {
  if (!style.fillColor) {
    return undefined;
  }

  // Parse CSS color to hex value (remove #)
  const hexValue = style.fillColor.replace(/^#/, "");

  const solidFill: SolidFill = {
    type: "solidFill",
    color: {
      spec: {
        type: "srgb",
        value: hexValue,
      },
    },
  };

  return solidFill;
}

/**
 * Create Line from resolved style
 */
function createLineFromStyle(style: ResolvedDiagramStyle): Line | undefined {
  if (!style.lineColor) {
    return undefined;
  }

  // Parse CSS color to hex value (remove #)
  const hexValue = style.lineColor.replace(/^#/, "");

  const lineFill: SolidFill = {
    type: "solidFill",
    color: {
      spec: {
        type: "srgb",
        value: hexValue,
      },
    },
  };

  return {
    width: px(1), // Default line width in pixels
    cap: "flat",
    compound: "sng",
    alignment: "ctr",
    fill: lineFill,
    dash: "solid",
    join: "round",
  };
}

/**
 * Create TextBody from tree node
 */
function createTextBodyFromNode(
  node: DiagramTreeNode,
  style: ResolvedDiagramStyle
): TextBody | undefined {
  // If the node already has a textBody, use it
  if (node.textBody) {
    return node.textBody;
  }

  // No text body to create
  return undefined;
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

// =============================================================================
// Legacy Support Types (for backward compatibility during migration)
// =============================================================================

/**
 * @deprecated Use SpShape directly instead
 * Legacy shape type for backward compatibility
 */
export type GeneratedShape = {
  readonly id: string;
  readonly shapeType: PresetShapeType | "rect";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation?: number;
  readonly fillColor?: string;
  readonly lineColor?: string;
  readonly lineWidth?: number;
  readonly text?: string;
  readonly textColor?: string;
  readonly fontSize?: number;
  readonly children: readonly GeneratedShape[];
  readonly sourceNodeId: string;
  readonly styleLabel?: string;
};

/**
 * @deprecated Use SpShape directly
 * Convert SpShape to legacy GeneratedShape for backward compatibility
 */
export function spShapeToGeneratedShape(shape: SpShape): GeneratedShape {
  const transform = shape.properties.transform;
  const geometry = shape.properties.geometry;
  const fill = shape.properties.fill;
  const line = shape.properties.line;

  return {
    id: shape.nonVisual.id,
    shapeType: (geometry?.type === "preset" ? geometry.preset : "rect") as PresetShapeType | "rect",
    x: transform?.x ?? 0,
    y: transform?.y ?? 0,
    width: transform?.width ?? 0,
    height: transform?.height ?? 0,
    rotation: transform?.rotation,
    fillColor: extractColorFromFill(fill),
    lineColor: extractColorFromFill(line?.fill),
    lineWidth: line?.width,
    text: extractTextFromTextBody(shape.textBody),
    textColor: undefined, // Would need to extract from textBody
    fontSize: undefined, // Would need to extract from textBody
    children: [], // SpShape doesn't have children
    sourceNodeId: shape.modelId ?? shape.nonVisual.id,
    styleLabel: undefined,
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
 * @deprecated Use shapes from ShapeGenerationResult directly
 * Flatten shapes (no-op since SpShape output is already flat)
 */
export function flattenShapes(shapes: readonly SpShape[]): SpShape[] {
  return [...shapes];
}

/**
 * Convert SpShape to SVG attributes
 */
export function shapeToSvgAttributes(shape: SpShape | GeneratedShape): Record<string, string> {
  // Handle legacy GeneratedShape
  if ("shapeType" in shape && "x" in shape) {
    const legacyShape = shape as GeneratedShape;
    const attrs: Record<string, string> = {
      x: String(legacyShape.x),
      y: String(legacyShape.y),
      width: String(legacyShape.width),
      height: String(legacyShape.height),
    };

    if (legacyShape.fillColor) {
      attrs.fill = legacyShape.fillColor;
    } else {
      attrs.fill = "none";
    }

    if (legacyShape.lineColor) {
      attrs.stroke = legacyShape.lineColor;
      attrs["stroke-width"] = String(legacyShape.lineWidth ?? 1);
    }

    if (legacyShape.rotation) {
      const cx = legacyShape.x + legacyShape.width / 2;
      const cy = legacyShape.y + legacyShape.height / 2;
      attrs.transform = `rotate(${legacyShape.rotation}, ${cx}, ${cy})`;
    }

    return attrs;
  }

  // Handle SpShape
  const spShape = shape as SpShape;
  const transform = spShape.properties.transform;
  const fill = spShape.properties.fill;
  const line = spShape.properties.line;

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
export function generateShapeSvg(shape: SpShape | GeneratedShape): string {
  const attrs = shapeToSvgAttributes(shape);
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");

  const elements: string[] = [];

  // Shape background
  elements.push(`<rect ${attrStr}/>`);

  // Text content
  let text: string | undefined;
  let textColor = "#000000";
  let fontSize = 12;

  if ("text" in shape && shape.text) {
    // Legacy GeneratedShape
    text = shape.text;
    textColor = (shape as GeneratedShape).textColor ?? "#000000";
    fontSize = (shape as GeneratedShape).fontSize ?? 12;
  } else if ("textBody" in shape) {
    // SpShape
    text = extractTextFromTextBody((shape as SpShape).textBody);
  }

  if (text) {
    const x = Number(attrs.x);
    const y = Number(attrs.y);
    const width = Number(attrs.width);
    const height = Number(attrs.height);
    const textX = x + width / 2;
    const textY = y + height / 2;

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
