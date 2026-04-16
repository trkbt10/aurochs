/**
 * @file Stroke rendering primitives for React
 *
 * Shared between Frame and Rect components. Handles:
 * - INSIDE/OUTSIDE stroke (masked)
 * - Per-side individual strokes
 *
 * SVG counterpart: formatMaskedRectStroke / formatIndividualStrokes
 * in svg/scene-renderer.ts
 */

import type { ReactNode } from "react";
import type { ResolvedStrokeAttrs } from "../../scene-graph/render";
import type { CornerRadius } from "../../scene-graph/types";
import { RectShape } from "./rect-shape";

type MaskedStrokeProps = {
  readonly maskId: string;
  readonly stroke: ResolvedStrokeAttrs;
  readonly width: number;
  readonly height: number;
  readonly cornerRadius?: CornerRadius;
};

/**
 * Render a stroked rect inside a mask for INSIDE/OUTSIDE stroke alignment.
 */
export function MaskedRectStroke({ maskId, stroke, width, height, cornerRadius }: MaskedStrokeProps) {
  return (
    <g mask={`url(#${maskId})`}>
      <RectShape
        width={width}
        height={height}
        cornerRadius={cornerRadius}
        fill="none"
        stroke={stroke.stroke}
        strokeWidth={stroke.strokeWidth}
        strokeOpacity={stroke.strokeOpacity}
      />
    </g>
  );
}

type IndividualStrokesProps = {
  readonly strokes: {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
    readonly strokeColor: string;
    readonly strokeOpacity?: number;
  };
  readonly width: number;
  readonly height: number;
};

/**
 * Render per-side strokes as individual <line> elements.
 */
export function IndividualStrokeLines({ strokes: s, width, height }: IndividualStrokesProps): ReactNode {
  return (
    <>
      {s.top > 0 && <line x1={0} y1={0} x2={width} y2={0} stroke={s.strokeColor} strokeOpacity={s.strokeOpacity} strokeWidth={s.top} />}
      {s.right > 0 && <line x1={width} y1={0} x2={width} y2={height} stroke={s.strokeColor} strokeOpacity={s.strokeOpacity} strokeWidth={s.right} />}
      {s.bottom > 0 && <line x1={0} y1={height} x2={width} y2={height} stroke={s.strokeColor} strokeOpacity={s.strokeOpacity} strokeWidth={s.bottom} />}
      {s.left > 0 && <line x1={0} y1={0} x2={0} y2={height} stroke={s.strokeColor} strokeOpacity={s.strokeOpacity} strokeWidth={s.left} />}
    </>
  );
}
