/**
 * @file SVG scene graph renderer
 *
 * Renders a SceneGraph to an SVG string via the RenderTree intermediate
 * representation. All attribute resolution is performed by the RenderTree
 * resolver — this file only formats pre-resolved data to SVG strings.
 *
 * ## Architecture
 *
 * ```
 * SceneGraph
 *     ↓ resolveRenderTree()
 * RenderTree (fully resolved)
 *     ↓ formatRenderTree() [this file]
 * SVG string
 * ```
 *
 * This ensures parity with the React renderer, which formats the same
 * RenderTree to JSX elements.
 */

import type { SceneGraph } from "../scene-graph/types";
import {
  resolveRenderTree,
  type RenderTree,
  type RenderNode,
  type RenderGroupNode,
  type RenderFrameNode,
  type RenderRectNode,
  type RenderEllipseNode,
  type RenderPathNode,
  type RenderTextNode,
  type RenderImageNode,
  type RenderDef,
  type ResolvedFillResult,
  type ResolvedWrapperAttrs,
  type ClipPathShape,
  type RenderBackgroundBlur,
  type RenderNodeBase,
} from "../scene-graph/render-tree";

import type { ResolvedStrokeAttrs, ResolvedAngularGradient, ResolvedDiamondGradient } from "../scene-graph/render";

import type { ResolvedFilterPrimitive } from "../scene-graph/render";

import {
  svg,
  g,
  defs,
  path,
  rect,
  circle,
  ellipse,
  text,
  clipPath,
  mask,
  linearGradient,
  radialGradient,
  stop,
  pattern,
  image,
  filter,
  feGaussianBlur,
  feFlood,
  feColorMatrix,
  feOffset,
  feBlend,
  feComposite,
  feMorphology,
  feMerge,
  feMergeNode,
  line,
  a as svgAnchor,
  foreignObject,
  unsafeSvg,
  type SvgString,
  type SvgPaintAttrs,
  EMPTY_SVG,
} from "./primitives";

// =============================================================================
// Def Formatting
// =============================================================================

function formatClipPathShape(shape: ClipPathShape): SvgString {
  switch (shape.kind) {
    case "path":
      return path({ d: shape.d });
    case "ellipse":
      return ellipse({ cx: shape.cx, cy: shape.cy, rx: shape.rx, ry: shape.ry });
    case "rect":
      return rect({
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        rx: shape.rx,
        ry: shape.ry,
      });
  }
}

function formatFilterPrimitive(p: ResolvedFilterPrimitive): SvgString {
  switch (p.type) {
    case "feFlood":
      return feFlood({ "flood-color": p.floodColor, "flood-opacity": p.floodOpacity, result: p.result });
    case "feColorMatrix":
      return feColorMatrix({
        in: p.in,
        type: p.matrixType,
        values: p.values,
        result: p.result,
      });
    case "feOffset":
      return feOffset({ in: p.in, dx: p.dx, dy: p.dy, result: p.result });
    case "feGaussianBlur":
      return feGaussianBlur({ in: p.in, stdDeviation: p.stdDeviation, result: p.result });
    case "feBlend":
      return feBlend({
        mode: p.mode,
        in: p.in,
        in2: p.in2,
        result: p.result,
      });
    case "feComposite":
      return feComposite({
        in: p.in,
        in2: p.in2,
        operator: p.operator,
        k2: p.k2,
        k3: p.k3,
        result: p.result,
      });
    case "feMorphology":
      return feMorphology({
        operator: p.operator,
        radius: p.radius,
      });
    case "feMerge":
      return feMerge({}, p.nodes.map((nodeIn) => feMergeNode({ in: nodeIn })));
  }
}

/**
 * Build a CSS conic-gradient() string from an angular gradient def.
 *
 * `d.rotation` is already in **degrees** (as emitted by
 * `getAngularGradientParams` — the upstream SoT). The previous
 * implementation multiplied by 180/π assuming radians, which produced
 * garbage "from" angles (a 45° rotation became 8100deg, modulo into
 * random-looking values on some browsers) and effectively randomised
 * the stop placement. CSS conic-gradient uses "from Xdeg at cx cy".
 */
function buildConicGradientCSS(d: ResolvedAngularGradient): string {
  const fromDeg = d.rotation;
  const stopParts = d.stops.map((s) => {
    const opacity = s.stopOpacity !== undefined ? s.stopOpacity : 1;
    // Parse hex color for rgba
    const hex = s.stopColor;
    if (opacity < 1) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${opacity}) ${s.offset}`;
    }
    return `${hex} ${s.offset}`;
  });
  return `conic-gradient(from ${fromDeg}deg at ${d.cx} ${d.cy}, ${stopParts.join(", ")})`;
}

/**
 * Build a CSS background for a diamond gradient approximation.
 *
 * Diamond gradient radiates from center in a diamond (rhombus) shape.
 * This is approximated with four linear gradients masked by clip-paths,
 * but for SVG pattern usage we use a single CSS representation.
 * The approximation uses four linear gradients composited together.
 */
function buildDiamondGradientCSS(d: ResolvedDiamondGradient): string {
  // Diamond gradient: stops radiate from center outward in diamond shape.
  // Approximation: use four linear-gradients from center to each edge,
  // combined with CSS gradient layering.
  const stopParts = d.stops.map((s) => {
    const opacity = s.stopOpacity !== undefined ? s.stopOpacity : 1;
    const hex = s.stopColor;
    if (opacity < 1) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${opacity})`;
    }
    return hex;
  });

  // Use first and last stop colors as center and edge
  const center = stopParts[0] ?? "transparent";
  const edge = stopParts[stopParts.length - 1] ?? "transparent";

  // Four triangular regions from center, each with a linear gradient
  // This creates a diamond-like fallback. True diamond needs a shader.
  return `radial-gradient(ellipse 50% 50% at ${d.cx} ${d.cy}, ${center}, ${edge})`;
}

