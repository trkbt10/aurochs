/**
 * @file Scene graph builder
 *
 * Converts a FigDesignNode tree (domain objects) to a format-agnostic scene graph.
 * The resulting scene graph can be consumed by both SVG and WebGL backends.
 *
 * This builder accepts FigDesignNode directly — no intermediate conversion
 * from the raw parser type (FigNode) is needed. This ensures the renderer
 * stays in sync with the domain model by construction.
 */

import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigPaint } from "@aurochs/fig/types";
import type { FigImage, FigBlob } from "@aurochs/fig/parser";
import { IDENTITY_MATRIX } from "@aurochs/fig/matrix";
import {
  extractBaseProps,
  extractSizeProps,
  extractPaintProps,
  extractGeometryProps,
  extractEffectsProps,
} from "./extract";
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
import { generateStarContour, generatePolygonContour, generateLineContour } from "./convert/shape-geometry";
import { extractUniformCornerRadius as sharedExtractUniformCornerRadius, resolveClipsContent as sharedResolveClipsContent } from "../geometry";
import { convertTextNode } from "./convert/text";
import type { Fill, PathContour } from "./types";

/** Select fill paints based on whether stroke geometry is being used */
function selectPaintsForFills(
  isStrokeGeometry: boolean,
  paints: { strokePaints: readonly FigPaint[] | undefined; fillPaints: readonly FigPaint[] | undefined },
  images: ReadonlyMap<string, FigImage>
): Fill[] {
  const source = isStrokeGeometry ? paints.strokePaints : paints.fillPaints;
  return convertPaintsToFills(source, images);
}

// =============================================================================
// Build Context
// =============================================================================

/**
 * Configuration for building a scene graph.
 *
 * symbolMap uses FigDesignNode (domain type) — symbol resolution operates
 * on domain objects, not raw parser types.
 */
export type BuildSceneGraphOptions = {
  /** Binary blobs from .fig file */
  readonly blobs: readonly FigBlob[];
  /** Image lookup map */
  readonly images: ReadonlyMap<string, FigImage>;
  /** Canvas size */
  readonly canvasSize: { width: number; height: number };
  /** Symbol map for INSTANCE resolution (domain objects) */
  readonly symbolMap?: ReadonlyMap<string, FigDesignNode>;
  /** Whether to include hidden nodes */
  readonly showHiddenNodes?: boolean;
};

/**
 * Internal build context
 */
type BuildContext = {
  readonly blobs: readonly FigBlob[];
  readonly images: ReadonlyMap<string, FigImage>;
  readonly symbolMap: ReadonlyMap<string, FigDesignNode>;
  readonly showHiddenNodes: boolean;
  nodeCounter: number;
};

// =============================================================================
// Node Type & ID helpers
// =============================================================================

/**
 * Get the node type name from a FigDesignNode.
 *
 * FigDesignNode.type is FigNodeType (a string literal from KiwiEnumValue name),
 * so this is a direct read — no enum unwrapping needed.
 */
function getNodeTypeName(node: FigDesignNode): string {
  const type = node.type;
  if (!type) { return "UNKNOWN"; }
  if (typeof type === "string") { return type; }
  // KiwiEnumValue fallback
  if (typeof type === "object" && "name" in type) {
    return (type as { name: string }).name;
  }
  return "UNKNOWN";
}

/**
 * Generate a SceneNodeId from a FigDesignNode.
 *
 * FigDesignNode.id is a branded string "sessionID:localID",
 * which is already unique — use it directly as the SceneNodeId.
 */
function getNodeId(node: FigDesignNode, ctx: BuildContext): SceneNodeId {
  if (node.id) {
    return createNodeId(node.id);
  }
  return createNodeId(`node-${ctx.nodeCounter++}`);
}

// =============================================================================
// Transform Conversion
// =============================================================================

const IDENTITY: AffineMatrix = IDENTITY_MATRIX;

