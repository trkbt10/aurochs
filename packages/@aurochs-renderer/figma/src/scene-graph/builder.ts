/**
 * @file Scene graph builder
 *
 * Converts a Figma node tree to a format-agnostic scene graph.
 * The resulting scene graph can be consumed by both SVG and WebGL backends.
 */

import type { FigNode } from "@aurochs/fig/types";
import type { FigImage } from "@aurochs/fig/parser";
import type { FigBlob } from "@aurochs/fig/parser";
import {
  extractBaseProps,
  extractSizeProps,
  extractPaintProps,
  extractGeometryProps,
  extractEffectsProps,
} from "../svg/nodes/extract-props";
import type {
  SceneGraph,
  SceneNode,
  GroupNode,
  FrameNode,
  RectNode,
  EllipseNode,
  PathNode,
  TextNode,
  SceneNodeId,
  AffineMatrix,
} from "./types";
import { createNodeId } from "./types";
import { convertPaintsToFills } from "./convert/fill";
import { convertStrokeToSceneStroke } from "./convert/stroke";
import { convertEffectsToScene } from "./convert/effects";
import { decodeGeometryToContours, convertVectorPathsToContours } from "./convert/path";
import { convertTextNode } from "./convert/text";

// =============================================================================
// Build Context
// =============================================================================

/**
 * Configuration for building a scene graph
 */
export type BuildSceneGraphOptions = {
  /** Binary blobs from .fig file */
  readonly blobs: readonly FigBlob[];
  /** Image lookup map */
  readonly images: ReadonlyMap<string, FigImage>;
  /** Canvas size */
  readonly canvasSize: { width: number; height: number };
  /** Symbol map for INSTANCE resolution */
  readonly symbolMap?: ReadonlyMap<string, FigNode>;
  /** Whether to include hidden nodes */
  readonly showHiddenNodes?: boolean;
};

/**
 * Internal build context
 */
type BuildContext = {
  readonly blobs: readonly FigBlob[];
  readonly images: ReadonlyMap<string, FigImage>;
  readonly symbolMap: ReadonlyMap<string, FigNode>;
  readonly showHiddenNodes: boolean;
  nodeCounter: number;
};

// =============================================================================
// Node Type Detection
// =============================================================================

function getNodeTypeName(node: FigNode): string {
  const type = node.type;
  if (!type) return "UNKNOWN";
  if (typeof type === "string") return type;
  if (typeof type === "object" && "name" in type) {
    return (type as { name: string }).name;
  }
  return "UNKNOWN";
}

function getNodeId(node: FigNode, ctx: BuildContext): SceneNodeId {
  const guid = node.guid;
  if (guid) {
    if (typeof guid === "object" && guid !== null) {
      const g = guid as { sessionID?: number; localID?: number };
      return createNodeId(`${g.sessionID ?? 0}:${g.localID ?? 0}`);
    }
    return createNodeId(String(guid));
  }
  return createNodeId(`node-${ctx.nodeCounter++}`);
}

// =============================================================================
// Transform Conversion
// =============================================================================

const IDENTITY: AffineMatrix = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };

function convertTransform(
  matrix: { m00?: number; m01?: number; m02?: number; m10?: number; m11?: number; m12?: number } | undefined,
): AffineMatrix {
  if (!matrix) return IDENTITY;
  return {
    m00: matrix.m00 ?? 1,
    m01: matrix.m01 ?? 0,
    m02: matrix.m02 ?? 0,
    m10: matrix.m10 ?? 0,
    m11: matrix.m11 ?? 1,
    m12: matrix.m12 ?? 0,
  };
}

// =============================================================================
// Corner Radius
// =============================================================================

/**
 * Extract a single uniform corner radius from a node.
 * Handles both `rectangleCornerRadii` (per-corner) and `cornerRadius`.
 * When per-corner radii differ, uses the average (scene graph limitation).
 */
function extractUniformCornerRadius(node: FigNode): number | undefined {
  const radii = node.rectangleCornerRadii;
  if (radii && radii.length === 4) {
    const allSame = radii[0] === radii[1] && radii[1] === radii[2] && radii[2] === radii[3];
    if (allSame) return radii[0] || undefined;
    const avg = (radii[0] + radii[1] + radii[2] + radii[3]) / 4;
    return avg || undefined;
  }
  return node.cornerRadius;
}

// =============================================================================
// Clipping
// =============================================================================

