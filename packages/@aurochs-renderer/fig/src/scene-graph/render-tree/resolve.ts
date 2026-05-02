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
  Stroke,
} from "../types";

import {
  colorToHex,
  uint8ArrayToBase64,
  matrixToSvgTransform,
  contourToSvgD,
  resolveFill,
  resolveTopFill,
  resolveStrokeResult,
  resolveEffects,
  finalizeGradientDefs,
  finalizeImagePatternDefs,
  type IdGenerator,
  type ResolvedFill,
  type ResolvedFilter,
} from "../render";
import { computePathContoursBbox } from "../path-bbox";
import { buildEffectStack, type ResolvedEffectStack } from "../render/effect-stack";
import { buildRoundedRectPathD } from "../render/rounded-rect-path";

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
  RenderMask,
  ClipPathShape,
  StrokeShape,
  StrokeRendering,
} from "./types";

// =============================================================================
// ID Generator
// =============================================================================

/**
 * Module-level monotonic counter — every `createIdGenerator()` call gets a
 * distinct `generation` prefix so IDs never collide across renders or
 * across concurrently-mounted `FigSceneRenderer` instances in the same DOM.
 *
 * Why this matters: SVG `<mask>` / `<clipPath>` / `<filter>` references use
 * a document-wide namespace (`url(#stroke-mask-0)` resolves against the
 * whole HTML document, not the containing SVG). Two scene renderers that
 * each produced `stroke-mask-0` would collide, and which definition wins
 * for a given reference is undefined — producing the observed
 * zoom-alternating clip-regression on fig-editor (Link 190:3213 and any
 * other ELLIPSE-with-OUTSIDE-stroke on Cover / Components pages).
 *
 * Keeping the `generation` portion out of the node tree data (it's only
 * assigned at resolve time) means the SceneGraph itself stays pure.
 */
// eslint-disable-next-line no-restricted-syntax -- module-scoped counter guarantees unique IDs across renderer instances
let resolverGeneration = 0;

