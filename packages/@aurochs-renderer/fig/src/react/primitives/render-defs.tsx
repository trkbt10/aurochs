/**
 * @file RenderDef formatting for React
 *
 * Converts pre-resolved RenderDef objects to React JSX elements.
 * No computation — pure formatting.
 */

import type { ReactNode } from "react";
import type {
  RenderDef,
  RenderGradientDef,
  RenderFilterDef,
  RenderClipPathDef,
  RenderPatternDef,
  ClipPathShape,
} from "../../scene-graph/render-tree";
import type { ResolvedFilterPrimitive, ResolvedGradientStop } from "../../scene-graph/render";

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
  }
}

// =============================================================================
// Clip Path Shape
// =============================================================================

function formatClipPathShape(shape: ClipPathShape): ReactNode {
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

function formatGradientDef(def: RenderGradientDef): ReactNode {
  const d = def.def;
  const stops = formatGradientStops(d.stops);

  if (d.type === "linear-gradient") {
    return (
      <linearGradient key={d.id} id={d.id} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2}>
        {stops}
      </linearGradient>
    );
  }

  return (
    <radialGradient key={d.id} id={d.id} cx={d.cx} cy={d.cy} r={d.r}>
      {stops}
    </radialGradient>
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

function formatDef(def: RenderDef): ReactNode {
  switch (def.type) {
    case "linear-gradient":
    case "radial-gradient":
      return formatGradientDef(def);
    case "filter":
      return formatFilterDef(def);
    case "clip-path":
      return formatClipPathDef(def);
    case "pattern":
      return formatPatternDef(def);
  }
}

/**
 * Format an array of RenderDefs to a <defs> element, or null if empty.
 */
export function formatRenderDefs(renderDefs: readonly RenderDef[]): ReactNode {
  if (renderDefs.length === 0) { return null; }
  return <defs>{renderDefs.map(formatDef)}</defs>;
}