/**
 * Interpolate between two `#rrggbb`-ish stop colors at `t ∈ [0,1]`.
 * Supports both 6-digit hex and `rgb(r,g,b)`/`rgba(...)` values emitted
 * by the gradient stop resolver.
 */
function interpolateStopColor(a: string, b: string, t: number): string {
  const parse = (c: string): readonly [number, number, number, number] => {
    if (c.startsWith("#") && c.length === 7) {
      return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 1];
    }
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const parts = m[1].split(",").map((s) => s.trim());
      return [parseInt(parts[0], 10), parseInt(parts[1], 10), parseInt(parts[2], 10), parts[3] ? parseFloat(parts[3]) : 1];
    }
    return [0, 0, 0, 1];
  };
  const [ar, ag, ab, aa] = parse(a);
  const [br, bg, bb, ba] = parse(b);
  const mix = (x: number, y: number): number => Math.round(x + (y - x) * t);
  const r = mix(ar, br), g = mix(ag, bg), bl = mix(ab, bb);
  const alpha = aa + (ba - aa) * t;
  return alpha < 0.999 ? `rgba(${r},${g},${bl},${alpha.toFixed(3)})` : `rgb(${r},${g},${bl})`;
}

/** Sample the gradient stop color at angular position `t ∈ [0,1]`. */
function sampleGradientAt(
  stops: readonly { offset: string; stopColor: string; stopOpacity?: number }[],
  t: number,
): string {
  if (stops.length === 0) { return "rgb(0,0,0)"; }
  const offsets = stops.map((s) => {
    const v = s.offset.endsWith("%") ? parseFloat(s.offset) / 100 : parseFloat(s.offset);
    return Number.isFinite(v) ? v : 0;
  });
  if (t <= offsets[0]) { return stops[0].stopColor; }
  if (t >= offsets[offsets.length - 1]) { return stops[stops.length - 1].stopColor; }
  for (let i = 1; i < offsets.length; i++) {
    if (t <= offsets[i]) {
      const span = offsets[i] - offsets[i - 1];
      const u = span > 0 ? (t - offsets[i - 1]) / span : 0;
      return interpolateStopColor(stops[i - 1].stopColor, stops[i].stopColor, u);
    }
  }
  return stops[stops.length - 1].stopColor;
}

/**
 * Emit an angular (conic) gradient as an SVG-native sectored
 * approximation. 64 triangular sectors radiate from the gradient's
 * centre; each sector is filled with the stop colour sampled at its
 * mid-angle.
 *
 * A prior implementation used `<foreignObject>` + CSS `conic-gradient`
 * inside an SVG `<pattern>`. Chromium refuses to render foreignObject
 * children when the foreignObject is nested inside a <pattern>, so
 * angular-filled FRAMEs (user's Hologram widget 126:420) rendered as
 * white. The sectored approximation works in every SVG renderer
 * (Chromium, Firefox, Safari, resvg) and does not depend on CSS.
 *
 * Trade-off: 64 sectors introduces ~5.6° angular stepping. For the
 * smooth continuous gradients Figma tends to emit, that is visually
 * indistinguishable from a true conic gradient at typical sizes.
 * Increase `SECTORS` if finer resolution is required.
 */
const SECTORS = 64;

function formatAngularGradientDef(d: ResolvedAngularGradient): SvgString {
  const w = d.elementWidth ?? 1;
  const h = d.elementHeight ?? 1;
  // cx/cy are fractional (0..1) unless explicitly overridden; resolve
  // against element size.
  const cx = parseFloat(d.cx) * (d.cx.endsWith("%") ? w / 100 : 1) || (w / 2);
  const cy = parseFloat(d.cy) * (d.cy.endsWith("%") ? h / 100 : 1) || (h / 2);
  // Radius that guarantees full coverage regardless of element shape.
  const radius = Math.hypot(w, h);
  // Figma's `from` angle: d.rotation degrees. 0° points RIGHT, CW.
  // CSS conic-gradient default starts at TOP; we mirror that so the
  // mapping matches buildConicGradientCSS.
  const fromDeg = d.rotation - 90;

  const parts: SvgString[] = [];
  for (let i = 0; i < SECTORS; i++) {
    const a0 = (i / SECTORS) * 360 + fromDeg;
    const a1 = ((i + 1) / SECTORS) * 360 + fromDeg;
    // Slight 0.5° overlap so adjacent sectors meet cleanly without
    // background bleed-through.
    const a0r = (a0 - 0.3) * Math.PI / 180;
    const a1r = (a1 + 0.3) * Math.PI / 180;
    const x0 = cx + Math.cos(a0r) * radius;
    const y0 = cy + Math.sin(a0r) * radius;
    const x1 = cx + Math.cos(a1r) * radius;
    const y1 = cy + Math.sin(a1r) * radius;
    const midT = (i + 0.5) / SECTORS;
    const color = sampleGradientAt(d.stops, midT);
    const pathD = `M${cx},${cy} L${x0},${y0} L${x1},${y1} Z`;
    parts.push(path({ d: pathD, fill: color }));
  }
  return pattern(
    { id: d.id, patternUnits: "userSpaceOnUse", width: w, height: h },
    ...parts,
  );
}

