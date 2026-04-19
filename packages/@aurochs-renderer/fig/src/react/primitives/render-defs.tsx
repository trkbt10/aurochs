/**
 * @file RenderDef formatting for React
 *
 * Converts pre-resolved RenderDef objects to React JSX elements.
 * No computation — pure formatting.
 */

import type { ReactNode } from "react";
import type {
  RenderDef,
  RenderLinearGradientDef,
  RenderRadialGradientDef,
  RenderAngularGradientDef,
  RenderDiamondGradientDef,
  RenderFilterDef,
  RenderClipPathDef,
  RenderPatternDef,
  RenderMaskDef,
  ClipPathShape,
} from "../../scene-graph/render-tree";
import { RenderNodeComponent } from "../nodes/RenderNodeComponent";
import type { ResolvedFilterPrimitive, ResolvedGradientStop, ResolvedAngularGradient, ResolvedDiamondGradient } from "../../scene-graph/render";

// =============================================================================
// Gradient Stops
// =============================================================================

function formatGradientStops(stops: readonly ResolvedGradientStop[]): ReactNode[] {
  return stops.map((s, i) => (
    <stop
      key={i}
      offset={s.offset}
      stopColor={s.stopColor}
      stopOpacity={s.stopOpacity}
    />
  ));
}

// =============================================================================
// Filter Primitives
// =============================================================================

function formatFilterPrimitive(p: ResolvedFilterPrimitive, key: number): ReactNode {
  switch (p.type) {
    case "feFlood":
      return <feFlood key={key} floodColor={p.floodColor} floodOpacity={p.floodOpacity} result={p.result} />;
    case "feColorMatrix":
      return <feColorMatrix key={key} in={p.in} type={p.matrixType} values={p.values} result={p.result} />;
    case "feOffset":
      return <feOffset key={key} in={p.in} dx={p.dx} dy={p.dy} result={p.result} />;
    case "feGaussianBlur":
      return <feGaussianBlur key={key} in={p.in} stdDeviation={p.stdDeviation} result={p.result} />;
    case "feBlend":
      return <feBlend key={key} mode={p.mode} in={p.in} in2={p.in2} result={p.result} />;
    case "feComposite":
      return <feComposite key={key} in={p.in} in2={p.in2} operator={p.operator} k2={p.k2} k3={p.k3} result={p.result} />;
    case "feMorphology":
      return <feMorphology key={key} operator={p.operator} radius={p.radius} />;
    case "feMerge":
      return (
        <feMerge key={key}>
          {p.nodes.map((nodeIn, i) => <feMergeNode key={i} in={nodeIn} />)}
        </feMerge>
      );
  }
}

// =============================================================================
// Clip Path Shape
// =============================================================================

function formatClipPathShape(shape: ClipPathShape): ReactNode {
  switch (shape.kind) {
    case "path":
      return <path d={shape.d} />;
    case "ellipse":
      return <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />;
    case "rect":
      return (
        <rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          rx={shape.rx}
          ry={shape.ry}
        />
      );
  }
}

// =============================================================================
// Def Formatters
// =============================================================================

function formatGradientDef(def: RenderLinearGradientDef | RenderRadialGradientDef): ReactNode {
  const d = def.def;
  const stops = formatGradientStops(d.stops);

  switch (d.type) {
    case "linear-gradient":
      return (
        <linearGradient key={d.id} id={d.id} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} gradientUnits={d.gradientUnits}>
          {stops}
        </linearGradient>
      );
    case "radial-gradient":
      return (
        <radialGradient key={d.id} id={d.id} cx={d.cx} cy={d.cy} r={d.r} gradientUnits={d.gradientUnits} gradientTransform={typeof d.gradientTransform === "string" ? d.gradientTransform : undefined}>
          {stops}
        </radialGradient>
      );
  }
}

/**
 * Build CSS conic-gradient string from angular gradient def.
 */