function convertTransform(
  matrix: { m00?: number; m01?: number; m02?: number; m10?: number; m11?: number; m12?: number } | undefined,
): AffineMatrix {
  if (!matrix) {return IDENTITY;}
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
// Corner Radius & Clipping (delegates to shared SoT in geometry/)
// =============================================================================

function extractCornerRadius(node: FigDesignNode): number | undefined {
  return sharedExtractUniformCornerRadius(node.cornerRadius, node.rectangleCornerRadii);
}

function resolveClipsContent(node: FigDesignNode): boolean {
  const raw = node._raw;
  return sharedResolveClipsContent(
    node.clipsContent,
    raw?.frameMaskDisabled as boolean | undefined,
    getNodeTypeName(node),
  );
}

// =============================================================================
// Instance Resolution
// =============================================================================

/**
 * Result of resolving an INSTANCE node against its SYMBOL/COMPONENT.
 */
type ResolvedInstance = {
  /** Effective node with visual properties merged from SYMBOL */
  readonly effectiveNode: FigDesignNode;
  /** Resolved children (from instance or inherited from symbol) */
  readonly children: readonly FigDesignNode[];
};

/**
 * Check if a fills array is effectively empty (no visible fills).
 * Instance nodes in Figma .fig files typically have empty fillPaints,
 * with the actual fills stored on the SYMBOL.
 */
function hasVisibleFills(fills: readonly FigPaint[] | undefined): boolean {
  if (!fills || fills.length === 0) return false;
  return fills.some((p) => p.visible !== false);
}

/**
 * Resolve an INSTANCE node against its SYMBOL/COMPONENT.
 *
 * Merges visual properties from the SYMBOL into the INSTANCE:
 * - fills, strokes, strokeWeight (paint properties)
 * - cornerRadius, rectangleCornerRadii (geometry)
 * - effects (drop shadow, blur, etc.)
 * - clipsContent (frame clipping behaviour)
 *
 * The INSTANCE retains its own transform, size, and opacity
 * (these define placement and scaling of the instance).
 *
 * Children are resolved: if the instance has its own children, use those;
 * otherwise inherit from the SYMBOL.
 */
function resolveInstance(
  node: FigDesignNode,
  ownChildren: readonly FigDesignNode[],
  ctx: BuildContext,
): ResolvedInstance {
  const symbolId = node.symbolId;
  if (!symbolId) {
    return { effectiveNode: node, children: ownChildren };
  }

  const symbol = ctx.symbolMap.get(symbolId);
  if (!symbol) {
    return { effectiveNode: node, children: ownChildren };
  }

  // Resolve children
  const children = ownChildren.length > 0 ? ownChildren : (symbol.children ?? []);

  // Merge visual properties from SYMBOL into INSTANCE.
  // Instance properties that are empty/default are replaced with symbol values.
  // Instance properties that are explicitly set take precedence.
  const effectiveNode: FigDesignNode = {
    ...node,
    // Paint: use instance fills only if they contain visible paints
    fills: hasVisibleFills(node.fills) ? node.fills : symbol.fills,
    strokes: (node.strokes?.length ?? 0) > 0 ? node.strokes : symbol.strokes,
    strokeWeight: node.strokeWeight ?? symbol.strokeWeight,

    // Geometry: inherit from symbol if instance doesn't have its own
    cornerRadius: node.cornerRadius ?? symbol.cornerRadius,
    rectangleCornerRadii: node.rectangleCornerRadii ?? symbol.rectangleCornerRadii,

    // Effects: inherit from symbol if instance has no effects
    effects: (node.effects?.length ?? 0) > 0 ? node.effects : symbol.effects,

    // Clipping: inherit from symbol if instance doesn't specify
    clipsContent: node.clipsContent ?? symbol.clipsContent,
  };

  return { effectiveNode, children };
}

// =============================================================================
// Node Builders
// =============================================================================

function buildGroupNode(node: FigDesignNode, ctx: BuildContext, children: readonly SceneNode[]): GroupNode {
  const base = extractBaseProps(node);
  const { effects } = extractEffectsProps(node);
  return {
    type: "group",
    id: getNodeId(node, ctx),
    name: node.name,
    transform: convertTransform(base.transform),
    opacity: base.opacity,
    visible: base.visible,
    effects: convertEffectsToScene(effects),
    children,
  };
}

function buildFrameNode(node: FigDesignNode, ctx: BuildContext, children: readonly SceneNode[]): FrameNode {
  const base = extractBaseProps(node);
  const { size } = extractSizeProps(node);
  const { fillPaints, strokePaints, strokeWeight } = extractPaintProps(node);
  const { effects } = extractEffectsProps(node);
  const cornerRadius = extractCornerRadius(node);
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

function buildRectNode(node: FigDesignNode, ctx: BuildContext): RectNode {
  const base = extractBaseProps(node);
  const { size } = extractSizeProps(node);
  const { fillPaints, strokePaints, strokeWeight } = extractPaintProps(node);
  const { effects } = extractEffectsProps(node);
  const cornerRadius = extractCornerRadius(node);

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

function buildEllipseNode(node: FigDesignNode, ctx: BuildContext): EllipseNode {
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

/**
 * Synthesize contours from parametric shape properties when no
 * pre-computed geometry blobs exist (e.g., builder-generated documents).
 */
function synthesizeContours(node: FigDesignNode): PathContour[] {
  const typeName = getNodeTypeName(node);
  const w = node.size?.x ?? 0;
  const h = node.size?.y ?? 0;

  switch (typeName) {
    case "STAR":
      return [generateStarContour(
        w,
        h,
        node.pointCount ?? 5,
        node.starInnerRadius ?? 0.382,
      )];
    case "REGULAR_POLYGON":
      return [generatePolygonContour(w, h, node.pointCount ?? 3)];
    case "LINE":
      return [generateLineContour(w)];
    default:
      return [];
  }
}

function buildVectorNode(node: FigDesignNode, ctx: BuildContext): PathNode {
  const base = extractBaseProps(node);
  const { fillPaints, strokePaints, strokeWeight } = extractPaintProps(node);
  const { fillGeometry, strokeGeometry } = extractGeometryProps(node);
  const { effects } = extractEffectsProps(node);

  // vectorPaths is not a first-class field on FigDesignNode; check _raw
  const raw = node._raw;
  const vectorPaths = raw?.vectorPaths as readonly { data: string; windingRule?: unknown }[] | undefined;

  const contoursRef = { value: convertVectorPathsToContours(vectorPaths) };
  const isStrokeGeometryRef = { value: false };
  if (contoursRef.value.length === 0) {
    contoursRef.value = decodeGeometryToContours(fillGeometry, ctx.blobs);
  }
  if (contoursRef.value.length === 0) {
    contoursRef.value = decodeGeometryToContours(strokeGeometry, ctx.blobs);
    isStrokeGeometryRef.value = contoursRef.value.length > 0;
  }

  // Last resort: synthesize geometry from parametric shape definition
  if (contoursRef.value.length === 0) {
    contoursRef.value = synthesizeContours(node);
  }

  // strokeGeometry is Figma's pre-expanded outline of a stroke.
  // It should be *filled* with the stroke colour, not stroked again.
  const fills = selectPaintsForFills(isStrokeGeometryRef.value, { strokePaints, fillPaints }, ctx.images);
  const stroke = isStrokeGeometryRef.value ? undefined : convertStrokeToSceneStroke(strokePaints, strokeWeight);

  return {
    type: "path",
    id: getNodeId(node, ctx),
    name: node.name,
    transform: convertTransform(base.transform),
    opacity: base.opacity,
    visible: base.visible,
    effects: convertEffectsToScene(effects),
    contours: contoursRef.value,
    fills,
    stroke,
  };
}

function buildTextNode(node: FigDesignNode, ctx: BuildContext): TextNode {
  const base = extractBaseProps(node);
  const { effects } = extractEffectsProps(node);
  const textData = convertTextNode(node, ctx.blobs);

  return {
    type: "text",
    id: getNodeId(node, ctx),
    name: node.name,
    transform: convertTransform(base.transform),
    opacity: base.opacity,
    visible: base.visible,
    effects: convertEffectsToScene(effects),
    width: node.size?.x ?? 0,
    height: node.size?.y ?? 0,
    glyphContours: textData.glyphContours,
    decorationContours: textData.decorationContours,
    fill: textData.fill,
    textLineLayout: textData.textLineLayout,
  };
}

// =============================================================================
// Recursive Builder
// =============================================================================

function buildNode(node: FigDesignNode, ctx: BuildContext): SceneNode | null {
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
    case "SYMBOL": {
      const childNodes = buildChildren(children, ctx);
      return buildFrameNode(node, ctx, childNodes);
    }

    case "INSTANCE": {
      // Resolve INSTANCE against its SYMBOL/COMPONENT:
      // - Merge visual properties (fills, cornerRadius, effects, etc.)
      // - Inherit children if instance has none
      const resolved = resolveInstance(node, children, ctx);
      const childNodes = buildChildren(resolved.children, ctx);
      return buildFrameNode(resolved.effectiveNode, ctx, childNodes);
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

function buildChildren(children: readonly FigDesignNode[], ctx: BuildContext): SceneNode[] {
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
 * Build a scene graph from FigDesignNode domain objects.
 *
 * @param nodes - Root FigDesignNode nodes to render
 * @param options - Build configuration
 * @returns Format-agnostic scene graph
 */
export function buildSceneGraph(nodes: readonly FigDesignNode[], options: BuildSceneGraphOptions): SceneGraph {
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
    transform: IDENTITY_MATRIX,
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
