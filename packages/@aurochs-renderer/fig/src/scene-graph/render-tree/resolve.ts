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
  CornerRadius,
  ArcData,
} from "../types";

import {
  colorToHex,
  uint8ArrayToBase64,
  matrixToSvgTransform,
  contourToSvgD,
  resolveFill,
  resolveTopFill,
  resolveStroke,
  resolveStrokeResult,
  resolveEffects,
  finalizeGradientDefs,
  type IdGenerator,
  type ResolvedFill,
  type ResolvedFilter,
  type ResolvedStrokeLayer,
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
  ResolvedFillLayer,
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
  radius: CornerRadius | undefined,
  width: number,
  height: number,
): CornerRadius | undefined {
  if (radius === undefined) { return undefined; }
  const max = Math.min(width, height) / 2;
  if (typeof radius === "number") {
    if (radius <= 0) { return undefined; }
    return Math.min(radius, max);
  }
  // Per-corner: clamp each
  const clamped = radius.map((r) => Math.min(r, max)) as unknown as readonly [number, number, number, number];
  if (clamped.every((r) => r === 0)) { return undefined; }
  return clamped;
}

// =============================================================================
// Helper: CornerRadius → uniform number (for SVG rx/ry)
// =============================================================================

/**
 * Extract a uniform number from CornerRadius, or undefined if per-corner.
 * For per-corner radii, returns undefined — the caller must use a path instead.
 */
function uniformRadius(cr: CornerRadius | undefined): number | undefined {
  if (cr === undefined) { return undefined; }
  if (typeof cr === "number") { return cr; }
  return undefined;
}

/**
 * Build a rounded rect SVG path d string for per-corner radii.
 */
function buildRoundedRectPathD(w: number, h: number, radii: readonly [number, number, number, number]): string {
  const [tl, tr, br, bl] = radii;
  const parts = [
    `M ${tl} 0`,
    `L ${w - tr} 0`,
    tr > 0 ? `A ${tr} ${tr} 0 0 1 ${w} ${tr}` : "",
    `L ${w} ${h - br}`,
    br > 0 ? `A ${br} ${br} 0 0 1 ${w - br} ${h}` : "",
    `L ${bl} ${h}`,
    bl > 0 ? `A ${bl} ${bl} 0 0 1 0 ${h - bl}` : "",
    `L 0 ${tl}`,
    tl > 0 ? `A ${tl} ${tl} 0 0 1 ${tl} 0` : "",
    "Z",
  ];
  return parts.filter(Boolean).join(" ");
}

/**
 * Build a ClipPathShape from dimensions and corner radius.
 */
function buildClipShape(
  width: number, height: number, cr: CornerRadius | undefined,
): { kind: "rect"; x: number; y: number; width: number; height: number; rx?: number; ry?: number } | { kind: "path"; d: string } {
  if (cr !== undefined && typeof cr !== "number") {
    return { kind: "path", d: buildRoundedRectPathD(width, height, cr) };
  }
  const r = typeof cr === "number" ? cr : undefined;
  return { kind: "rect", x: 0, y: 0, width, height, rx: r, ry: r };
}

// =============================================================================
// Ellipse Arc → SVG Path
// =============================================================================

/**
 * Generate SVG path d string for an ellipse with arc data.
 *
 * Figma's ArcData:
 * - startingAngle/endingAngle: radians, 0 = 3 o'clock, clockwise
 * - innerRadius: 0..1, ratio of inner to outer radius (0 = pie, >0 = donut)
 *
 * For a full ellipse (startingAngle=0, endingAngle=2π, innerRadius=0),
 * this is not called — the ellipse element is used directly.
 */
