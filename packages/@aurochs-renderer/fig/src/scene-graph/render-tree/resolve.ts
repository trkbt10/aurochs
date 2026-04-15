/**
 * @file RenderTree resolver — SceneGraph → RenderTree
 *
 * Performs all rendering decisions and attribute resolution in a single
 * traversal. The output RenderTree is fully resolved: backends only format.
 *
 * Uses scene-graph/render/ as the SoT for all SVG attribute resolution.
 */

import type {
  SceneGraph,
  SceneNode,
  GroupNode,
  FrameNode,
  RectNode,
  EllipseNode,
  PathNode,
  TextNode,
  ImageNode,
  Fill,
} from "../types";

import {
  colorToHex,
  uint8ArrayToBase64,
  matrixToSvgTransform,
  contourToSvgD,
  resolveFill,
  resolveTopFill,
  resolveStroke,
  resolveEffects,
  type IdGenerator,
  type ResolvedFill,
  type ResolvedFilter,
} from "../render";

import type {
  RenderTree,
  RenderNode,
  RenderGroupNode,
  RenderFrameNode,
  RenderRectNode,
  RenderEllipseNode,
  RenderPathNode,
  RenderTextNode,
  RenderImageNode,
  RenderDef,
  ResolvedWrapperAttrs,
  ResolvedFillResult,
  RenderFrameBackground,
  RenderPathContour,
} from "./types";

// =============================================================================
// ID Generator
// =============================================================================

function createIdGenerator(): IdGenerator {
  // eslint-disable-next-line no-restricted-syntax -- mutable closure counter for sequential ID generation
  let counter = 0;
  return {
    getNextId(prefix: string): string {
      return `${prefix}-${counter++}`;
    },
  };
}

// =============================================================================
// Corner radius clamping
// =============================================================================

function clampRadius(
  radius: number | undefined,
  width: number,
  height: number,
): number | undefined {
  if (!radius || radius <= 0) { return undefined; }
  return Math.min(radius, Math.min(width, height) / 2);
}

// =============================================================================
// Helper: Resolve wrapper attributes
// =============================================================================

function resolveWrapper(
  node: SceneNode,
  ids: IdGenerator,
  defs: RenderDef[],
): { wrapper: ResolvedWrapperAttrs; filter?: ResolvedFilter } {
  const transformStr = matrixToSvgTransform(node.transform);
  const filterResult = resolveEffects(node.effects, ids);

  if (filterResult) {
    defs.push({ type: "filter", filter: filterResult });
  }

  return {
    wrapper: {
      transform: transformStr,
      opacity: node.opacity < 1 ? node.opacity : undefined,
      filterAttr: filterResult?.filterAttr,
    },
    filter: filterResult ?? undefined,
  };
}

// =============================================================================
// Helper: Resolve fill and collect defs
// =============================================================================

function resolveFillResult(fill: Fill, ids: IdGenerator, defs: RenderDef[]): ResolvedFillResult {
  const resolved = resolveFill(fill, ids);
  collectFillDef(resolved, defs);
  return {
    attrs: resolved.attrs,
    def: resolved.def,
  };
}

function resolveTopFillResult(fills: readonly Fill[], ids: IdGenerator, defs: RenderDef[]): ResolvedFillResult {
  const resolved = resolveTopFill(fills, ids);
  collectFillDef(resolved, defs);
  return {
    attrs: resolved.attrs,
    def: resolved.def,
  };
}

function collectFillDef(resolved: ResolvedFill, defs: RenderDef[]): void {
  if (!resolved.def) { return; }
  switch (resolved.def.type) {
    case "linear-gradient":
      defs.push({ type: "linear-gradient", def: resolved.def });
      break;
    case "radial-gradient":
      defs.push({ type: "radial-gradient", def: resolved.def });
      break;
    case "image":
      defs.push({ type: "pattern", def: resolved.def });
      break;
  }
}

// =============================================================================
// Node Resolvers
// =============================================================================

function resolveGroupNode(node: GroupNode, ids: IdGenerator): RenderGroupNode {
  const defs: RenderDef[] = [];
  const { wrapper } = resolveWrapper(node, ids, defs);

  const children = resolveChildren(node.children, ids);

  return {
    type: "group",
    id: node.id,
    wrapper,
    defs,
    source: node,
    children,
    canUnwrapSingleChild:
      !wrapper.transform && (node.opacity >= 1) && !wrapper.filterAttr,
  };
}