/**
 * Format a diamond gradient def as a pattern containing four radial-
 * gradient halves. The SVG-pattern+foreignObject approach failed in
 * Chromium (see `formatAngularGradientDef` comment); for diamond we
 * fall back to a 4-triangle linear-gradient approximation (each
 * triangle gradient goes from centre to one corner of the fill box).
 */
function formatDiamondGradientDef(d: ResolvedDiamondGradient): SvgString {
  const w = d.elementWidth ?? 1;
  const h = d.elementHeight ?? 1;
  const cx = parseFloat(d.cx) * (d.cx.endsWith("%") ? w / 100 : 1) || (w / 2);
  const cy = parseFloat(d.cy) * (d.cy.endsWith("%") ? h / 100 : 1) || (h / 2);
  // Sample 32 concentric polygons, each a diamond (rhombus) at decreasing
  // scale; inner polygon uses the first stop, outer the last.
  const parts: SvgString[] = [];
  const steps = 32;
  // Diamond vertices span from centre to the element corners along ±x/±y axes.
  const dx = Math.max(w - cx, cx);
  const dy = Math.max(h - cy, cy);
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const color = sampleGradientAt(d.stops, t);
    const rx = dx * t;
    const ry = dy * t;
    const pathD = `M${cx - rx},${cy} L${cx},${cy - ry} L${cx + rx},${cy} L${cx},${cy + ry} Z`;
    parts.push(path({ d: pathD, fill: color }));
  }
  return pattern(
    { id: d.id, patternUnits: "userSpaceOnUse", width: w, height: h },
    ...parts,
  );
}

function formatDef(def: RenderDef): SvgString {
  switch (def.type) {
    case "linear-gradient": {
      const d = def.def;
      const stops = d.stops.map((s) =>
        stop({
          offset: s.offset,
          "stop-color": s.stopColor,
          "stop-opacity": s.stopOpacity,
        }),
      );
      return linearGradient({ id: d.id, x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2, gradientUnits: d.gradientUnits }, ...stops);
    }
    case "radial-gradient": {
      const d = def.def;
      const stops = d.stops.map((s) =>
        stop({
          offset: s.offset,
          "stop-color": s.stopColor,
          "stop-opacity": s.stopOpacity,
        }),
      );
      return radialGradient({
        id: d.id, cx: d.cx, cy: d.cy, r: d.r,
        gradientUnits: d.gradientUnits,
        gradientTransform: typeof d.gradientTransform === "string" ? d.gradientTransform : undefined,
      }, ...stops);
    }
    case "angular-gradient": {
      return formatAngularGradientDef(def.def);
    }
    case "diamond-gradient": {
      return formatDiamondGradientDef(def.def);
    }
    case "pattern": {
      const d = def.def;
      const patternAttrs: Parameters<typeof pattern>[0] = {
        id: d.id,
        patternContentUnits: d.patternContentUnits === "objectBoundingBox" ? "objectBoundingBox" : undefined,
        patternUnits: d.patternContentUnits === "userSpaceOnUse" ? "userSpaceOnUse" : undefined,
        width: d.width,
        height: d.height,
        patternTransform: d.patternTransform,
      };
      // When imageTransform is set (by finalizeImagePatternDefs),
      // the image uses natural pixel dimensions with the transform
      // mapping to objectBoundingBox space. Otherwise, simple stretch.
      const imgAttrs: Parameters<typeof image>[0] = d.imageTransform
        ? {
            href: d.dataUri,
            width: d.imageWidth,
            height: d.imageHeight,
            preserveAspectRatio: d.preserveAspectRatio,
            transform: d.imageTransform,
          }
        : {
            href: d.dataUri,
            width: d.imageWidth,
            height: d.imageHeight,
            preserveAspectRatio: d.preserveAspectRatio,
            x: 0,
            y: 0,
          };
      return pattern(patternAttrs, image(imgAttrs));
    }
    case "filter": {
      const f = def.filter;
      const primitives = f.primitives.map((p) => formatFilterPrimitive(p));
      const filterAttrs: Parameters<typeof filter>[0] = f.filterBounds
        ? {
            id: f.id,
            x: f.filterBounds.x,
            y: f.filterBounds.y,
            width: f.filterBounds.width,
            height: f.filterBounds.height,
            filterUnits: "userSpaceOnUse",
            "color-interpolation-filters": "sRGB",
          }
        : { id: f.id };
      return filter(filterAttrs, ...primitives);
    }
    case "clip-path": {
      return clipPath({ id: def.id }, formatClipPathShape(def.shape));
    }
    case "mask": {
      const maskContent = formatNode(def.maskContent);
      return mask(
        { id: def.id, style: "mask-type:luminance" },
        g({ fill: "white" }, maskContent),
      );
    }
    case "stroke-mask": {
      // Stroke-align mask for INSIDE/OUTSIDE stroke clipping.
      // INSIDE: white filled shape → only stroke inside the shape is visible.
      // OUTSIDE: inverted mask — large white rect with black shape cutout → only stroke outside is visible.
      const shape = formatClipPathShape(def.shape);
      if (def.strokeAlign === "OUTSIDE") {
        // Invert: large white background with black shape hole
        return mask(
          { id: def.id, style: "mask-type:luminance" },
          rect({ x: -100, y: -100, width: 10000, height: 10000, fill: "white" }),
          g({ fill: "black" }, shape),
        );
      }
      return mask(
        { id: def.id, style: "mask-type:luminance" },
        g({ fill: "white" }, shape),
      );
    }
  }
}

