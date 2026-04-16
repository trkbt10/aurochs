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
  foreignObject,
  unsafeSvg,
  type SvgString,
  EMPTY_SVG,
} from "./primitives";

// =============================================================================
// Def Formatting
// =============================================================================

function formatClipPathShape(shape: ClipPathShape): SvgString {
  if (shape.kind === "path") {
    return path({ d: shape.d });
  }
  return rect({
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    rx: shape.rx,
    ry: shape.ry,
  });
}

function formatFilterPrimitive(p: ResolvedFilterPrimitive): SvgString {
  switch (p.type) {
    case "feFlood":
      return feFlood({ "flood-opacity": p.floodOpacity, result: p.result });
    case "feColorMatrix":
      return feColorMatrix({
        in: p.in,
        type: p.matrixType as Parameters<typeof feColorMatrix>[0]["type"],
        values: p.values,
        result: p.result,
      });
    case "feOffset":
      return feOffset({ dx: p.dx, dy: p.dy });
    case "feGaussianBlur":
      return feGaussianBlur({ in: p.in, stdDeviation: p.stdDeviation });
    case "feBlend":
      return feBlend({
        mode: p.mode as Parameters<typeof feBlend>[0]["mode"],
        in: p.in,
        in2: p.in2,
        result: p.result,
      });
    case "feComposite":
      return feComposite({
        in2: p.in2,
        operator: p.operator as Parameters<typeof feComposite>[0]["operator"],
        k2: p.k2,
        k3: p.k3,
      });
    case "feMorphology":
      return feMorphology({
        operator: p.operator,
        radius: p.radius,
      });
  }
}

/**
 * Build a CSS conic-gradient() string from an angular gradient def.
 *
 * Figma's angular gradient starts from the rotation angle and distributes
 * stops around the full circle. CSS conic-gradient uses "from Xdeg at cx cy".
 */