function resolveFrameNode(node: FrameNode, ids: IdGenerator): RenderFrameNode {
  const defs: RenderDef[] = [];
  const { wrapper } = resolveWrapper(node, ids, defs);
  const clampedRadius = clampRadius(node.cornerRadius, node.width, node.height);

  // Background fill
  let background: RenderFrameBackground | null = null;
  if (node.fills.length > 0) {
    const lastFill = node.fills[node.fills.length - 1];
    const fillResult = resolveFillResult(lastFill, ids, defs);
    const strokeAttrs = node.stroke ? resolveStroke(node.stroke) : undefined;
    background = { fill: fillResult, stroke: strokeAttrs };
  }

  // Child clip path
  let childClipId: string | undefined;
  const children = resolveChildren(node.children, ids);
  if (node.clipsContent && children.length > 0) {
    childClipId = ids.getNextId("clip");
    defs.push({
      type: "clip-path",
      id: childClipId,
      shape: {
        kind: "rect",
        x: 0,
        y: 0,
        width: node.width,
        height: node.height,
        rx: clampedRadius,
        ry: clampedRadius,
      },
    });
  }

  return {
    type: "frame",
    id: node.id,
    wrapper,
    defs,
    source: node,
    background,
    children,
    childClipId,
    width: node.width,
    height: node.height,
    cornerRadius: clampedRadius,
  };
}

function resolveRectNode(node: RectNode, ids: IdGenerator): RenderRectNode {
  const defs: RenderDef[] = [];
  const { wrapper } = resolveWrapper(node, ids, defs);
  const clampedRadius = clampRadius(node.cornerRadius, node.width, node.height);
  const fillResult = resolveTopFillResult(node.fills, ids, defs);
  const strokeAttrs = node.stroke ? resolveStroke(node.stroke) : undefined;

  const needsWrapper = !!(wrapper.transform || node.opacity < 1 || wrapper.filterAttr || defs.length > 0);

  return {
    type: "rect",
    id: node.id,
    wrapper,
    defs,
    source: node,
    width: node.width,
    height: node.height,
    cornerRadius: clampedRadius,
    fill: fillResult,
    stroke: strokeAttrs,
    needsWrapper,
    sourceFills: node.fills,
    sourceStroke: node.stroke,
  };
}

function resolveEllipseNode(node: EllipseNode, ids: IdGenerator): RenderEllipseNode {
  const defs: RenderDef[] = [];
  const { wrapper } = resolveWrapper(node, ids, defs);
  const fillResult = resolveTopFillResult(node.fills, ids, defs);
  const strokeAttrs = node.stroke ? resolveStroke(node.stroke) : undefined;

  const needsWrapper = !!(wrapper.transform || node.opacity < 1 || wrapper.filterAttr || defs.length > 0);

  return {
    type: "ellipse",
    id: node.id,
    wrapper,
    defs,
    source: node,
    cx: node.cx,
    cy: node.cy,
    rx: node.rx,
    ry: node.ry,
    fill: fillResult,
    stroke: strokeAttrs,
    needsWrapper,
    sourceFills: node.fills,
    sourceStroke: node.stroke,
  };
}

function resolvePathNode(node: PathNode, ids: IdGenerator): RenderPathNode {
  const defs: RenderDef[] = [];
  const { wrapper } = resolveWrapper(node, ids, defs);
  const fillResult = resolveTopFillResult(node.fills, ids, defs);
  const strokeAttrs = node.stroke ? resolveStroke(node.stroke) : undefined;

  const paths: RenderPathContour[] = node.contours.map((contour) => ({
    d: contourToSvgD(contour),
    fillRule: contour.windingRule !== "nonzero" ? contour.windingRule as "evenodd" : undefined,
  }));

  const needsWrapper = !!(
    wrapper.transform || node.opacity < 1 || wrapper.filterAttr ||
    defs.length > 0 || paths.length > 1
  );

  return {
    type: "path",
    id: node.id,
    wrapper,
    defs,
    source: node,
    paths,
    fill: fillResult,
    stroke: strokeAttrs,
    needsWrapper,
    sourceContours: node.contours,
    sourceFills: node.fills,
    sourceStroke: node.stroke,
  };
}