function formatDefs(renderDefs: readonly RenderDef[]): SvgString {
  if (renderDefs.length === 0) { return EMPTY_SVG; }
  const formatted = renderDefs.map(formatDef);
  return defs(...formatted);
}

// =============================================================================
// Fill/Stroke Attribute Formatting
// =============================================================================

function fillToSvgAttrs(fill: ResolvedFillResult): { fill: string; "fill-opacity"?: number; style?: string } {
  return {
    fill: fill.attrs.fill,
    "fill-opacity": fill.attrs.fillOpacity,
    style: blendModeStyle(fill.blendMode),
  };
}

type StrokeSvgAttrs = Pick<
  SvgPaintAttrs,
  | "stroke"
  | "stroke-width"
  | "stroke-opacity"
  | "stroke-linecap"
  | "stroke-linejoin"
  | "stroke-dasharray"
>;

function strokeToSvgAttrs(attrs: ResolvedStrokeAttrs): StrokeSvgAttrs {
  return {
    stroke: attrs.stroke,
    "stroke-width": attrs.strokeWidth,
    "stroke-opacity": attrs.strokeOpacity,
    "stroke-linecap": attrs.strokeLinecap,
    "stroke-linejoin": attrs.strokeLinejoin,
    "stroke-dasharray": attrs.strokeDasharray,
  };
}

/**
 * Convert wrapper attrs + mask to SVG attribute record.
 *
 * Every field of ResolvedWrapperAttrs must be consumed here.
 * The shared WRAPPER_ATTRS_FIELDS registry (in render-tree/types.ts)
 * enforces that ResolvedWrapperAttrs and this function stay in sync
 * — if a field is added to the type but not the registry, the
 * `satisfies` on the registry definition fails.
 */
type WrapperSvgAttrs = Pick<SvgPaintAttrs, "transform" | "opacity" | "style"> & {
  filter?: string;
  mask?: string;
};

function wrapperAttrs(node: { wrapper: ResolvedWrapperAttrs; mask?: { maskAttr: string } }): WrapperSvgAttrs {
  const w = node.wrapper;
  // Isolate the stacking context whenever we carry a blend mode or a
  // filter. Without isolation, mix-blend-mode can leak past the intended
  // compositing boundary and produce no visible effect (FRAME Pattern
  // with blendMode=SCREEN on Cron 4×2 was the canary). Matches the
  // React renderer's RenderWrapper behaviour so both backends composite
  // identically.
  const parts: string[] = [];
  if (w.blendMode) {parts.push(`mix-blend-mode:${w.blendMode}`);}
  if (w.blendMode || w.filterAttr) {parts.push("isolation:isolate");}
  const style = parts.length > 0 ? parts.join(";") : undefined;
  return {
    transform: w.transform,
    opacity: w.opacity,
    filter: w.filterAttr,
    mask: node.mask?.maskAttr,
    style,
  };
}

// =============================================================================
// Corner Radius Helpers
// =============================================================================

import type { CornerRadius, BlendMode } from "../scene-graph/types";
import type { ResolvedFillLayer } from "../scene-graph/render-tree";
import type { ResolvedStrokeLayer } from "../scene-graph/render";

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
 * Render a rectangle shape, using <rect> for uniform radius or <path> for per-corner.
 */
function formatRectShape(
  w: number, h: number, cr: CornerRadius | undefined,
  fillAttrs: SvgPaintAttrs,
  strokeAttrs: SvgPaintAttrs,
): SvgString {
  if (cr !== undefined && typeof cr !== "number") {
    return path({
      d: buildRoundedRectPathD(w, h, cr),
      ...fillAttrs,
      ...strokeAttrs,
    });
  }
  return rect({
    x: 0, y: 0,
    width: w, height: h,
    rx: cr, ry: cr,
    ...fillAttrs,
    ...strokeAttrs,
  });
}

// =============================================================================
// Multi-fill Layer Helpers
// =============================================================================

function blendModeStyle(bm: BlendMode | undefined): string | undefined {
  return bm ? `mix-blend-mode:${bm}` : undefined;
}

/**
 * Render stacked rect shapes for multi-paint fills.
 * Each fill layer becomes its own rect/path element, bottom-to-top.
 */