function buildConicGradientCSS(d: ResolvedAngularGradient): string {
  const fromDeg = (d.rotation * 180) / Math.PI;
  const stopParts = d.stops.map((s) => {
    const opacity = s.stopOpacity !== undefined ? s.stopOpacity : 1;
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
 * Build CSS for diamond gradient approximation.
 */
function buildDiamondGradientCSS(d: ResolvedDiamondGradient): string {
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
  const center = stopParts[0] ?? "transparent";
  const edge = stopParts[stopParts.length - 1] ?? "transparent";
  return `radial-gradient(ellipse 50% 50% at ${d.cx} ${d.cy}, ${center}, ${edge})`;
}

// Stop colour sampling shared with the SVG-native sectored fallback.
// See svg/scene-renderer.ts::sampleGradientAt for the full contract; this
// JS-side copy exists because the React renderer must emit native React
// elements, not SvgString primitives.
function interpolateStopColorJS(a: string, b: string, t: number): string {
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

function sampleGradientAtJS(
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
      return interpolateStopColorJS(stops[i - 1].stopColor, stops[i].stopColor, u);
    }
  }
  return stops[stops.length - 1].stopColor;
}

/**
 * Angular gradient as an SVG-native sectored approximation. See
 * svg/scene-renderer.ts::formatAngularGradientDef for the rationale:
 * Chromium refuses to render `<foreignObject>` children when the
 * foreignObject is nested inside a <pattern>, so a CSS conic-gradient
 * approach produced a blank fill (Hologram FRAME 126:420 bug).
 */
function formatAngularGradientDef(def: RenderAngularGradientDef): ReactNode {
  const d = def.def;
  const w = d.elementWidth ?? 1;
  const h = d.elementHeight ?? 1;
  const cx = parseFloat(d.cx) * (d.cx.endsWith("%") ? w / 100 : 1) || (w / 2);
  const cy = parseFloat(d.cy) * (d.cy.endsWith("%") ? h / 100 : 1) || (h / 2);
  const radius = Math.hypot(w, h);
  const fromDeg = d.rotation - 90;
  const SECTORS = 64;
  const paths: ReactNode[] = [];
  for (let i = 0; i < SECTORS; i++) {
    const a0 = (i / SECTORS) * 360 + fromDeg;
    const a1 = ((i + 1) / SECTORS) * 360 + fromDeg;
    const a0r = (a0 - 0.3) * Math.PI / 180;
    const a1r = (a1 + 0.3) * Math.PI / 180;
    const x0 = cx + Math.cos(a0r) * radius;
    const y0 = cy + Math.sin(a0r) * radius;
    const x1 = cx + Math.cos(a1r) * radius;
    const y1 = cy + Math.sin(a1r) * radius;
    const midT = (i + 0.5) / SECTORS;
    const color = sampleGradientAtJS(d.stops, midT);
    const pathD = `M${cx},${cy} L${x0},${y0} L${x1},${y1} Z`;
    paths.push(<path key={i} d={pathD} fill={color} />);
  }
  return (
    <pattern key={d.id} id={d.id} patternUnits="userSpaceOnUse" width={w} height={h}>
      {paths}
    </pattern>
  );
}

function formatDiamondGradientDef(def: RenderDiamondGradientDef): ReactNode {
  const d = def.def;
  const w = d.elementWidth ?? 1;
  const h = d.elementHeight ?? 1;
  const cx = parseFloat(d.cx) * (d.cx.endsWith("%") ? w / 100 : 1) || (w / 2);
  const cy = parseFloat(d.cy) * (d.cy.endsWith("%") ? h / 100 : 1) || (h / 2);
  const dx = Math.max(w - cx, cx);
  const dy = Math.max(h - cy, cy);
  const steps = 32;
  const paths: ReactNode[] = [];
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const color = sampleGradientAtJS(d.stops, t);
    const rx = dx * t;
    const ry = dy * t;
    const pathD = `M${cx - rx},${cy} L${cx},${cy - ry} L${cx + rx},${cy} L${cx},${cy + ry} Z`;
    paths.push(<path key={i} d={pathD} fill={color} />);
  }
  return (
    <pattern key={d.id} id={d.id} patternUnits="userSpaceOnUse" width={w} height={h}>
      {paths}
    </pattern>
  );
}

function formatFilterDef(def: RenderFilterDef): ReactNode {
  const f = def.filter;
  const primitiveElements = f.primitives.map((p, i) => formatFilterPrimitive(p, i));
  const bounds = f.filterBounds;
  return (
    <filter
      key={f.id}
      id={f.id}
      x={bounds?.x}
      y={bounds?.y}
      width={bounds?.width}
      height={bounds?.height}
      filterUnits={bounds ? "userSpaceOnUse" : undefined}
      colorInterpolationFilters={bounds ? "sRGB" : undefined}
    >
      {primitiveElements}
    </filter>
  );
}

function formatClipPathDef(def: RenderClipPathDef): ReactNode {
  return (
    <clipPath key={def.id} id={def.id}>
      {formatClipPathShape(def.shape)}
    </clipPath>
  );
}

function formatPatternDef(def: RenderPatternDef): ReactNode {
  const d = def.def;
  return (
    <pattern
      key={d.id}
      id={d.id}
      patternContentUnits={d.patternContentUnits === "objectBoundingBox" ? "objectBoundingBox" : undefined}
      patternUnits={d.patternContentUnits === "userSpaceOnUse" ? "userSpaceOnUse" : undefined}
      width={d.width}
      height={d.height}
      patternTransform={d.patternTransform}
    >
      <image
        href={d.dataUri}
        x={d.imageTransform ? undefined : 0}
        y={d.imageTransform ? undefined : 0}
        width={d.imageWidth}
        height={d.imageHeight}
        preserveAspectRatio={d.preserveAspectRatio}
        transform={d.imageTransform}
      />
    </pattern>
  );
}

// =============================================================================
// Public API
// =============================================================================

function formatMaskDef(def: RenderMaskDef): ReactNode {
  return (
    <mask key={def.id} id={def.id} style={{ maskType: "luminance" }}>
      <g fill="white">
        <RenderNodeComponent node={def.maskContent} />
      </g>
    </mask>
  );
}

function formatDef(def: RenderDef): ReactNode {
  switch (def.type) {
    case "linear-gradient":
    case "radial-gradient":
      return formatGradientDef(def);
    case "angular-gradient":
      return formatAngularGradientDef(def);
    case "diamond-gradient":
      return formatDiamondGradientDef(def);
    case "filter":
      return formatFilterDef(def);
    case "clip-path":
      return formatClipPathDef(def);
    case "pattern":
      return formatPatternDef(def);
    case "mask":
      return formatMaskDef(def);
    case "stroke-mask":
      // Stroke-align mask for INSIDE/OUTSIDE clipping.
      //   INSIDE:  white-filled shape → stroke only visible inside shape.
      //   OUTSIDE: inverted — large white background with black shape hole
      //            → stroke only visible outside shape.
      //
      // BUG GUARD: SVG `<mask>` does NOT accept `fill` directly. The fill
      // must be on a wrapping `<g>` or the mask shape itself, otherwise
      // the mask becomes fully black (everything masked out) and the
      // masked element (the stroke) disappears entirely.
      // This was the root cause of the Bento logo / Cron widget appearing
      // as empty white squares on Cover / Components pages: the parent
      // FRAME's stroke-mask masked out its own children.
      if (def.strokeAlign === "OUTSIDE") {
        return (
          <mask key={def.id} id={def.id} style={{ maskType: "luminance" }}>
            <rect x={-100} y={-100} width={10000} height={10000} fill="white" />
            <g fill="black">{formatClipPathShape(def.shape)}</g>
          </mask>
        );
      }
      return (
        <mask key={def.id} id={def.id} style={{ maskType: "luminance" }}>
          <g fill="white">{formatClipPathShape(def.shape)}</g>
        </mask>
      );
  }
}

/**
 * Format an array of RenderDefs to a <defs> element, or null if empty.
 */
export function formatRenderDefs(renderDefs: readonly RenderDef[]): ReactNode {
  if (renderDefs.length === 0) { return null; }
  return <defs>{renderDefs.map(formatDef)}</defs>;
}