function resolveClipsContent(node: FigNode): boolean {
  const nodeData = node as Record<string, unknown>;
  // clipsContent is the standard API field
  if (nodeData.clipsContent !== undefined) {
    return !!nodeData.clipsContent;
  }
  // frameMaskDisabled is the .fig file field (inverted meaning)
  if (nodeData.frameMaskDisabled !== undefined) {
    return !nodeData.frameMaskDisabled;
  }
  // Default: frames clip, others don't
  const typeName = getNodeTypeName(node);
  return typeName === "FRAME" || typeName === "COMPONENT" || typeName === "COMPONENT_SET";
}

// =============================================================================
// Node Builders
// =============================================================================

function buildGroupNode(node: FigNode, ctx: BuildContext, children: readonly SceneNode[]): GroupNode {
  const base = extractBaseProps(node);
  return {
    type: "group",
    id: getNodeId(node, ctx),
    name: node.name,
    transform: convertTransform(base.transform),
    opacity: base.opacity,
    visible: base.visible,
    effects: [],
    children,
  };
}

function buildFrameNode(node: FigNode, ctx: BuildContext, children: readonly SceneNode[]): FrameNode {
  const base = extractBaseProps(node);
  const { size } = extractSizeProps(node);
  const { fillPaints, strokePaints, strokeWeight } = extractPaintProps(node);
  const { effects } = extractEffectsProps(node);
  const cornerRadius = extractUniformCornerRadius(node);
  const clipsContent = resolveClipsContent(node);

  return {
    type: "frame",
    id: getNodeId(node, ctx),
    name: node.name,
    transform: convertTransform(base.transform),
    opacity: base.opacity,
    visible: base.visible,
    effects: convertEffectsToScene(effects),
    width: size.x,
    height: size.y,
    cornerRadius,
    fills: convertPaintsToFills(fillPaints, ctx.images),
    stroke: convertStrokeToSceneStroke(strokePaints, strokeWeight),
    clipsContent,
    children,
    clip: clipsContent ? { type: "rect", width: size.x, height: size.y, cornerRadius } : undefined,
  };
}

function buildRectNode(node: FigNode, ctx: BuildContext): RectNode {
  const base = extractBaseProps(node);
  const { size } = extractSizeProps(node);
  const { fillPaints, strokePaints, strokeWeight } = extractPaintProps(node);
  const { effects } = extractEffectsProps(node);
  const cornerRadius = extractUniformCornerRadius(node);

  return {
    type: "rect",
    id: getNodeId(node, ctx),
    name: node.name,
    transform: convertTransform(base.transform),
    opacity: base.opacity,
    visible: base.visible,
    effects: convertEffectsToScene(effects),
    width: size.x,
    height: size.y,
    cornerRadius,
    fills: convertPaintsToFills(fillPaints, ctx.images),
    stroke: convertStrokeToSceneStroke(strokePaints, strokeWeight),
  };
}

function buildEllipseNode(node: FigNode, ctx: BuildContext): EllipseNode {
  const base = extractBaseProps(node);
  const { size } = extractSizeProps(node);
  const { fillPaints, strokePaints, strokeWeight } = extractPaintProps(node);
  const { effects } = extractEffectsProps(node);

  return {
    type: "ellipse",
    id: getNodeId(node, ctx),
    name: node.name,
    transform: convertTransform(base.transform),
    opacity: base.opacity,
    visible: base.visible,
    effects: convertEffectsToScene(effects),
    cx: size.x / 2,
    cy: size.y / 2,
    rx: size.x / 2,
    ry: size.y / 2,
    fills: convertPaintsToFills(fillPaints, ctx.images),
    stroke: convertStrokeToSceneStroke(strokePaints, strokeWeight),
  };
}