function buildConicGradientCSS(d: ResolvedAngularGradient): string {
  const fromDeg = (d.rotation * 180) / Math.PI;
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
 * Format an angular gradient def as a foreignObject pattern.
 *
 * SVG has no native conic/angular gradient. We use a <pattern> containing
 * a <foreignObject> with a CSS conic-gradient div inside.
 */
function formatAngularGradientDef(d: ResolvedAngularGradient): SvgString {
  const css = buildConicGradientCSS(d);
  const inner = foreignObject(
    { x: 0, y: 0, width: 1, height: 1 },
    unsafeSvg(`<div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;background:${css}"></div>`),
  );
  return pattern(
    { id: d.id, patternContentUnits: "objectBoundingBox", width: 1, height: 1 },
    inner,
  );
}

/**
 * Format a diamond gradient def as a foreignObject pattern.
 */
function formatDiamondGradientDef(d: ResolvedDiamondGradient): SvgString {
  const css = buildDiamondGradientCSS(d);
  const inner = foreignObject(
    { x: 0, y: 0, width: 1, height: 1 },
    unsafeSvg(`<div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;background:${css}"></div>`),
  );
  return pattern(
    { id: d.id, patternContentUnits: "objectBoundingBox", width: 1, height: 1 },
    inner,
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
      const patternAttrs: Record<string, string | number | undefined> = {
        id: d.id,
        patternContentUnits: d.patternContentUnits === "objectBoundingBox" ? "objectBoundingBox" : undefined,
        patternUnits: d.patternContentUnits === "userSpaceOnUse" ? "userSpaceOnUse" : undefined,
        width: d.width,
        height: d.height,
      };
      if (d.patternTransform) {
        patternAttrs.patternTransform = d.patternTransform;
      }
      // When imageTransform is set (by finalizeImagePatternDefs),
      // the image uses natural pixel dimensions with the transform
      // mapping to objectBoundingBox space. Otherwise, simple stretch.
      const imgAttrs: Record<string, string | number | undefined> = {
        href: d.dataUri,
        width: d.imageWidth,
        height: d.imageHeight,
        preserveAspectRatio: d.preserveAspectRatio,
      };
      if (d.imageTransform) {
        imgAttrs.transform = d.imageTransform;
      } else {
        imgAttrs.x = 0;
        imgAttrs.y = 0;
      }
      return pattern(
        patternAttrs as Parameters<typeof pattern>[0],
        image(imgAttrs as Parameters<typeof image>[0]),
      );
    }
    case "filter": {
      const f = def.filter;
      const primitives = f.primitives.map((p) => formatFilterPrimitive(p));
      return filter({ id: f.id }, ...primitives);
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

function fillToSvgAttrs(fill: ResolvedFillResult): { fill: string; "fill-opacity"?: number } {
  return {
    fill: fill.attrs.fill,
    "fill-opacity": fill.attrs.fillOpacity,
  };
}

function strokeToSvgAttrs(attrs: ResolvedStrokeAttrs): Record<string, string | number | undefined> {
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
function wrapperAttrs(node: { wrapper: ResolvedWrapperAttrs; mask?: { maskAttr: string } }): Record<string, string | number | undefined> {
  const w = node.wrapper;
  return {
    transform: w.transform,
    opacity: w.opacity,
    filter: w.filterAttr,
    mask: node.mask?.maskAttr,
    style: w.blendMode ? `mix-blend-mode:${w.blendMode}` : undefined,
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
  fillAttrs: Record<string, string | number | undefined>,
  strokeAttrs: Record<string, string | number | undefined>,
): SvgString {
  if (cr !== undefined && typeof cr !== "number") {
    return path({
      d: buildRoundedRectPathD(w, h, cr),
      ...fillAttrs,
      ...strokeAttrs,
    } as Parameters<typeof path>[0]);
  }
  return rect({
    x: 0, y: 0,
    width: w, height: h,
    rx: cr, ry: cr,
    ...fillAttrs,
    ...strokeAttrs,
  } as Parameters<typeof rect>[0]);
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
  strokeAttrs: Record<string, string | number | undefined>,
): SvgString[] {
  return layers.map((layer, i) => {
    const fillAttrs = {
      fill: layer.attrs.fill,
      "fill-opacity": layer.attrs.fillOpacity,
    };
    // Only last layer gets stroke
    const sAttrs = i === layers.length - 1 ? strokeAttrs : {};
    const style = blendModeStyle(layer.blendMode);
    if (cr !== undefined && typeof cr !== "number") {
      return path({
        d: buildRoundedRectPathD(w, h, cr),
        ...fillAttrs,
        ...sAttrs,
        style,
      } as Parameters<typeof path>[0]);
    }
    return rect({
      x: 0, y: 0,
      width: w, height: h,
      rx: cr, ry: cr,
      ...fillAttrs,
      ...sAttrs,
      style,
    } as Parameters<typeof rect>[0]);
  });
}

/**
 * Render stacked ellipse shapes for multi-paint fills.
 */
function formatMultiFillEllipseLayers(
  layers: readonly ResolvedFillLayer[],
  cx: number, cy: number, rx: number, ry: number,
  strokeAttrs: Record<string, string | number | undefined>,
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
    } as Parameters<typeof ellipse>[0]);
  });
}

/**
 * Render stacked path shapes for multi-paint fills.
 */
function formatMultiFillPathLayers(
  layers: readonly ResolvedFillLayer[],
  paths: readonly { d: string; fillRule?: "evenodd" }[],
  strokeAttrs: Record<string, string | number | undefined>,
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
      } as Parameters<typeof path>[0]));
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
      } as Parameters<typeof path>[0]);
    }
    return rect({
      x: 0, y: 0, width: w, height: h, rx: cr, ry: cr,
      fill: "none",
      ...sAttrs,
      style,
    } as Parameters<typeof rect>[0]);
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
    } as Parameters<typeof ellipse>[0]);
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
      } as Parameters<typeof path>[0]));
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
// Individual Stroke Formatter
// =============================================================================

/**
 * Render per-side strokes as individual <line> elements.
 *
 * When a frame/rect has different stroke widths per side, SVG cannot
 * express this with a single stroke-width. Instead, each visible side
 * is rendered as a separate line with its own stroke-width.
 */