function formatMultiFillRectLayers(
  layers: readonly ResolvedFillLayer[],
  w: number, h: number, cr: CornerRadius | undefined,
  strokeAttrs: SvgPaintAttrs,
): SvgString[] {
  return layers.map((layer, i): SvgString => {
    const fillAttrs: SvgPaintAttrs = {
      fill: layer.attrs.fill,
      "fill-opacity": layer.attrs.fillOpacity,
    };
    // Only last layer gets stroke
    const sAttrs: SvgPaintAttrs = i === layers.length - 1 ? strokeAttrs : {};
    const style = blendModeStyle(layer.blendMode);
    if (cr !== undefined && typeof cr !== "number") {
      return path({
        d: buildRoundedRectPathD(w, h, cr),
        ...fillAttrs,
        ...sAttrs,
        style,
      });
    }
    return rect({
      x: 0, y: 0,
      width: w, height: h,
      rx: cr, ry: cr,
      ...fillAttrs,
      ...sAttrs,
      style,
    });
  });
}

/**
 * Render stacked ellipse shapes for multi-paint fills.
 */
function formatMultiFillEllipseLayers(
  layers: readonly ResolvedFillLayer[],
  cx: number, cy: number, rx: number, ry: number,
  strokeAttrs: StrokeSvgAttrs,
): SvgString[] {
  return layers.map((layer, i) => {
    const fillAttrs = {
      fill: layer.attrs.fill,
      "fill-opacity": layer.attrs.fillOpacity,
    };
    const sAttrs = i === layers.length - 1 ? strokeAttrs : {};
    const style = blendModeStyle(layer.blendMode);
    return ellipse({
      cx, cy, rx, ry,
      ...fillAttrs,
      ...sAttrs,
      style,
    });
  });
}

/**
 * Render stacked path shapes for multi-paint fills.
 */
function formatMultiFillPathLayers(
  layers: readonly ResolvedFillLayer[],
  paths: readonly { d: string; fillRule?: "evenodd" }[],
  strokeAttrs: StrokeSvgAttrs,
): SvgString[] {
  const result: SvgString[] = [];
  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    const fillAttrs = {
      fill: layer.attrs.fill,
      "fill-opacity": layer.attrs.fillOpacity,
    };
    const sAttrs = li === layers.length - 1 ? strokeAttrs : {};
    const style = blendModeStyle(layer.blendMode);
    for (const p of paths) {
      result.push(path({
        d: p.d,
        "fill-rule": p.fillRule,
        ...fillAttrs,
        ...sAttrs,
        style,
      }));
    }
  }
  return result;
}

// =============================================================================
// Multi-stroke Layer Helpers
// =============================================================================

/**
 * Render stacked rect strokes for multi-paint stroke layers.
 * Each stroke layer draws the same shape outline with its own color/gradient and blend mode.
 */
function formatMultiStrokeRectLayers(
  layers: readonly ResolvedStrokeLayer[],
  w: number, h: number, cr: CornerRadius | undefined,
): SvgString[] {
  return layers.map((layer) => {
    const sAttrs = strokeToSvgAttrs(layer.attrs);
    const style = blendModeStyle(layer.blendMode);
    if (cr !== undefined && typeof cr !== "number") {
      return path({
        d: buildRoundedRectPathD(w, h, cr),
        fill: "none",
        ...sAttrs,
        style,
      });
    }
    return rect({
      x: 0, y: 0, width: w, height: h, rx: cr, ry: cr,
      fill: "none",
      ...sAttrs,
      style,
    });
  });
}

/**
 * Render stacked ellipse strokes for multi-paint stroke layers.
 */
function formatMultiStrokeEllipseLayers(
  layers: readonly ResolvedStrokeLayer[],
  cx: number, cy: number, rx: number, ry: number,
): SvgString[] {
  return layers.map((layer) => {
    const sAttrs = strokeToSvgAttrs(layer.attrs);
    const style = blendModeStyle(layer.blendMode);
    return ellipse({
      cx, cy, rx, ry,
      fill: "none",
      ...sAttrs,
      style,
    });
  });
}

/**
 * Render stacked path strokes for multi-paint stroke layers.
 */
function formatMultiStrokePathLayers(
  layers: readonly ResolvedStrokeLayer[],
  paths: readonly { d: string; fillRule?: "evenodd" }[],
): SvgString[] {
  const result: SvgString[] = [];
  for (const layer of layers) {
    const sAttrs = strokeToSvgAttrs(layer.attrs);
    const style = blendModeStyle(layer.blendMode);
    for (const p of paths) {
      result.push(path({
        d: p.d,
        "fill-rule": p.fillRule,
        fill: "none",
        ...sAttrs,
        style,
      }));
    }
  }
  return result;
}

// =============================================================================
// Background Blur Formatter
// =============================================================================

/**
 * Format a background blur effect as foreignObject + CSS backdrop-filter.
 *
 * SVG has no native background blur. Figma's SVG export uses a foreignObject
 * containing a div with `backdrop-filter: blur(Npx)`, clipped to the node's
 * shape via a clipPath.
 */
