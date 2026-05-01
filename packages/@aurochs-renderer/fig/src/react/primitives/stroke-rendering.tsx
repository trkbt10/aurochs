/**
 * @file Stroke rendering — single source of truth for React stroke output
 *
 * Consumes StrokeRendering (with embedded StrokeShape) from RenderTree.
 * No node-type-specific logic — the shape is described by StrokeShape,
 * and all node components delegate here via a single call.
 *
 * SVG counterpart: formatStrokeRendering() in svg/scene-renderer.ts.
 * Both consume the same StrokeRendering type — structural parity is
 * enforced by TypeScript's exhaustive switch.
 */

import type { ReactNode } from "react";
import type { StrokeRendering, StrokeShape } from "../../scene-graph/render-tree";
import type { ResolvedStrokeAttrs } from "../../scene-graph/render";
import { RectShape } from "./rect-shape";

/** SVG-DOM-safe subset of ResolvedStrokeAttrs — excludes `strokeAlign`,
 * which is scene-graph metadata (INSIDE/OUTSIDE) not an SVG attribute.
 * Spreading the full ResolvedStrokeAttrs to a DOM element causes React
 * to warn about an unknown `strokeAlign` prop and attaches it to the
 * DOM as a string. Callers use this type when passing attrs to a JSX
 * SVG element via `{...attrs}`. */
export type UniformStrokeDomAttrs = Omit<ResolvedStrokeAttrs, "strokeAlign">;

/**
 * Get stroke attrs for uniform mode (apply directly on the fill shape).
 * Non-uniform modes return undefined — strokes are rendered separately.
 * The returned attrs omit `strokeAlign` (scene-graph metadata, not SVG).
 */
export function getUniformStrokeAttrs(
  sr: StrokeRendering | undefined,
): UniformStrokeDomAttrs | undefined {
  if (!sr || sr.mode !== "uniform") { return undefined; }
  const { strokeAlign: _ignored, ...domAttrs } = sr.attrs;
  return domAttrs;
}

/**
 * Render a stroked shape element from StrokeShape + stroke attrs.
 */
function StrokedShape({ shape, stroke }: { shape: StrokeShape; stroke: ResolvedStrokeAttrs }): ReactNode {
  const sAttrs = {
    stroke: stroke.stroke,
    strokeWidth: stroke.strokeWidth,
    strokeOpacity: stroke.strokeOpacity,
    strokeLinecap: stroke.strokeLinecap,
    strokeLinejoin: stroke.strokeLinejoin,
    strokeDasharray: stroke.strokeDasharray,
  };

  switch (shape.kind) {
    case "rect":
      return <RectShape width={shape.width} height={shape.height} cornerRadius={shape.cornerRadius} fill="none" {...sAttrs} />;
    case "ellipse":
      return shape.rx === shape.ry
        ? <circle cx={shape.cx} cy={shape.cy} r={shape.rx} fill="none" {...sAttrs} />
        : <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} fill="none" {...sAttrs} />;
    case "path":
      return (
        <>
          {shape.paths.map((p, i) => (
            <path key={i} d={p.d} fillRule={p.fillRule} fill="none" {...sAttrs} />
          ))}
        </>
      );
  }
}

/**
 * Render separate stroke elements from StrokeRendering.
 * Returns null for uniform mode (handled via attrs on fill shape).
 *
 * This is the SINGLE stroke rendering component for the React backend.
 * All node components call this — no stroke logic elsewhere.
 */
export function StrokeRenderingElements({ sr }: { sr: StrokeRendering }): ReactNode {
  switch (sr.mode) {
    case "uniform":
      return null;

    case "masked":
      return (
        <g mask={`url(#${sr.maskId})`}>
          <StrokedShape shape={sr.shape} stroke={sr.attrs} />
        </g>
      );

    case "layers":
      return (
        <>
          {sr.layers.map((layer, i) => {
            const lAttrs: ResolvedStrokeAttrs = {
              stroke: layer.attrs.stroke,
              strokeWidth: layer.attrs.strokeWidth,
              strokeOpacity: layer.attrs.strokeOpacity,
              strokeLinecap: layer.attrs.strokeLinecap,
              strokeLinejoin: layer.attrs.strokeLinejoin,
              strokeDasharray: layer.attrs.strokeDasharray,
            };
            return (
              <g key={i} style={layer.blendMode ? { mixBlendMode: layer.blendMode as React.CSSProperties["mixBlendMode"] } : undefined}>
                <StrokedShape shape={sr.shape} stroke={lAttrs} />
              </g>
            );
          })}
        </>
      );

    case "individual": {
      // sign mirrors svg/scene-renderer.ts: +1 INSIDE, -1 OUTSIDE, 0 CENTER.
      // Required so OUTSIDE-aligned per-side strokes (e.g. the 299×1
      // _Separator INSTANCE between Activity View Action rows) paint
      // their band ABOVE the geometry instead of inside it.
      const sign = sr.strokeAlign === "OUTSIDE" ? -1 : sr.strokeAlign === "INSIDE" ? 1 : 0;
      const topY = sign * (sr.sides.top / 2);
      const bottomY = sr.height + (sign === 0 ? 0 : -sign * (sr.sides.bottom / 2));
      const leftX = sign * (sr.sides.left / 2);
      const rightX = sr.width + (sign === 0 ? 0 : -sign * (sr.sides.right / 2));
      const lines = (
        <>
          {sr.sides.top > 0 && <line x1={0} y1={topY} x2={sr.width} y2={topY} stroke={sr.color} strokeOpacity={sr.opacity} strokeWidth={sr.sides.top} />}
          {sr.sides.right > 0 && <line x1={rightX} y1={0} x2={rightX} y2={sr.height} stroke={sr.color} strokeOpacity={sr.opacity} strokeWidth={sr.sides.right} />}
          {sr.sides.bottom > 0 && <line x1={0} y1={bottomY} x2={sr.width} y2={bottomY} stroke={sr.color} strokeOpacity={sr.opacity} strokeWidth={sr.sides.bottom} />}
          {sr.sides.left > 0 && <line x1={leftX} y1={0} x2={leftX} y2={sr.height} stroke={sr.color} strokeOpacity={sr.opacity} strokeWidth={sr.sides.left} />}
        </>
      );
      if (sr.cornerRadius && sr.cornerRadius > 0 && sr.strokeAlign !== "OUTSIDE") {
        const clipId = `inside-stroke-clip-${sr.width}-${sr.height}-${sr.cornerRadius}`.replace(/\./g, "_");
        return (
          <g clipPath={`url(#${clipId})`}>
            <defs>
              <clipPath id={clipId}>
                <rect x={0} y={0} width={sr.width} height={sr.height} rx={sr.cornerRadius} ry={sr.cornerRadius} />
              </clipPath>
            </defs>
            {lines}
          </g>
        );
      }
      return lines;
    }
  }
}