function formatIndividualStrokes(
  strokes: NonNullable<import("../scene-graph/render-tree").RenderFrameBackground["individualStrokes"]>,
  width: number,
  height: number,
): SvgString[] {
  const result: SvgString[] = [];
  const baseAttrs = {
    stroke: strokes.strokeColor,
    "stroke-opacity": strokes.strokeOpacity,
  };

  // Top
  if (strokes.top > 0) {
    result.push(unsafeSvg(
      `<line x1="0" y1="0" x2="${width}" y2="0" stroke="${strokes.strokeColor}"${strokes.strokeOpacity !== undefined ? ` stroke-opacity="${strokes.strokeOpacity}"` : ""} stroke-width="${strokes.top}"/>`,
    ));
  }
  // Right
  if (strokes.right > 0) {
    result.push(unsafeSvg(
      `<line x1="${width}" y1="0" x2="${width}" y2="${height}" stroke="${strokes.strokeColor}"${strokes.strokeOpacity !== undefined ? ` stroke-opacity="${strokes.strokeOpacity}"` : ""} stroke-width="${strokes.right}"/>`,
    ));
  }
  // Bottom
  if (strokes.bottom > 0) {
    result.push(unsafeSvg(
      `<line x1="0" y1="${height}" x2="${width}" y2="${height}" stroke="${strokes.strokeColor}"${strokes.strokeOpacity !== undefined ? ` stroke-opacity="${strokes.strokeOpacity}"` : ""} stroke-width="${strokes.bottom}"/>`,
    ));
  }
  // Left
  if (strokes.left > 0) {
    result.push(unsafeSvg(
      `<line x1="0" y1="0" x2="0" y2="${height}" stroke="${strokes.strokeColor}"${strokes.strokeOpacity !== undefined ? ` stroke-opacity="${strokes.strokeOpacity}"` : ""} stroke-width="${strokes.left}"/>`,
    ));
  }

  return result;
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

  // Background fill (multi-paint layers or single fill)
  if (node.background) {
    const singleStrokeAttrs = node.background.strokeLayers
      ? {} // stroke rendered as separate layers below
      : (node.background.stroke ? strokeToSvgAttrs(node.background.stroke) : {});
    if (node.background.fillLayers) {
      parts.push(...formatMultiFillRectLayers(
        node.background.fillLayers, node.width, node.height, node.cornerRadius, singleStrokeAttrs,
      ));
    } else {
      const fillAttrs = fillToSvgAttrs(node.background.fill);
      parts.push(formatRectShape(node.width, node.height, node.cornerRadius, fillAttrs, singleStrokeAttrs));
    }
    // Multi-paint stroke layers (rendered after fill)
    if (node.background.strokeLayers) {
      parts.push(...formatMultiStrokeRectLayers(
        node.background.strokeLayers, node.width, node.height, node.cornerRadius,
      ));
    }
    // Per-side stroke rendering
    if (node.background.individualStrokes) {
      parts.push(...formatIndividualStrokes(
        node.background.individualStrokes, node.width, node.height,
      ));
    }
  }

  // Background blur (foreignObject + backdrop-filter, before children)
  if (node.backgroundBlur) {
    parts.push(formatBackgroundBlur(node.backgroundBlur));
  }

  // Children (with optional clipping)
  const childElements = node.children.map(formatNode);
  if (node.childClipId && childElements.length > 0) {
    parts.push(g({ "clip-path": `url(#${node.childClipId})` }, ...childElements));
  } else {
    parts.push(...childElements);
  }

  return g(wrapperAttrs(node), ...parts);
}

function formatRectNode(node: RenderRectNode): SvgString {
  const singleStrokeAttrs = node.strokeLayers
    ? {} // stroke rendered as separate layers below
    : (node.stroke ? strokeToSvgAttrs(node.stroke) : {});

  if (node.fillLayers) {
    const content: SvgString[] = [
      ...formatMultiFillRectLayers(node.fillLayers, node.width, node.height, node.cornerRadius, singleStrokeAttrs),
    ];
    if (node.strokeLayers) {
      content.push(...formatMultiStrokeRectLayers(node.strokeLayers, node.width, node.height, node.cornerRadius));
    }
    return assembleShapeNode(node, content);
  }

  const fillAttrs = fillToSvgAttrs(node.fill);
  const rectEl = formatRectShape(node.width, node.height, node.cornerRadius, fillAttrs, singleStrokeAttrs);

  if (node.needsWrapper || node.strokeLayers) {
    const content: SvgString[] = [rectEl];
    if (node.strokeLayers) {
      content.push(...formatMultiStrokeRectLayers(node.strokeLayers, node.width, node.height, node.cornerRadius));
    }
    return assembleShapeNode(node, content);
  }
  return rectEl;
}