function buildEllipseArcPathD(
  cx: number, cy: number, rx: number, ry: number, arc: ArcData,
): string {
  const { startingAngle, endingAngle, innerRadius } = arc;

  // Normalize: Figma uses 0=3 o'clock, clockwise. SVG uses same convention.
  const sweep = endingAngle - startingAngle;
  const isFullCircle = Math.abs(sweep) >= Math.PI * 2 - 1e-6;

  // Outer arc points
  const outerStartX = cx + rx * Math.cos(startingAngle);
  const outerStartY = cy + ry * Math.sin(startingAngle);
  const outerEndX = cx + rx * Math.cos(endingAngle);
  const outerEndY = cy + ry * Math.sin(endingAngle);

  // SVG arc flags
  const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
  const sweepFlag = sweep > 0 ? 1 : 0;

  if (innerRadius <= 0) {
    // Pie slice (no hole)
    if (isFullCircle) {
      // Full ellipse — use two half-arcs to avoid SVG arc degenerate case
      const midAngle = startingAngle + Math.PI;
      const midX = cx + rx * Math.cos(midAngle);
      const midY = cy + ry * Math.sin(midAngle);
      return [
        `M${outerStartX} ${outerStartY}`,
        `A${rx} ${ry} 0 1 ${sweepFlag} ${midX} ${midY}`,
        `A${rx} ${ry} 0 1 ${sweepFlag} ${outerStartX} ${outerStartY}`,
        "Z",
      ].join("");
    }
    return [
      `M${cx} ${cy}`,
      `L${outerStartX} ${outerStartY}`,
      `A${rx} ${ry} 0 ${largeArc} ${sweepFlag} ${outerEndX} ${outerEndY}`,
      "Z",
    ].join("");
  }

  // Donut / ring
  const irx = rx * innerRadius;
  const iry = ry * innerRadius;

  const innerStartX = cx + irx * Math.cos(startingAngle);
  const innerStartY = cy + iry * Math.sin(startingAngle);
  const innerEndX = cx + irx * Math.cos(endingAngle);
  const innerEndY = cy + iry * Math.sin(endingAngle);

  // Reverse sweep for inner arc (draw backwards)
  const reverseSweep = sweepFlag === 1 ? 0 : 1;

  if (isFullCircle) {
    // Full donut — two full arcs (outer CW, inner CCW)
    const midAngle = startingAngle + Math.PI;
    const outerMidX = cx + rx * Math.cos(midAngle);
    const outerMidY = cy + ry * Math.sin(midAngle);
    const innerMidX = cx + irx * Math.cos(midAngle);
    const innerMidY = cy + iry * Math.sin(midAngle);
    return [
      // Outer arc (two halves)
      `M${outerStartX} ${outerStartY}`,
      `A${rx} ${ry} 0 1 ${sweepFlag} ${outerMidX} ${outerMidY}`,
      `A${rx} ${ry} 0 1 ${sweepFlag} ${outerStartX} ${outerStartY}`,
      "Z",
      // Inner arc (two halves, reversed)
      `M${innerStartX} ${innerStartY}`,
      `A${irx} ${iry} 0 1 ${reverseSweep} ${innerMidX} ${innerMidY}`,
      `A${irx} ${iry} 0 1 ${reverseSweep} ${innerStartX} ${innerStartY}`,
      "Z",
    ].join("");
  }

  // Partial donut arc
  return [
    `M${outerStartX} ${outerStartY}`,
    `A${rx} ${ry} 0 ${largeArc} ${sweepFlag} ${outerEndX} ${outerEndY}`,
    `L${innerEndX} ${innerEndY}`,
    `A${irx} ${iry} 0 ${largeArc} ${reverseSweep} ${innerStartX} ${innerStartY}`,
    "Z",
  ].join("");
}

// =============================================================================
// Helper: Stroke Overhang for Clip Expansion
// =============================================================================

/**
 * Compute the maximum stroke overhang (strokeWeight / 2) across children.
 *
 * In SVG, clipPath clips strokes. Figma renders strokes that overhang the
 * frame edge without clipping, so the clip rect must be expanded by the
 * maximum child stroke half-width.
 */