function formatBackgroundBlur(bgBlur: RenderBackgroundBlur): SvgString {
  const foContent = unsafeSvg(
    `<div xmlns="http://www.w3.org/1999/xhtml" style="backdrop-filter:blur(${bgBlur.radius}px);width:100%;height:100%"></div>`,
  );
  const fo = foreignObject(
    { x: bgBlur.bounds.x, y: bgBlur.bounds.y, width: bgBlur.bounds.width, height: bgBlur.bounds.height },
    foContent,
  );
  return g({ "clip-path": `url(#${bgBlur.clipId})` }, fo);
}



// =============================================================================
// StrokeRendering Formatter
// =============================================================================

/**
 * Get stroke attrs for the fill shape element (uniform mode only).
 * Other modes return empty — strokes are rendered as separate elements.
 */
function getUniformStrokeAttrs(sr: StrokeRendering | undefined): StrokeSvgAttrs {
  if (!sr || sr.mode !== "uniform") { return {}; }
  return strokeToSvgAttrs(sr.attrs);
}

import type { StrokeRendering, StrokeShape } from "../scene-graph/render-tree";

/**
 * Format a stroked shape element from StrokeShape + stroke attrs.
 */
function formatStrokedShape(shape: StrokeShape, sAttrs: StrokeSvgAttrs): SvgString {
  switch (shape.kind) {
    case "rect":
      return formatRectShape(shape.width, shape.height, shape.cornerRadius, { fill: "none" }, sAttrs);
    case "ellipse":
      return shape.rx === shape.ry
        ? circle({ cx: shape.cx, cy: shape.cy, r: shape.rx, fill: "none", ...sAttrs })
        : ellipse({ cx: shape.cx, cy: shape.cy, rx: shape.rx, ry: shape.ry, fill: "none", ...sAttrs });
    case "path": {
      const els = shape.paths.map((p) =>
        path({ d: p.d, "fill-rule": p.fillRule, fill: "none", ...sAttrs }),
      );
      return els.length === 1 ? els[0] : g({}, ...els);
    }
  }
}

/**
 * Format multi-paint stroke layers from StrokeShape.
 */
function formatStrokeLayersForShape(layers: readonly import("../scene-graph/render").ResolvedStrokeLayer[], shape: StrokeShape): SvgString[] {
  switch (shape.kind) {
    case "rect":
      return formatMultiStrokeRectLayers(layers, shape.width, shape.height, shape.cornerRadius);
    case "ellipse":
      return formatMultiStrokeEllipseLayers(layers, shape.cx, shape.cy, shape.rx, shape.ry);
    case "path":
      return formatMultiStrokePathLayers(layers, shape.paths);
  }
}

/**
 * Format separate stroke elements from a StrokeRendering union.
 *
 * This is the SINGLE stroke rendering function for the SVG backend.
 * All node formatters delegate here — no stroke logic elsewhere.
 */
function formatStrokeRendering(sr: StrokeRendering): SvgString[] {
  switch (sr.mode) {
    case "uniform":
      return [];

    case "masked":
      return [g({ mask: `url(#${sr.maskId})` }, formatStrokedShape(sr.shape, strokeToSvgAttrs(sr.attrs)))];

    case "layers":
      return formatStrokeLayersForShape(sr.layers, sr.shape);

    case "individual": {
      const result: SvgString[] = [];
      const { sides, color, opacity, width: w, height: h } = sr;
      if (sides.top > 0) result.push(line({ x1: 0, y1: 0, x2: w, y2: 0, stroke: color, "stroke-opacity": opacity, "stroke-width": sides.top }));
      if (sides.right > 0) result.push(line({ x1: w, y1: 0, x2: w, y2: h, stroke: color, "stroke-opacity": opacity, "stroke-width": sides.right }));
      if (sides.bottom > 0) result.push(line({ x1: 0, y1: h, x2: w, y2: h, stroke: color, "stroke-opacity": opacity, "stroke-width": sides.bottom }));
      if (sides.left > 0) result.push(line({ x1: 0, y1: 0, x2: 0, y2: h, stroke: color, "stroke-opacity": opacity, "stroke-width": sides.left }));
      return result;
    }
  }
}

// =============================================================================
// Shape Node Assembly
// =============================================================================

/**
 * Assemble a shape node's parts into a wrapped SVG group.
 *
 * All shape nodes (rect, ellipse, path, frame) share the same final assembly:
 * 1. Prepend defs
 * 2. Append background blur (if present)
 * 3. Wrap in <g> with wrapper attrs
 *
 * This prevents scattered backgroundBlur/defs handling across every formatter.
 */
function assembleShapeNode(
  node: { readonly defs: readonly RenderDef[]; readonly backgroundBlur?: RenderBackgroundBlur } & RenderNodeBase,
  shapeContent: readonly SvgString[],
): SvgString {
  const parts: SvgString[] = [];
  const defsStr = formatDefs(node.defs);
  if (defsStr !== EMPTY_SVG) { parts.push(defsStr); }
  parts.push(...shapeContent);
  if (node.backgroundBlur) { parts.push(formatBackgroundBlur(node.backgroundBlur)); }
  return g(wrapperAttrs(node), ...parts);
}

// =============================================================================
// Node Formatters
// =============================================================================

