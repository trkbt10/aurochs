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
  finalizeImagePatternDefs,
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
  RenderBackgroundBlur,
} from "./types";

import type { BackgroundBlurEffect } from "../types";

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

/**
 * Extract element bounds from a SceneNode for filter region computation.
 * Returns { x:0, y:0, width, height } — in the node's local coordinate space.
 */
function getNodeBounds(node: SceneNode): { x: number; y: number; width: number; height: number } | undefined {
  switch (node.type) {
    case "frame":
    case "rect":
    case "text":
    case "image":
      return { x: 0, y: 0, width: node.width, height: node.height };
    case "ellipse":
      return { x: 0, y: 0, width: node.rx * 2, height: node.ry * 2 };
    case "path":
      return node.width && node.height ? { x: 0, y: 0, width: node.width, height: node.height } : undefined;
    case "group":
      return undefined; // groups have no intrinsic bounds
  }
}

function resolveWrapper(
  node: SceneNode,
  ids: IdGenerator,
  defs: RenderDef[],
): { wrapper: ResolvedWrapperAttrs; filter?: ResolvedFilter } {
  const elementBounds = getNodeBounds(node);
  const transformStr = matrixToSvgTransform(node.transform);
  const filterResult = resolveEffects(node.effects, ids, elementBounds);

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
// Helper: Finalize defs with element size
// =============================================================================

/**
 * Finalize all size-dependent defs (gradient coordinates and image patterns)
 * for a given element size. Called once per node resolver.
 */
function finalizeDefs(defs: RenderDef[], elementSize: { width: number; height: number }): void {
  finalizeGradientDefs(defs, elementSize);
  finalizeImagePatternDefs(defs, elementSize);
}

// =============================================================================
// Helper: Resolve mask
// =============================================================================

/**
 * Resolve a node's mask (if present) into a RenderMask reference and
 * a RenderMaskDef in the defs array.
 *
 * Masks can be applied to ANY node type (group, frame, rect, ellipse,
 * path, text, image). This helper is called by every node resolver.
 */
function resolveMask(
  node: SceneNode,
  ids: IdGenerator,
  defs: RenderDef[],
): import("./types").RenderMask | undefined {
  if (!node.mask) {
    return undefined;
  }
  const maskId = ids.getNextId("mask");
  const resolvedMaskContent = resolveNode(node.mask.maskContent, ids);
  if (!resolvedMaskContent) {
    return undefined;
  }
  defs.push({ type: "mask", id: maskId, maskContent: resolvedMaskContent });
  return { maskAttr: `url(#${maskId})` };
}

// =============================================================================
// Helper: Resolve background blur
// =============================================================================

/**
 * Extract background blur effect from a node's effects and produce
 * a RenderBackgroundBlur instruction with a clip path.
 *
 * Background blur cannot be expressed as an SVG filter — it requires
 * foreignObject + CSS backdrop-filter, clipped to the node's shape.
 */
function resolveBackgroundBlur(
  effects: readonly import("../types").Effect[],
  bounds: { x: number; y: number; width: number; height: number },
  ids: IdGenerator,
  defs: RenderDef[],
): RenderBackgroundBlur | undefined {
  const bgBlur = effects.find(
    (e): e is BackgroundBlurEffect => e.type === "background-blur",
  );
  if (!bgBlur || bgBlur.radius <= 0) {
    return undefined;
  }

  // Create a clip path for the foreignObject (same shape as the node)
  const clipId = ids.getNextId("bg-blur-clip");
  defs.push({
    type: "clip-path",
    id: clipId,
    shape: { kind: "rect", x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
  });

  return {
    radius: bgBlur.radius,
    clipId,
    bounds,
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
 * Resolve a Stroke to a StrokeRendering instruction.
 *
 * Determines the rendering mode from the stroke data:
 * - layers (multi-paint) → mode:"layers"
 * - strokeAlign INSIDE/OUTSIDE → mode:"masked" (mask def is added)
 * - otherwise → mode:"uniform"
 *
 * Individual stroke weights are handled separately at the node level
 * (Frame/Rect with individualStrokeWeights).
 */
function resolveStrokeRendering(
  stroke: import("../types").Stroke,
  ids: IdGenerator,
  defs: RenderDef[],
  /** Shape for stroke-align mask (required for INSIDE/OUTSIDE) */
  maskShape?: import("./types").ClipPathShape,
): import("./types").StrokeRendering {
  const result = resolveStrokeResult(stroke, ids);

  // Multi-paint stroke layers
  if (result.layers && result.layers.length > 0) {
    for (const layer of result.layers) {
      if (layer.gradientDef) {
        collectGradientDef(layer.gradientDef, defs);
      }
    }
    return { mode: "layers", layers: result.layers };
  }

  // INSIDE/OUTSIDE stroke → masked
  if (result.attrs.strokeAlign && maskShape) {
    const maskId = ids.getNextId("stroke-mask");
    defs.push({ type: "stroke-mask", id: maskId, shape: maskShape });
    return { mode: "masked", attrs: result.attrs, maskId };
  }

  // Uniform stroke
  return { mode: "uniform", attrs: result.attrs };
}

// =============================================================================
// Node Resolvers
// =============================================================================

function resolveGroupNode(node: GroupNode, ids: IdGenerator): RenderGroupNode {
  const defs: RenderDef[] = [];
  const { wrapper } = resolveWrapper(node, ids, defs);

  const children = resolveChildren(node.children, ids);
  const mask = resolveMask(node, ids, defs);

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

  // Background fill and stroke — resolved independently.
  const hasFills = node.fills.length > 0;
  const maskShape = buildClipShape(node.width, node.height, clampedRadius);

  // Determine stroke rendering mode
  let strokeRendering: import("./types").StrokeRendering | undefined;
  if (node.individualStrokeWeights && node.stroke) {
    const result = resolveStrokeResult(node.stroke, ids);
    strokeRendering = {
      mode: "individual",
      sides: node.individualStrokeWeights,
      color: result.attrs.stroke,
      opacity: result.attrs.strokeOpacity,
    };
  } else if (node.stroke) {
    strokeRendering = resolveStrokeRendering(node.stroke, ids, defs, maskShape);
  }

  let background: import("./types").RenderFrameBackground | null = null;
  if (hasFills || strokeRendering) {
    const fillResult = hasFills
      ? resolveFillResult(node.fills[node.fills.length - 1], ids, defs)
      : { attrs: { fill: "none" as const } };
    const fillLayers = hasFills ? resolveAllFillLayers(node.fills, ids, defs) : undefined;

    background = {
      fill: fillResult,
      fillLayers,
      strokeRendering,
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
  finalizeDefs(defs, { width: node.width, height: node.height });

  // Background blur (foreignObject + backdrop-filter, separate from filter pipeline)
  const backgroundBlur = resolveBackgroundBlur(
    node.effects, { x: 0, y: 0, width: node.width, height: node.height }, ids, defs,
  );

  const mask = resolveMask(node, ids, defs);

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
    backgroundBlur,
    mask,
  };
}

function resolveRectNode(node: RectNode, ids: IdGenerator): RenderRectNode {
  const defs: RenderDef[] = [];
  const { wrapper } = resolveWrapper(node, ids, defs);
  const clampedRadius = clampRadius(node.cornerRadius, node.width, node.height);
  const fillResult = resolveTopFillResult(node.fills, ids, defs);
  const fillLayers = resolveAllFillLayers(node.fills, ids, defs);
  const maskShape = buildClipShape(node.width, node.height, clampedRadius);
  const strokeRendering = node.stroke
    ? resolveStrokeRendering(node.stroke, ids, defs, maskShape)
    : undefined;

  finalizeDefs(defs, { width: node.width, height: node.height });

  const backgroundBlur = resolveBackgroundBlur(
    node.effects, { x: 0, y: 0, width: node.width, height: node.height }, ids, defs,
  );

  const mask = resolveMask(node, ids, defs);
  const needsWrapper = !!(wrapper.transform || node.opacity < 1 || wrapper.filterAttr || defs.length > 0 || fillLayers || strokeRendering || backgroundBlur || mask);

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
    strokeRendering,
    needsWrapper,
    sourceFills: node.fills,
    sourceStroke: node.stroke,
    backgroundBlur,
    mask,
  };
}

function resolveEllipseNode(node: EllipseNode, ids: IdGenerator): RenderEllipseNode | RenderPathNode {
  const defs: RenderDef[] = [];
  const { wrapper } = resolveWrapper(node, ids, defs);
  const fillResult = resolveTopFillResult(node.fills, ids, defs);
  const fillLayers = resolveAllFillLayers(node.fills, ids, defs);
  const strokeRendering = node.stroke ? resolveStrokeRendering(node.stroke, ids, defs) : undefined;

  const ellipseSize = { width: node.rx * 2, height: node.ry * 2 };

  const backgroundBlur = resolveBackgroundBlur(
    node.effects, { x: 0, y: 0, ...ellipseSize }, ids, defs,
  );
  const mask = resolveMask(node, ids, defs);

  // If arc data is present, resolve as a path node
  if (node.arcData) {
    const d = buildEllipseArcPathD(node.cx, node.cy, node.rx, node.ry, node.arcData);
    const paths: RenderPathContour[] = [{ d, fillRule: "evenodd" }];
    finalizeDefs(defs, ellipseSize);
    const needsWrapper = !!(
      wrapper.transform || node.opacity < 1 || wrapper.filterAttr || defs.length > 0 || fillLayers || strokeRendering || backgroundBlur || mask
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
      strokeRendering,
      needsWrapper,
      sourceContours: [],
      sourceFills: node.fills,
      sourceStroke: node.stroke,
      backgroundBlur,
      mask,
    };
  }

  finalizeDefs(defs, ellipseSize);
  const needsWrapper = !!(wrapper.transform || node.opacity < 1 || wrapper.filterAttr || defs.length > 0 || fillLayers || strokeRendering || backgroundBlur || mask);

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
    strokeRendering,
    needsWrapper,
    sourceFills: node.fills,
    sourceStroke: node.stroke,
    backgroundBlur,
    mask,
  };
}

function resolvePathNode(node: PathNode, ids: IdGenerator): RenderPathNode {
  const defs: RenderDef[] = [];
  const { wrapper } = resolveWrapper(node, ids, defs);
  const fillResult = resolveTopFillResult(node.fills, ids, defs);
  const fillLayers = resolveAllFillLayers(node.fills, ids, defs);
  const strokeRendering = node.stroke ? resolveStrokeRendering(node.stroke, ids, defs) : undefined;

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

  const pathSize = node.width && node.height ? { width: node.width, height: node.height } : undefined;
  if (pathSize) {
    finalizeDefs(defs, pathSize);
  }

  const backgroundBlur = pathSize
    ? resolveBackgroundBlur(node.effects, { x: 0, y: 0, ...pathSize }, ids, defs)
    : undefined;
  const mask = resolveMask(node, ids, defs);

  const needsWrapper = !!(
    wrapper.transform || node.opacity < 1 || wrapper.filterAttr ||
    defs.length > 0 || paths.length > 1 || fillLayers || strokeRendering || backgroundBlur || mask
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
    strokeRendering,
    needsWrapper,
    sourceContours: node.contours,
    sourceFills: node.fills,
    sourceStroke: node.stroke,
    backgroundBlur,
    mask,
  };
}

function resolveTextNode(node: TextNode, ids: IdGenerator): RenderTextNode {
  const defs: RenderDef[] = [];
  const { wrapper } = resolveWrapper(node, ids, defs);
  const fillColor = colorToHex(node.fill.color);
  const fillOpacity = node.fill.opacity < 1 ? node.fill.opacity : undefined;

  // Clip text to bounding box when textAutoResize is NONE/TRUNCATE,
  // or when textTruncation is ENDING (text overflows with ellipsis)
  const needsClip = node.textAutoResize === "NONE" || node.textAutoResize === "TRUNCATE"
    || node.textTruncation === "ENDING";
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

  const mask = resolveMask(node, ids, defs);

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
    textTruncation: node.textTruncation,
    leadingTrim: node.leadingTrim,
    hyperlink: node.hyperlink,
    content,
    sourceGlyphContours: node.glyphContours,
    sourceDecorationContours: node.decorationContours,
    sourceFillColor: node.fill.color,
    sourceFillOpacity: node.fill.opacity,
    sourceTextLineLayout: node.textLineLayout,
    sourceTextAutoResize: node.textAutoResize,
    mask,
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

  const mask = resolveMask(node, ids, defs);
  const needsWrapper = !!(wrapper.transform || node.opacity < 1 || mask);

  return {
    type: "image",
    id: node.id,
    wrapper,
    defs,
    source: node,
    width: node.width,
    height: node.height,
    dataUri,
    preserveAspectRatio: resolvePreserveAspectRatio(node.scaleMode),
    needsWrapper,
    sourceImageRef: node.imageRef,
    sourceData: node.data,
    sourceMimeType: node.mimeType,
    sourceScaleMode: node.scaleMode,
    mask,
  };
}

/**
 * Convert Figma scaleMode to SVG preserveAspectRatio.
 */
function resolvePreserveAspectRatio(scaleMode: string): string {
  switch (scaleMode) {
    case "FIT":
      return "xMidYMid meet";
    case "FILL":
    case "CROP":
      return "xMidYMid slice";
    case "TILE":
      return "none";
    case "STRETCH":
      return "none";
    default:
      return "xMidYMid slice";
  }
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