function getMaxChildStrokeOverhang(children: readonly SceneNode[]): number {
  let max = 0;
  for (const child of children) {
    if ("stroke" in child && child.stroke) {
      const overhang = child.stroke.width / 2;
      if (overhang > max) { max = overhang; }
    }
  }
  return max;
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
      blendMode: node.blendMode,
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

/**
 * Resolve all fills in the array as stacked fill layers.
 * Returns undefined if there are fewer than 2 fills (no multi-paint needed).
 * Fills are ordered bottom-to-top (first fill = bottommost layer).
 */
function resolveAllFillLayers(
  fills: readonly Fill[], ids: IdGenerator, defs: RenderDef[],
): readonly ResolvedFillLayer[] | undefined {
  if (fills.length < 2) { return undefined; }

  const layers: ResolvedFillLayer[] = [];
  for (const fill of fills) {
    const resolved = resolveFill(fill, ids);
    collectFillDef(resolved, defs);
    layers.push({
      attrs: resolved.attrs,
      def: resolved.def,
      blendMode: fill.blendMode,
    });
  }
  return layers;
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
    case "angular-gradient":
      defs.push({ type: "angular-gradient", def: resolved.def });
      break;
    case "diamond-gradient":
      defs.push({ type: "diamond-gradient", def: resolved.def });
      break;
    case "image":
      defs.push({ type: "pattern", def: resolved.def });
      break;
  }
}

/**
 * Collect a gradient def from a ResolvedFillDef (used by stroke layers).
 */
function collectGradientDef(def: ResolvedFill["def"], defs: RenderDef[]): void {
  if (!def) { return; }
  // Reuse the same logic as collectFillDef
  collectFillDef({ attrs: { fill: "none" }, def }, defs);
}

/**
 * Resolve stroke with gradient/multi-paint support.
 * Collects gradient defs from stroke layers.
 */
function resolveStrokeWithLayers(
  stroke: import("../types").Stroke, ids: IdGenerator, defs: RenderDef[],
): { attrs: import("../render").ResolvedStrokeAttrs; layers?: readonly ResolvedStrokeLayer[] } {
  const result = resolveStrokeResult(stroke, ids);
  if (result.layers) {
    for (const layer of result.layers) {
      if (layer.gradientDef) {
        collectGradientDef(layer.gradientDef, defs);
      }
    }
  }
  return { attrs: result.attrs, layers: result.layers };
}

// =============================================================================
// Node Resolvers
// =============================================================================

function resolveGroupNode(node: GroupNode, ids: IdGenerator): RenderGroupNode {
  const defs: RenderDef[] = [];
  const { wrapper } = resolveWrapper(node, ids, defs);

  const children = resolveChildren(node.children, ids);

  // Resolve mask if present
  let mask: RenderGroupNode["mask"] | undefined;
  if (node.mask) {
    const maskId = ids.getNextId("mask");
    const resolvedMaskContent = resolveNode(node.mask.maskContent, ids);
    if (resolvedMaskContent) {
      defs.push({ type: "mask", id: maskId, maskContent: resolvedMaskContent });
      mask = { maskAttr: `url(#${maskId})` };
    }
  }

  return {
    type: "group",
    id: node.id,
    wrapper,
    defs,
    source: node,
    children,
    mask,
    canUnwrapSingleChild:
      !wrapper.transform && (node.opacity >= 1) && !wrapper.filterAttr && !mask && !wrapper.blendMode,
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
    const fillLayers = resolveAllFillLayers(node.fills, ids, defs);
    const strokeResult = node.stroke ? resolveStrokeWithLayers(node.stroke, ids, defs) : undefined;
    background = {
      fill: fillResult,
      fillLayers,
      stroke: strokeResult?.attrs,
      strokeLayers: strokeResult?.layers,
    };
  }

  // Child clip path
  let childClipId: string | undefined;
  const children = resolveChildren(node.children, ids);
  if (node.clipsContent && children.length > 0) {
    childClipId = ids.getNextId("clip");
    // Expand clip by max child stroke overhang to prevent stroke clipping.
    // In SVG, clipPath clips everything including strokes. Figma does not
    // clip strokes that overlap the frame edge, so we expand the rect.
    const margin = getMaxChildStrokeOverhang(node.children);
    if (margin > 0) {
      // Expand clip rect and radius by the stroke margin
      const ur = uniformRadius(clampedRadius);
      defs.push({
        type: "clip-path",
        id: childClipId,
        shape: {
          kind: "rect",
          x: -margin,
          y: -margin,
          width: node.width + margin * 2,
          height: node.height + margin * 2,
          rx: ur !== undefined ? ur + margin : undefined,
          ry: ur !== undefined ? ur + margin : undefined,
        },
      });
    } else {
      defs.push({
        type: "clip-path",
        id: childClipId,
        shape: buildClipShape(node.width, node.height, clampedRadius),
      });
    }
  }

  // Finalize gradient coordinates using element size
  finalizeGradientDefs(defs, { width: node.width, height: node.height });

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
  const fillLayers = resolveAllFillLayers(node.fills, ids, defs);
  const strokeResult = node.stroke ? resolveStrokeWithLayers(node.stroke, ids, defs) : undefined;

  finalizeGradientDefs(defs, { width: node.width, height: node.height });
  const needsWrapper = !!(wrapper.transform || node.opacity < 1 || wrapper.filterAttr || defs.length > 0 || fillLayers || strokeResult?.layers);

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
    fillLayers,
    stroke: strokeResult?.attrs,
    strokeLayers: strokeResult?.layers,
    needsWrapper,
    sourceFills: node.fills,
    sourceStroke: node.stroke,
  };
}