function formatGroupNode(node: RenderGroupNode): SvgString {
  const children = node.children.map(formatNode);
  const defsStr = formatDefs(node.defs);

  // Optimization: unwrap single child if no wrapper attrs needed
  if (node.canUnwrapSingleChild && children.length === 1 && node.defs.length === 0) {
    return children[0];
  }

  const parts: SvgString[] = [];
  if (defsStr !== EMPTY_SVG) { parts.push(defsStr); }
  parts.push(...children);

  return g(wrapperAttrs(node), ...parts);
}

function formatFrameNode(node: RenderFrameNode): SvgString {
  const parts: SvgString[] = [];
  const defsStr = formatDefs(node.defs);
  if (defsStr !== EMPTY_SVG) { parts.push(defsStr); }

  if (node.background) {
    const sr = node.background.strokeRendering;
    const fillStrokeAttrs = getUniformStrokeAttrs(sr);

    if (node.background.fillLayers) {
      parts.push(...formatMultiFillRectLayers(
        node.background.fillLayers, node.width, node.height, node.cornerRadius, fillStrokeAttrs,
      ));
    } else {
      const fillAttrs = fillToSvgAttrs(node.background.fill);
      parts.push(formatRectShape(node.width, node.height, node.cornerRadius, fillAttrs, fillStrokeAttrs));
    }

    if (sr) {
      parts.push(...formatStrokeRendering(sr));
    }
  }

  if (node.backgroundBlur) {
    parts.push(formatBackgroundBlur(node.backgroundBlur));
  }

  const childElements = node.children.map(formatNode);
  if (node.childClipId && childElements.length > 0) {
    parts.push(g({ "clip-path": `url(#${node.childClipId})` }, ...childElements));
  } else {
    parts.push(...childElements);
  }

  return g(wrapperAttrs(node), ...parts);
}

function formatRectNode(node: RenderRectNode): SvgString {
  const sr = node.strokeRendering;
  const fillStrokeAttrs = getUniformStrokeAttrs(sr);

  if (node.fillLayers || sr) {
    const content: SvgString[] = node.fillLayers
      ? formatMultiFillRectLayers(node.fillLayers, node.width, node.height, node.cornerRadius, fillStrokeAttrs)
      : [formatRectShape(node.width, node.height, node.cornerRadius, fillToSvgAttrs(node.fill), fillStrokeAttrs)];
    if (sr) {
      content.push(...formatStrokeRendering(sr));
    }
    return assembleShapeNode(node, content);
  }

  const rectEl = formatRectShape(node.width, node.height, node.cornerRadius, fillToSvgAttrs(node.fill), fillStrokeAttrs);

  if (node.needsWrapper) {
    return assembleShapeNode(node, [rectEl]);
  }
  return rectEl;
}

function formatEllipseNode(node: RenderEllipseNode): SvgString {
  const sr = node.strokeRendering;
  const fillStrokeAttrs = getUniformStrokeAttrs(sr);
  const isCircle = node.rx === node.ry;

  if (node.fillLayers || sr) {
    const content: SvgString[] = node.fillLayers
      ? formatMultiFillEllipseLayers(node.fillLayers, node.cx, node.cy, node.rx, node.ry, fillStrokeAttrs)
      : [isCircle
          ? circle({ cx: node.cx, cy: node.cy, r: node.rx, ...fillToSvgAttrs(node.fill), ...fillStrokeAttrs })
          : ellipse({ cx: node.cx, cy: node.cy, rx: node.rx, ry: node.ry, ...fillToSvgAttrs(node.fill), ...fillStrokeAttrs })];
    if (sr) {
      content.push(...formatStrokeRendering(sr));
    }
    return assembleShapeNode(node, content);
  }

  const fillAttrs = fillToSvgAttrs(node.fill);
  const el = isCircle
    ? circle({ cx: node.cx, cy: node.cy, r: node.rx, ...fillAttrs, ...fillStrokeAttrs })
    : ellipse({ cx: node.cx, cy: node.cy, rx: node.rx, ry: node.ry, ...fillAttrs, ...fillStrokeAttrs });

  if (node.needsWrapper) {
    return assembleShapeNode(node, [el]);
  }
  return el;
}

function formatPathNode(node: RenderPathNode): SvgString {
  if (node.paths.length === 0) {
    return EMPTY_SVG;
  }

  const sr = node.strokeRendering;
  const fillStrokeAttrs = getUniformStrokeAttrs(sr);
  if (node.fillLayers || sr) {
    const content: SvgString[] = node.fillLayers
      ? formatMultiFillPathLayers(node.fillLayers, node.paths, fillStrokeAttrs)
      : node.paths.map((p) => {
          const fa = p.fillOverride ? fillToSvgAttrs(p.fillOverride) : fillToSvgAttrs(node.fill);
          return path({ d: p.d, "fill-rule": p.fillRule, ...fa, ...fillStrokeAttrs });
        });
    if (sr) { content.push(...formatStrokeRendering(sr)); }
    return assembleShapeNode(node, content);
  }

  const defaultFillAttrs = fillToSvgAttrs(node.fill);
  const pathElements: SvgString[] = node.paths.map((p) => {
    const fa = p.fillOverride ? fillToSvgAttrs(p.fillOverride) : defaultFillAttrs;
    return path({ d: p.d, "fill-rule": p.fillRule, ...fa, ...fillStrokeAttrs });
  });

  if (node.needsWrapper) {
    return assembleShapeNode(node, pathElements);
  }
  return pathElements[0];
}