function createIdGenerator(): IdGenerator {
  const generation = resolverGeneration++;
  // eslint-disable-next-line no-restricted-syntax -- per-generation counter for ID sequencing
  let counter = 0;
  return {
    getNextId(prefix: string): string {
      return `${prefix}-g${generation}-${counter++}`;
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
  // Per-corner: clamp each — explicit tuple to avoid `as unknown as`
  const clamped: readonly [number, number, number, number] = [
    Math.min(radius[0], max),
    Math.min(radius[1], max),
    Math.min(radius[2], max),
    Math.min(radius[3], max),
  ];
  if (clamped[0] === 0 && clamped[1] === 0 && clamped[2] === 0 && clamped[3] === 0) { return undefined; }
  return clamped;
}

// =============================================================================
// Helper: CornerRadius → uniform number (for SVG rx/ry)
// =============================================================================

/**
 * Build a ClipPathShape from dimensions and corner radius.
 *
 * Rounded rects emit a `<path>` with cubic Bézier corners (matching
 * Figma's exporter form `M 24 0 L w-24 0 C ... 24` exactly). resvg-js
 * rasterises `<path>` clip-paths at the same sub-pixel positions as
 * the equivalently-shaped fill path; using `<rect rx>` for clipPath
 * produces a half-pixel mismatch at the rounded corner versus our
 * Bézier-based fill, visible as a 1-pixel-wide red sliver in diff
 * tests. Sharp-cornered rects keep `<rect>` because there's no AA cost.
 */
function buildClipShape(
  width: number, height: number, cr: CornerRadius | undefined,
): { kind: "rect"; x: number; y: number; width: number; height: number; rx?: number; ry?: number } | { kind: "path"; d: string } {
  if (cr !== undefined && typeof cr !== "number") {
    return { kind: "path", d: buildRoundedRectPathD(width, height, cr) };
  }
  const r = typeof cr === "number" ? cr : undefined;
  if (r !== undefined && r > 0) {
    return { kind: "path", d: buildRoundedRectPathD(width, height, [r, r, r, r]) };
  }
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
): { wrapper: ResolvedWrapperAttrs; effectStack: ResolvedEffectStack; filter?: ResolvedFilter } {
  const elementBounds = getNodeBounds(node);
  const transformStr = matrixToSvgTransform(node.transform);
  const effectStack = buildEffectStack(node.effects);
  const filterResult = resolveEffects(effectStack.foregroundEffects, ids, elementBounds);

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
    effectStack,
    filter: filterResult ?? undefined,
  };
}

// =============================================================================
// Helper: Finalize defs with element size
// =============================================================================

/**
 * Finalize all size-dependent defs (gradient coordinates and image patterns)
 * for a given element bounding box. Called once per node resolver.
 *
 * `elementBounds` may be the legacy `{width, height}` shape (origin
 * (0, 0), used by FRAME / RECTANGLE / ELLIPSE / TEXT) or the bbox
 * shape `{x, y, width, height}` (origin at the path's bbox top-left,
 * used by VECTOR — Figma encodes gradient endpoints relative to that
 * bbox so without (x, y) the gradient slides off the path).
 */
function finalizeDefs(
  defs: RenderDef[],
  elementBounds: { readonly x?: number; readonly y?: number; readonly width: number; readonly height: number },
): void {
  finalizeGradientDefs(defs, elementBounds);
  // Image patterns and angular/diamond gradients still operate on
  // `{width, height}` only — they tile/centre on the node's own
  // (0, 0) origin and do not need the bbox offset.
  const sizeOnly = { width: elementBounds.width, height: elementBounds.height };
  finalizeImagePatternDefs(defs, sizeOnly);
  finalizeAngularDiamondGradientDefs(defs, sizeOnly);
}

/**
 * Stamp each angular/diamond gradient def with the concrete element
 * size. The SVG emitter needs pixel dimensions to place the
 * `<foreignObject>` that hosts the CSS conic-gradient; pattern
 * `objectBoundingBox` units don't propagate into foreignObject's
 * x/y/width/height, so without pixel dimensions the gradient
 * collapses to a 1×1-pixel region and renders invisibly.
 */
function finalizeAngularDiamondGradientDefs(
  defs: RenderDef[],
  elementSize: { width: number; height: number },
): void {
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    if (def.type === "angular-gradient") {
      defs[i] = {
        type: "angular-gradient",
        def: { ...def.def, elementWidth: elementSize.width, elementHeight: elementSize.height },
      };
    } else if (def.type === "diamond-gradient") {
      defs[i] = {
        type: "diamond-gradient",
        def: { ...def.def, elementWidth: elementSize.width, elementHeight: elementSize.height },
      };
    }
  }
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
): RenderMask | undefined {
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
 *
 * The `shape` parameter controls the clip geometry. When omitted we
 * fall back to a rectangle matching `bounds` — this matches the legacy
 * behaviour but produces a square blur region for non-rectangular
 * nodes (e.g. an ELLIPSE Container would look square because the blur
 * bleeds outside the circular silhouette). Callers for ellipse / path
 * nodes pass a shape matching the silhouette so the backdrop-filter
 * is clipped to the visible outline.
 */
function resolveBackgroundBlur(
  effectStack: ResolvedEffectStack,
  bounds: { x: number; y: number; width: number; height: number },
  ids: IdGenerator,
  defs: RenderDef[],
  shape?: ClipPathShape,
): RenderBackgroundBlur | undefined {
  const bgBlur = effectStack.backgroundBlur;
  if (!bgBlur || bgBlur.radius <= 0) {
    return undefined;
  }

  // Create a clip path for the foreignObject (same shape as the node)
  const clipId = ids.getNextId("bg-blur-clip");
  const clipShape: ClipPathShape = shape ?? {
    kind: "rect", x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height,
  };
  defs.push({
    type: "clip-path",
    id: clipId,
    shape: clipShape,
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
    // Carry paint-level blendMode through so single-fill rendering
    // (formatRectShape / formatEllipseShape) can emit the correct
    // `mix-blend-mode` style. Multi-fill already flows through
    // `ResolvedFillLayer`'s own blendMode.
    blendMode: fill.blendMode,
  };
}

function resolveTopFillResult(fills: readonly Fill[], ids: IdGenerator, defs: RenderDef[]): ResolvedFillResult {
  const resolved = resolveTopFill(fills, ids);
  collectFillDef(resolved, defs);
  // When topmost fill gets used here (single-visible path), preserve
  // its paint-level blend mode too — the fills array may still have
  // only one visible entry but that entry could be e.g. OVERLAY.
  const topVisible = fills.find((f) => f.opacity !== 0);
  return {
    attrs: resolved.attrs,
    def: resolved.def,
    blendMode: topVisible?.blendMode,
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
  stroke: Stroke,
  ids: IdGenerator,
  defs: RenderDef[],
  /** Shape descriptor for non-uniform stroke modes */
  shape: StrokeShape,
  /** Clip shape for stroke-align mask (required for INSIDE/OUTSIDE) */
  maskClipShape?: ClipPathShape,
): StrokeRendering {
  const result = resolveStrokeResult(stroke, ids);

  // Collect gradient defs from any layer up-front so both the "layers"
  // path and the "masked" path below see the <linearGradient> / mask def
  // in the parent's defs array.
  if (result.layers) {
    for (const layer of result.layers) {
      if (layer.gradientDef) {
        collectGradientDef(layer.gradientDef, defs);
      }
    }
  }

  // True multi-paint stroke (two or more visible paints stacked): render
  // as layered <use> elements so each paint gets its own blend mode. One
  // layer is not "multi-paint" — it's a single paint that happens to
  // need a gradient def, and should still participate in the strokeAlign
  // mask machinery below.
  if (result.layers && result.layers.length >= 2) {
    return { mode: "layers", layers: result.layers, shape };
  }

  // INSIDE/OUTSIDE stroke → masked. Single-layer gradient strokes flow
  // through here too, which means the stroke attrs already point at the
  // gradient url(#lg-N) from the collected def above.
  if (result.attrs.strokeAlign && maskClipShape) {
    const maskId = ids.getNextId("stroke-mask");
    defs.push({ type: "stroke-mask", id: maskId, shape: maskClipShape, strokeAlign: result.attrs.strokeAlign });
    // The single-layer branch in resolveStrokeResult forwards a layer with
    // its paint blendMode when the paint is a non-default blend (Passport
    // Flag's white SOFT_LIGHT outline with strokeAlign=INSIDE). Pull that
    // blendMode through onto the masked result so the formatter can wrap
    // the stroke draw in `style="mix-blend-mode:..."` — without this
    // pass-through the masked path would silently discard the blend.
    const layerBlendMode = result.layers && result.layers.length === 1 ? result.layers[0].blendMode : undefined;
    return { mode: "masked", attrs: result.attrs, maskId, shape, blendMode: layerBlendMode };
  }

  // Single-layer gradient without strokeAlign — emit as a regular
  // "layers" rendering so the gradient fill is still attached to the
  // stroke. Without this branch a single-layer gradient with CENTER
  // alignment would fall through to "uniform" and lose the gradient.
  if (result.layers && result.layers.length === 1) {
    return { mode: "layers", layers: result.layers, shape };
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
  const { wrapper, effectStack } = resolveWrapper(node, ids, defs);
  const clampedRadius = clampRadius(node.cornerRadius, node.width, node.height);

  // Background fill and stroke — resolved independently.
  const hasFills = node.fills.length > 0;
  const maskShape = buildClipShape(node.width, node.height, clampedRadius);

  // Determine stroke rendering mode
  let strokeRendering: StrokeRendering | undefined;
  if (node.individualStrokeWeights && node.stroke) {
    const result = resolveStrokeResult(node.stroke, ids);
    // When the stroke paint is a gradient, collect its <linearGradient>
    // / <radialGradient> def into the parent's defs so the url(#lg-N)
    // reference in `result.attrs.stroke` actually resolves. Without
    // this, a FRAME with individualStrokeWeights + gradient stroke
    // renders as `stroke="url(#lg-5)"` with no matching def — the
    // browser falls back to the default (black) or nothing at all,
    // depending on the engine.
    if (result.layers) {
      for (const layer of result.layers) {
        if (layer.gradientDef) {
          collectGradientDef(layer.gradientDef, defs);
        }
      }
    }
    // Per-side strokes carry a single corner radius for clipping the
    // sides to the rounded perimeter. When the frame's corners are
    // non-uniform we use the max corner: this still keeps each side's
    // drawn area inside the union of all four corner arcs (no over-
    // paint outside the rounded rect) at the cost of slightly under-
    // clipping the smaller corners — acceptable approximation.
    const cornerScalar = typeof clampedRadius === "number"
      ? clampedRadius
      : clampedRadius
        ? Math.max(clampedRadius[0], clampedRadius[1], clampedRadius[2], clampedRadius[3])
        : 0;
    strokeRendering = {
      mode: "individual",
      sides: node.individualStrokeWeights,
      color: result.attrs.stroke,
      opacity: result.attrs.strokeOpacity,
      width: node.width,
      height: node.height,
      cornerRadius: cornerScalar > 0 ? cornerScalar : undefined,
      strokeAlign: result.attrs.strokeAlign,
    };
  } else if (node.stroke) {
    const strokeShape: StrokeShape = { kind: "rect", width: node.width, height: node.height, cornerRadius: clampedRadius };
    strokeRendering = resolveStrokeRendering(node.stroke, ids, defs, strokeShape, maskShape);
  }

  let background: RenderFrameBackground | null = null;
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
    // The clip-path follows the frame's exact geometry — no expansion.
    // Figma's SVG exporter uses an unexpanded clip-path even when child
    // strokes would naturally overhang; the resulting half-pixel stroke
    // truncation matches Figma's canvas rendering. Expanding the clip
    // by the child stroke half-width was tried previously, but it shifts
    // the rounded-corner AA outward by half a pixel, producing a 0.10%
    // diff against Figma's exporter at corners — much larger than the
    // ~0% impact of letting boundary strokes get half-clipped.
    defs.push({
      type: "clip-path",
      id: childClipId,
      shape: buildClipShape(node.width, node.height, clampedRadius),
    });
  }

  // Finalize gradient coordinates using element size
  finalizeDefs(defs, { width: node.width, height: node.height });

  // Background blur (foreignObject + backdrop-filter, separate from filter
  // pipeline). Pass the FRAME's rounded-rect shape so the backdrop clip
  // honours cornerRadius (otherwise a rounded FRAME with background blur
  // would show a square blur area bleeding past the rounded corners).
  const backgroundBlur = resolveBackgroundBlur(
    effectStack, { x: 0, y: 0, width: node.width, height: node.height }, ids, defs,
    maskShape,
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
    // Surface source fills/stroke at the RenderNode level so WebGL / other
    // backends never discriminate `node.source.type` — consistent with
    // RenderRectNode / RenderEllipseNode.
    sourceFills: node.fills,
    sourceStroke: node.stroke,
  };
}

function resolveRectNode(node: RectNode, ids: IdGenerator): RenderRectNode {
  const defs: RenderDef[] = [];
  const { wrapper, effectStack } = resolveWrapper(node, ids, defs);
  const clampedRadius = clampRadius(node.cornerRadius, node.width, node.height);
  const fillResult = resolveTopFillResult(node.fills, ids, defs);
  const fillLayers = resolveAllFillLayers(node.fills, ids, defs);
  const maskClipShape = buildClipShape(node.width, node.height, clampedRadius);
  const rectStrokeShape: StrokeShape = { kind: "rect", width: node.width, height: node.height, cornerRadius: clampedRadius };
  const strokeRendering = node.stroke
    ? resolveStrokeRendering(node.stroke, ids, defs, rectStrokeShape, maskClipShape)
    : undefined;

  finalizeDefs(defs, { width: node.width, height: node.height });

  const backgroundBlur = resolveBackgroundBlur(
    effectStack, { x: 0, y: 0, width: node.width, height: node.height }, ids, defs,
    maskClipShape,
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
  const { wrapper, effectStack } = resolveWrapper(node, ids, defs);
  const fillResult = resolveTopFillResult(node.fills, ids, defs);
  const fillLayers = resolveAllFillLayers(node.fills, ids, defs);
  const ellipseStrokeShape: StrokeShape = { kind: "ellipse", cx: node.cx, cy: node.cy, rx: node.rx, ry: node.ry };
  // INSIDE/OUTSIDE stroke needs an ellipse-shaped mask to clip the doubled
  // stroke width to the correct half. Without this, an INSIDE stroke bleeds
  // outside the ellipse (the user's PFP case — avatar stroke appeared
  // to clip the circle) and an OUTSIDE stroke appears centred.
  const ellipseMaskShape: ClipPathShape = {
    kind: "ellipse", cx: node.cx, cy: node.cy, rx: node.rx, ry: node.ry,
  };
  const strokeRendering = node.stroke
    ? resolveStrokeRendering(node.stroke, ids, defs, ellipseStrokeShape, ellipseMaskShape)
    : undefined;

  const ellipseSize = { width: node.rx * 2, height: node.ry * 2 };

  // Pass ellipse shape so the backdrop-filter is clipped to the actual
  // ellipse silhouette, not a rect. Otherwise an ELLIPSE with a
  // background-blur effect renders as a square blur area (user's
  // Bento "Container" bug — ID 133:964).
  const backgroundBlur = resolveBackgroundBlur(
    effectStack, { x: 0, y: 0, ...ellipseSize }, ids, defs,
    ellipseMaskShape,
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
  const { wrapper, effectStack } = resolveWrapper(node, ids, defs);
  const fillResult = resolveTopFillResult(node.fills, ids, defs);
  const fillLayers = resolveAllFillLayers(node.fills, ids, defs);

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

  const pathStrokeShape: StrokeShape = { kind: "path", paths };
  // INSIDE/OUTSIDE stroke needs a shape-matching mask; for paths the mask
  // uses the same contour data drawn as a clip-path (so the doubled
  // stroke width is clipped to the correct side of the path).
  const pathMaskShape: ClipPathShape = {
    kind: "path",
    d: paths.map((p) => p.d).join(" "),
  };
  const strokeRendering = node.stroke
    ? resolveStrokeRendering(node.stroke, ids, defs, pathStrokeShape, pathMaskShape)
    : undefined;

  // For VECTOR / boolean-op paths the contour origin in node-local
  // coordinates can be offset from (0, 0) — Figma's vector network
  // anchors the path at its own bbox, not the node's. The gradient's
  // userSpaceOnUse coordinates need that anchor so a linear gradient
  // running 0→1 in paint-space maps onto the path's actual extent
  // (e.g. Passport's world-map dots: their gradient should colour
  // the visible continents, not an off-frame region above the path).
  // Falls back to (0, 0) origin when contours can't be measured.
  const pathBbox = computePathContoursBbox(node.contours);
  const pathBounds = pathBbox
    ? pathBbox
    : (node.width && node.height ? { x: 0, y: 0, width: node.width, height: node.height } : undefined);
  if (pathBounds) {
    finalizeDefs(defs, pathBounds);
  }

  // Pass path shape so backdrop-filter clips to the actual contour, not
  // the node's bounding rect (matches ELLIPSE/FRAME behaviour).
  const backgroundBlur = pathBounds
    ? resolveBackgroundBlur(effectStack, pathBounds, ids, defs, pathMaskShape)
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
  const viewport = sceneGraph.viewport ?? {
    x: 0,
    y: 0,
    width: sceneGraph.width,
    height: sceneGraph.height,
  };

  return {
    width: sceneGraph.width,
    height: sceneGraph.height,
    viewport,
    children,
  };
}