function buildVectorNode(node: FigNode, ctx: BuildContext): PathNode {
  const base = extractBaseProps(node);
  const { fillPaints, strokePaints, strokeWeight } = extractPaintProps(node);
  const { fillGeometry, strokeGeometry } = extractGeometryProps(node);
  const { effects } = extractEffectsProps(node);

  // Try vectorPaths first, then fillGeometry, then strokeGeometry
  const nodeData = node as Record<string, unknown>;
  const vectorPaths = nodeData.vectorPaths as readonly { data: string; windingRule?: unknown }[] | undefined;

  let contours = convertVectorPathsToContours(vectorPaths);
  let isStrokeGeometry = false;
  if (contours.length === 0) {
    contours = decodeGeometryToContours(fillGeometry, ctx.blobs);
  }
  if (contours.length === 0) {
    contours = decodeGeometryToContours(strokeGeometry, ctx.blobs);
    isStrokeGeometry = contours.length > 0;
  }

  // strokeGeometry is Figma's pre-expanded outline of a stroke.
  // It should be *filled* with the stroke colour, not stroked again.
  const fills = isStrokeGeometry
    ? convertPaintsToFills(strokePaints, ctx.images)
    : convertPaintsToFills(fillPaints, ctx.images);
  const stroke = isStrokeGeometry ? undefined : convertStrokeToSceneStroke(strokePaints, strokeWeight);

  return {
    type: "path",
    id: getNodeId(node, ctx),
    name: node.name,
    transform: convertTransform(base.transform),
    opacity: base.opacity,
    visible: base.visible,
    effects: convertEffectsToScene(effects),
    contours,
    fills,
    stroke,
  };
}

function buildTextNode(node: FigNode, ctx: BuildContext): TextNode {
  const base = extractBaseProps(node);
  const textData = convertTextNode(node, ctx.blobs);
  const sizeObj = (node as Record<string, unknown>).size as { x?: number; y?: number } | undefined;

  return {
    type: "text",
    id: getNodeId(node, ctx),
    name: node.name,
    transform: convertTransform(base.transform),
    opacity: base.opacity,
    visible: base.visible,
    effects: [],
    width: sizeObj?.x ?? 0,
    height: sizeObj?.y ?? 0,
    glyphContours: textData.glyphContours,
    decorationContours: textData.decorationContours,
    fill: textData.fill,
    fallbackText: textData.fallbackText,
  };
}

// =============================================================================
// Recursive Builder
// =============================================================================

function buildNode(node: FigNode, ctx: BuildContext): SceneNode | null {
  const base = extractBaseProps(node);

  // Skip hidden nodes unless explicitly shown
  if (!base.visible && !ctx.showHiddenNodes) {
    return null;
  }

  const typeName = getNodeTypeName(node);
  const children = node.children ?? [];

  switch (typeName) {
    case "DOCUMENT":
    case "CANVAS": {
      const childNodes = buildChildren(children, ctx);
      return buildGroupNode(node, ctx, childNodes);
    }

    case "FRAME":
    case "COMPONENT":
    case "COMPONENT_SET":
    case "INSTANCE":
    case "SYMBOL": {
      const childNodes = buildChildren(children, ctx);
      return buildFrameNode(node, ctx, childNodes);
    }

    case "GROUP":
    case "BOOLEAN_OPERATION": {
      const childNodes = buildChildren(children, ctx);
      return buildGroupNode(node, ctx, childNodes);
    }

    case "RECTANGLE":
    case "ROUNDED_RECTANGLE":
      return buildRectNode(node, ctx);

    case "ELLIPSE":
      return buildEllipseNode(node, ctx);

    case "VECTOR":
    case "LINE":
    case "STAR":
    case "REGULAR_POLYGON":
      return buildVectorNode(node, ctx);

    case "TEXT":
      return buildTextNode(node, ctx);

    default:
      // Unknown node type - try to render children as group
      if (children.length > 0) {
        const childNodes = buildChildren(children, ctx);
        return buildGroupNode(node, ctx, childNodes);
      }
      return null;
  }
}

function buildChildren(children: readonly FigNode[], ctx: BuildContext): SceneNode[] {
  const result: SceneNode[] = [];
  for (const child of children) {
    const node = buildNode(child, ctx);
    if (node) {
      result.push(node);
    }
  }
  return result;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Build a scene graph from Figma nodes
 *
 * @param nodes - Root Figma nodes to render
 * @param options - Build configuration
 * @returns Format-agnostic scene graph
 */
export function buildSceneGraph(nodes: readonly FigNode[], options: BuildSceneGraphOptions): SceneGraph {
  const ctx: BuildContext = {
    blobs: options.blobs,
    images: options.images,
    symbolMap: options.symbolMap ?? new Map(),
    showHiddenNodes: options.showHiddenNodes ?? false,
    nodeCounter: 0,
  };

  const children = buildChildren(nodes, ctx);

  const root: GroupNode = {
    type: "group",
    id: createNodeId("root"),
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    opacity: 1,
    visible: true,
    effects: [],
    children,
  };

  return {
    width: options.canvasSize.width,
    height: options.canvasSize.height,
    root,
    version: 1,
  };
}
