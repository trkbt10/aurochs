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
      return <feFlood key={key} floodOpacity={p.floodOpacity} result={p.result} />;
    case "feColorMatrix":
      return <feColorMatrix key={key} in={p.in} type={p.matrixType} values={p.values} result={p.result} />;
    case "feOffset":
      return <feOffset key={key} dx={p.dx} dy={p.dy} />;
    case "feGaussianBlur":
      return <feGaussianBlur key={key} in={p.in} stdDeviation={p.stdDeviation} />;
    case "feBlend":
      return <feBlend key={key} mode={p.mode} in={p.in} in2={p.in2} result={p.result} />;
    case "feComposite":
      return <feComposite key={key} in2={p.in2} operator={p.operator} k2={p.k2} k3={p.k3} />;
    case "feMorphology":
      return <feMorphology key={key} operator={p.operator} radius={p.radius} />;
  }
}

// =============================================================================
// Clip Path Shape
// =============================================================================

function formatClipPathShape(shape: ClipPathShape): ReactNode {
  if (shape.kind === "path") {
    return <path d={shape.d} />;
  }
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

function formatAngularGradientDef(def: RenderAngularGradientDef): ReactNode {
  const d = def.def;
  const css = buildConicGradientCSS(d);
  return (
    <pattern key={d.id} id={d.id} patternContentUnits="objectBoundingBox" width={1} height={1}>
      <foreignObject x={0} y={0} width={1} height={1}>
        <div style={{ width: "100%", height: "100%", background: css }} />
      </foreignObject>
    </pattern>
  );
}

function formatDiamondGradientDef(def: RenderDiamondGradientDef): ReactNode {
  const d = def.def;
  const css = buildDiamondGradientCSS(d);
  return (
    <pattern key={d.id} id={d.id} patternContentUnits="objectBoundingBox" width={1} height={1}>
      <foreignObject x={0} y={0} width={1} height={1}>
        <div style={{ width: "100%", height: "100%", background: css }} />
      </foreignObject>
    </pattern>
  );
}

function formatFilterDef(def: RenderFilterDef): ReactNode {
  const f = def.filter;
  const primitiveElements = f.primitives.map((p, i) => formatFilterPrimitive(p, i));
  return <filter key={f.id} id={f.id}>{primitiveElements}</filter>;
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
        x={0}
        y={0}
        width={d.imageWidth}
        height={d.imageHeight}
        preserveAspectRatio={d.preserveAspectRatio}
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
  }
}

/**
 * Format an array of RenderDefs to a <defs> element, or null if empty.
 */
export function formatRenderDefs(renderDefs: readonly RenderDef[]): ReactNode {
  if (renderDefs.length === 0) { return null; }
  return <defs>{renderDefs.map(formatDef)}</defs>;
}