function resolveEllipseNode(node: EllipseNode, ids: IdGenerator): RenderEllipseNode | RenderPathNode {
  const defs: RenderDef[] = [];
  const { wrapper } = resolveWrapper(node, ids, defs);
  const fillResult = resolveTopFillResult(node.fills, ids, defs);
  const fillLayers = resolveAllFillLayers(node.fills, ids, defs);
  const strokeResult = node.stroke ? resolveStrokeWithLayers(node.stroke, ids, defs) : undefined;

  const ellipseSize = { width: node.rx * 2, height: node.ry * 2 };

  // If arc data is present, resolve as a path node
  if (node.arcData) {
    const d = buildEllipseArcPathD(node.cx, node.cy, node.rx, node.ry, node.arcData);
    const paths: RenderPathContour[] = [{ d, fillRule: "evenodd" }];
    finalizeGradientDefs(defs, ellipseSize);
    const needsWrapper = !!(
      wrapper.transform || node.opacity < 1 || wrapper.filterAttr || defs.length > 0 || fillLayers || strokeResult?.layers
    );
    return {
      type: "path",
      id: node.id,
      wrapper,
      defs,
      source: node,
      paths,
      fill: fillResult,
      fillLayers,
      stroke: strokeResult?.attrs,
      strokeLayers: strokeResult?.layers,
      needsWrapper,
      sourceContours: [],
      sourceFills: node.fills,
      sourceStroke: node.stroke,
    };
  }

  finalizeGradientDefs(defs, ellipseSize);
  const needsWrapper = !!(wrapper.transform || node.opacity < 1 || wrapper.filterAttr || defs.length > 0 || fillLayers || strokeResult?.layers);

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
    fillLayers,
    stroke: strokeResult?.attrs,
    strokeLayers: strokeResult?.layers,
    needsWrapper,
    sourceFills: node.fills,
    sourceStroke: node.stroke,
  };
}

function resolvePathNode(node: PathNode, ids: IdGenerator): RenderPathNode {
  const defs: RenderDef[] = [];
  const { wrapper } = resolveWrapper(node, ids, defs);
  const fillResult = resolveTopFillResult(node.fills, ids, defs);
  const fillLayers = resolveAllFillLayers(node.fills, ids, defs);
  const strokeResult = node.stroke ? resolveStrokeWithLayers(node.stroke, ids, defs) : undefined;

  const paths: RenderPathContour[] = node.contours.map((contour) => {
    const base: RenderPathContour = {
      d: contourToSvgD(contour),
      fillRule: contour.windingRule !== "nonzero" ? contour.windingRule as "evenodd" : undefined,
    };
    if (contour.fillOverride) {
      const overrideFill = resolveFillResult(contour.fillOverride, ids, defs);
      return { ...base, fillOverride: overrideFill };
    }
    return base;
  });

  if (node.width && node.height) {
    finalizeGradientDefs(defs, { width: node.width, height: node.height });
  }

  const needsWrapper = !!(
    wrapper.transform || node.opacity < 1 || wrapper.filterAttr ||
    defs.length > 0 || paths.length > 1 || fillLayers || strokeResult?.layers
  );

  return {
    type: "path",
    id: node.id,
    wrapper,
    defs,
    source: node,
    paths,
    fill: fillResult,
    fillLayers,
    stroke: strokeResult?.attrs,
    strokeLayers: strokeResult?.layers,
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