function formatEllipseNode(node: RenderEllipseNode): SvgString {
  const singleStrokeAttrs = node.strokeLayers
    ? {}
    : (node.stroke ? strokeToSvgAttrs(node.stroke) : {});

  if (node.fillLayers) {
    const content: SvgString[] = [
      ...formatMultiFillEllipseLayers(node.fillLayers, node.cx, node.cy, node.rx, node.ry, singleStrokeAttrs),
    ];
    if (node.strokeLayers) {
      content.push(...formatMultiStrokeEllipseLayers(node.strokeLayers, node.cx, node.cy, node.rx, node.ry));
    }
    return assembleShapeNode(node, content);
  }

  const fillAttrs = fillToSvgAttrs(node.fill);
  const ellipseEl = ellipse({
    cx: node.cx, cy: node.cy, rx: node.rx, ry: node.ry,
    ...fillAttrs,
    ...singleStrokeAttrs,
  } as Parameters<typeof ellipse>[0]);

  if (node.needsWrapper || node.strokeLayers) {
    const content: SvgString[] = [ellipseEl];
    if (node.strokeLayers) {
      content.push(...formatMultiStrokeEllipseLayers(node.strokeLayers, node.cx, node.cy, node.rx, node.ry));
    }
    return assembleShapeNode(node, content);
  }
  return ellipseEl;
}

function formatPathNode(node: RenderPathNode): SvgString {
  const singleStrokeAttrs = node.strokeLayers
    ? {}
    : (node.stroke ? strokeToSvgAttrs(node.stroke) : {});

  if (node.paths.length === 0) {
    return EMPTY_SVG;
  }

  if (node.fillLayers) {
    const content: SvgString[] = [
      ...formatMultiFillPathLayers(node.fillLayers, node.paths, singleStrokeAttrs),
    ];
    if (node.strokeLayers) {
      content.push(...formatMultiStrokePathLayers(node.strokeLayers, node.paths));
    }
    return assembleShapeNode(node, content);
  }

  const defaultFillAttrs = fillToSvgAttrs(node.fill);
  const pathElements: SvgString[] = node.paths.map((p) => {
    const fa = p.fillOverride ? fillToSvgAttrs(p.fillOverride) : defaultFillAttrs;
    return path({
      d: p.d,
      "fill-rule": p.fillRule,
      ...fa,
      ...singleStrokeAttrs,
    } as Parameters<typeof path>[0]);
  });

  if (node.needsWrapper || node.strokeLayers) {
    const content: SvgString[] = [...pathElements];
    if (node.strokeLayers) {
      content.push(...formatMultiStrokePathLayers(node.strokeLayers, node.paths));
    }
    return assembleShapeNode(node, content);
  }
  return pathElements[0];
}

function formatTextNode(node: RenderTextNode): SvgString {
  const defsStr = formatDefs(node.defs);

  if (node.content.mode === "glyphs") {
    if (node.content.d === "") {
      return EMPTY_SVG;
    }
    const pathEl = path({
      d: node.content.d,
      fill: node.fillColor,
      "fill-opacity": node.fillOpacity,
    });
    const content = node.textClipId
      ? g({ "clip-path": `url(#${node.textClipId})` }, pathEl)
      : pathEl;

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
      },
      line.text,
    ),
  );

  const textContent = textElements.length === 1 ? textElements[0] : g({}, ...textElements);
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
 * Format a RenderTree to an SVG string.
 *
 * This is a pure formatter — no attribute resolution happens here.
 * All rendering decisions were made by resolveRenderTree().
 */
export function formatRenderTreeToSvg(renderTree: RenderTree): SvgString {
  const children = renderTree.children.map(formatNode);

  return svg(
    {
      width: renderTree.width,
      height: renderTree.height,
      viewBox: `0 0 ${renderTree.width} ${renderTree.height}`,
    },
    ...children,
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