function resolveTextNode(node: TextNode, ids: IdGenerator): RenderTextNode {
  const defs: RenderDef[] = [];
  const { wrapper } = resolveWrapper(node, ids, defs);
  const fillColor = colorToHex(node.fill.color);
  const fillOpacity = node.fill.opacity < 1 ? node.fill.opacity : undefined;

  // Clip text to bounding box when textAutoResize is NONE or TRUNCATE
  const needsClip = node.textAutoResize === "NONE" || node.textAutoResize === "TRUNCATE";
  let textClipId: string | undefined;
  if (needsClip) {
    textClipId = ids.getNextId("text-clip");
    defs.push({
      type: "clip-path",
      id: textClipId,
      shape: {
        kind: "rect",
        x: 0,
        y: 0,
        width: node.width,
        height: node.height,
      },
    });
  }

  // Determine content mode
  let content: RenderTextNode["content"];
  if (node.glyphContours && node.glyphContours.length > 0) {
    const allD: string[] = [];
    for (const contour of node.glyphContours) {
      allD.push(contourToSvgD(contour));
    }
    if (node.decorationContours) {
      for (const contour of node.decorationContours) {
        allD.push(contourToSvgD(contour));
      }
    }
    content = { mode: "glyphs", d: allD.join("") };
  } else if (node.textLineLayout) {
    content = { mode: "lines", layout: node.textLineLayout };
  } else {
    // Empty text — use empty glyph content
    content = { mode: "glyphs", d: "" };
  }

  return {
    type: "text",
    id: node.id,
    wrapper,
    defs,
    source: node,
    width: node.width,
    height: node.height,
    fillColor,
    fillOpacity,
    textClipId,
    content,
    sourceGlyphContours: node.glyphContours,
    sourceDecorationContours: node.decorationContours,
    sourceFillColor: node.fill.color,
    sourceFillOpacity: node.fill.opacity,
    sourceTextLineLayout: node.textLineLayout,
    sourceTextAutoResize: node.textAutoResize,
  };
}

function resolveImageNode(node: ImageNode, ids: IdGenerator): RenderImageNode {
  const defs: RenderDef[] = [];
  const { wrapper } = resolveWrapper(node, ids, defs);

  let dataUri: string | undefined;
  if (node.data && node.data.length > 0) {
    const base64 = uint8ArrayToBase64(node.data);
    dataUri = `data:${node.mimeType};base64,${base64}`;
  }

  const needsWrapper = !!(wrapper.transform || node.opacity < 1);

  return {
    type: "image",
    id: node.id,
    wrapper,
    defs,
    source: node,
    width: node.width,
    height: node.height,
    dataUri,
    needsWrapper,
    sourceImageRef: node.imageRef,
    sourceData: node.data,
    sourceMimeType: node.mimeType,
    sourceScaleMode: node.scaleMode,
  };
}

// =============================================================================
// Node Dispatch
// =============================================================================

function resolveNode(node: SceneNode, ids: IdGenerator): RenderNode | null {
  if (!node.visible) {
    return null;
  }

  switch (node.type) {
    case "group":
      return resolveGroupNode(node, ids);
    case "frame":
      return resolveFrameNode(node, ids);
    case "rect":
      return resolveRectNode(node, ids);
    case "ellipse":
      return resolveEllipseNode(node, ids);
    case "path":
      return resolvePathNode(node, ids);
    case "text":
      return resolveTextNode(node, ids);
    case "image":
      return resolveImageNode(node, ids);
    default: {
      // Exhaustiveness check
      const _exhaustive: never = node;
      void _exhaustive;
      return null;
    }
  }
}

function resolveChildren(children: readonly SceneNode[], ids: IdGenerator): RenderNode[] {
  const result: RenderNode[] = [];
  for (const child of children) {
    const resolved = resolveNode(child, ids);
    if (resolved) {
      result.push(resolved);
    }
  }
  return result;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Resolve a SceneGraph into a fully-resolved RenderTree.
 *
 * All rendering decisions (visibility filtering, attribute resolution,
 * clip path generation, def collection) are performed here. Backends
 * only format the result.
 */
export function resolveRenderTree(sceneGraph: SceneGraph): RenderTree {
  const ids = createIdGenerator();
  const children = resolveChildren(sceneGraph.root.children, ids);

  return {
    width: sceneGraph.width,
    height: sceneGraph.height,
    children,
  };
}