function formatTextNode(node: RenderTextNode): SvgString {
  const defsStr = formatDefs(node.defs);

  if (node.content.mode === "glyphs") {
    if (node.content.d === "") {
      return EMPTY_SVG;
    }
    let glyphContent: SvgString = path({
      d: node.content.d,
      fill: node.fillColor,
      "fill-opacity": node.fillOpacity,
    });
    if (node.hyperlink) {
      glyphContent = svgAnchor({ href: node.hyperlink }, glyphContent);
    }
    const content = node.textClipId
      ? g({ "clip-path": `url(#${node.textClipId})` }, glyphContent)
      : glyphContent;

    const parts: SvgString[] = [];
    if (defsStr !== EMPTY_SVG) { parts.push(defsStr); }
    parts.push(content);

    return g(wrapperAttrs(node), ...parts);
  }

  // Text line layout: <text> elements
  const fb = node.content.layout;
  if (fb.lines.length === 0) {
    return EMPTY_SVG;
  }

  const textAnchor = fb.textAnchor !== "start" ? fb.textAnchor : undefined;
  const fontVarStyle = fb.fontVariationSettings
    ? `font-variation-settings:${fb.fontVariationSettings}`
    : undefined;

  const textElements: SvgString[] = fb.lines.map((line) =>
    text(
      {
        x: line.x,
        y: line.y,
        fill: node.fillColor,
        "fill-opacity": node.fillOpacity,
        "font-family": fb.fontFamily,
        "font-size": fb.fontSize,
        "font-weight": fb.fontWeight,
        "font-style": fb.fontStyle,
        "letter-spacing": fb.letterSpacing,
        "text-anchor": textAnchor,
        style: fontVarStyle,
      },
      line.text,
    ),
  );

  let textContent: SvgString = textElements.length === 1 ? textElements[0] : g({}, ...textElements);

  // Wrap in hyperlink if present
  if (node.hyperlink) {
    textContent = svgAnchor({ href: node.hyperlink }, textContent);
  }

  const clippedContent = node.textClipId
    ? g({ "clip-path": `url(#${node.textClipId})` }, textContent)
    : textContent;

  const parts: SvgString[] = [];
  if (defsStr !== EMPTY_SVG) { parts.push(defsStr); }
  parts.push(clippedContent);

  return g(wrapperAttrs(node), ...parts);
}

function formatImageNode(node: RenderImageNode): SvgString {
  if (!node.dataUri) {
    return EMPTY_SVG;
  }

  const imageEl = image({
    href: node.dataUri,
    x: 0,
    y: 0,
    width: node.width,
    height: node.height,
    preserveAspectRatio: node.preserveAspectRatio,
  });

  if (node.needsWrapper) {
    return g(wrapperAttrs(node), imageEl);
  }
  return imageEl;
}

function formatNode(node: RenderNode): SvgString {
  switch (node.type) {
    case "group":
      return formatGroupNode(node);
    case "frame":
      return formatFrameNode(node);
    case "rect":
      return formatRectNode(node);
    case "ellipse":
      return formatEllipseNode(node);
    case "path":
      return formatPathNode(node);
    case "text":
      return formatTextNode(node);
    case "image":
      return formatImageNode(node);
  }
}

// =============================================================================
// RenderTree → SVG string
// =============================================================================

/**
 * Options for SVG formatting of a RenderTree.
 */
export type FormatRenderTreeToSvgOptions = {
  /**
   * Optional canvas background color (CSS color string). When provided,
   * emitted as a full-canvas <rect> before children — matches the original
   * SVG renderer's output ordering (defs are on nodes, not root-level).
   */
  readonly backgroundColor?: string;
};

/**
 * Format a RenderTree to an SVG string.
 *
 * This is a pure formatter — no attribute resolution happens here.
 * All rendering decisions were made by resolveRenderTree().
 */
export function formatRenderTreeToSvg(
  renderTree: RenderTree,
  options?: FormatRenderTreeToSvgOptions,
): SvgString {
  const children = renderTree.children.map(formatNode);

  const body: SvgString[] = [];
  if (options?.backgroundColor) {
    body.push(
      rect({
        x: 0,
        y: 0,
        width: renderTree.width,
        height: renderTree.height,
        fill: options.backgroundColor,
      }),
    );
  }
  body.push(...children);

  return svg(
    {
      width: renderTree.width,
      height: renderTree.height,
      viewBox: `0 0 ${renderTree.width} ${renderTree.height}`,
    },
    ...body,
  );
}

// =============================================================================
// Public API (backward-compatible)
// =============================================================================

/**
 * Render a scene graph to SVG string.
 *
 * Resolves the SceneGraph to a RenderTree, then formats to SVG.
 * This is the backward-compatible entry point.
 */
export function renderSceneGraphToSvg(sceneGraph: SceneGraph): SvgString {
  const renderTree = resolveRenderTree(sceneGraph);
  return formatRenderTreeToSvg(renderTree);
}
