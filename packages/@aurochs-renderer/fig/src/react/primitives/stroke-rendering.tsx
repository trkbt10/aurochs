/**
 * @file Stroke rendering — single source of truth for React stroke output
 *
 * Consumes the StrokeRendering discriminated union from RenderTree.
 * All shape components (Frame, Rect, Ellipse, Path) delegate stroke
 * rendering here — no stroke logic in individual node components.
 *
 * SVG counterpart: formatStrokeRendering in svg/scene-renderer.ts
 */

import type { ReactNode } from "react";
import type { StrokeRendering } from "../../scene-graph/render-tree";
import type { CornerRadius } from "../../scene-graph/types";
import { RectShape } from "./rect-shape";

type RectStrokeProps = {
  readonly rendering: StrokeRendering;
  readonly width: number;
  readonly height: number;
  readonly cornerRadius?: CornerRadius;
};

/**
 * Render stroke for a rect/frame shape.
 *
 * Returns SVG elements for the stroke, or null if mode is "uniform"
 * (uniform strokes are applied as attributes on the fill shape itself).
 *
 * For "uniform" mode, returns the stroke attrs to apply on the fill element.
 */
/**
 * Get stroke attrs for uniform mode (to apply on the fill shape element).
 * Other modes return undefined (strokes rendered as separate elements).
 */
export function getRectStrokeAttrs(
  rendering: StrokeRendering | undefined,
): import("../../scene-graph/render").ResolvedStrokeAttrs | undefined {
  if (!rendering || rendering.mode !== "uniform") { return undefined; }
  return rendering.attrs;
}

/**
 * Render separate stroke elements for non-uniform modes.
 * Returns null for "uniform" mode (handled via attrs).
 */
export function RectStrokeElements({ rendering, width, height, cornerRadius }: RectStrokeProps): ReactNode {
  switch (rendering.mode) {
    case "uniform":
      return null; // Applied as attrs on fill element

    case "masked":
      return (
        <g mask={`url(#${rendering.maskId})`}>
          <RectShape
            width={width}
            height={height}
            cornerRadius={cornerRadius}
            fill="none"
            stroke={rendering.attrs.stroke}
            strokeWidth={rendering.attrs.strokeWidth}
            strokeOpacity={rendering.attrs.strokeOpacity}
          />
        </g>
      );

    case "layers":
      return (
        <>
          {rendering.layers.map((layer, i) => (
            <RectShape
              key={i}
              width={width}
              height={height}
              cornerRadius={cornerRadius}
              fill="none"
              stroke={layer.attrs.stroke}
              strokeWidth={layer.attrs.strokeWidth}
              strokeOpacity={layer.attrs.strokeOpacity}
              style={layer.blendMode ? { mixBlendMode: layer.blendMode as React.CSSProperties["mixBlendMode"] } : undefined}
            />
          ))}
        </>
      );

    case "individual":
      return (
        <>
          {rendering.sides.top > 0 && <line x1={0} y1={0} x2={width} y2={0} stroke={rendering.color} strokeOpacity={rendering.opacity} strokeWidth={rendering.sides.top} />}
          {rendering.sides.right > 0 && <line x1={width} y1={0} x2={width} y2={height} stroke={rendering.color} strokeOpacity={rendering.opacity} strokeWidth={rendering.sides.right} />}
          {rendering.sides.bottom > 0 && <line x1={0} y1={height} x2={width} y2={height} stroke={rendering.color} strokeOpacity={rendering.opacity} strokeWidth={rendering.sides.bottom} />}
          {rendering.sides.left > 0 && <line x1={0} y1={0} x2={0} y2={height} stroke={rendering.color} strokeOpacity={rendering.opacity} strokeWidth={rendering.sides.left} />}
        </>
      );
  }
}

type EllipseStrokeProps = {
  readonly rendering: StrokeRendering;
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
};

/**
 * Get stroke attrs for uniform mode on ellipse.
 */
export function getEllipseStrokeAttrs(
  rendering: StrokeRendering | undefined,
): Record<string, string | number | undefined> | undefined {
  return getRectStrokeAttrs(rendering); // Same logic
}

/**
 * Render separate stroke elements for non-uniform ellipse modes.
 */
export function EllipseStrokeElements({ rendering, cx, cy, rx, ry }: EllipseStrokeProps): ReactNode {
  if (rendering.mode === "uniform") { return null; }
  if (rendering.mode === "layers") {
    return (
      <>
        {rendering.layers.map((layer, i) => (
          <ellipse
            key={i}
            cx={cx} cy={cy} rx={rx} ry={ry}
            fill="none"
            stroke={layer.attrs.stroke}
            strokeWidth={layer.attrs.strokeWidth}
            strokeOpacity={layer.attrs.strokeOpacity}
            style={layer.blendMode ? { mixBlendMode: layer.blendMode as React.CSSProperties["mixBlendMode"] } : undefined}
          />
        ))}
      </>
    );
  }
  return null;
}

type PathStrokeProps = {
  readonly rendering: StrokeRendering;
  readonly paths: readonly { readonly d: string; readonly fillRule?: "evenodd" }[];
};

/**
 * Get stroke attrs for uniform mode on path.
 */
export function getPathStrokeAttrs(
  rendering: StrokeRendering | undefined,
): Record<string, string | number | undefined> | undefined {
  return getRectStrokeAttrs(rendering);
}

/**
 * Render separate stroke elements for non-uniform path modes.
 */
export function PathStrokeElements({ rendering, paths }: PathStrokeProps): ReactNode {
  if (rendering.mode === "uniform") { return null; }
  if (rendering.mode === "layers") {
    return (
      <>
        {rendering.layers.map((layer, i) =>
          paths.map((p, j) => (
            <path
              key={`${i}-${j}`}
              d={p.d}
              fillRule={p.fillRule}
              fill="none"
              stroke={layer.attrs.stroke}
              strokeWidth={layer.attrs.strokeWidth}
              strokeOpacity={layer.attrs.strokeOpacity}
              style={layer.blendMode ? { mixBlendMode: layer.blendMode as React.CSSProperties["mixBlendMode"] } : undefined}
            />
          )),
        )}
      </>
    );
  }
  return null;
}
