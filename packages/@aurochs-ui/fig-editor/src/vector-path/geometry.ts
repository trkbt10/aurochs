/** @file Shared geometry primitives for vector path editing and drafting. */
/* eslint-disable jsdoc/require-jsdoc -- Small geometry primitives are intentionally named as the local vector-path math contract. */

export type VectorPathPoint = {
  readonly x: number;
  readonly y: number;
};

export type VectorPathSegmentLine = {
  readonly key: string;
  readonly from: VectorPathPoint;
  readonly to: VectorPathPoint;
};

export type VectorPathBounds = {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
};






export function sampleCubicBezier({
  start,
  control1,
  control2,
  end,
  steps = 32,
}: {
  readonly start: VectorPathPoint;
  readonly control1: VectorPathPoint;
  readonly control2: VectorPathPoint;
  readonly end: VectorPathPoint;
  readonly steps?: number;
}): readonly VectorPathPoint[] {
  if (steps < 1) {
    throw new Error("Cubic Bezier sampling requires at least one step");
  }
  const samples: VectorPathPoint[] = [];
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const oneMinusT = 1 - t;
    samples.push({
      x: oneMinusT ** 3 * start.x
        + 3 * oneMinusT ** 2 * t * control1.x
        + 3 * oneMinusT * t ** 2 * control2.x
        + t ** 3 * end.x,
      y: oneMinusT ** 3 * start.y
        + 3 * oneMinusT ** 2 * t * control1.y
        + 3 * oneMinusT * t ** 2 * control2.y
        + t ** 3 * end.y,
    });
  }
  return samples;
}






export function computeVectorPathPointBounds(points: readonly VectorPathPoint[]): VectorPathBounds {
  if (points.length === 0) {
    throw new Error("Vector path bounds require at least one point");
  }
  return points.reduce(
    (bounds, point) => ({
      left: Math.min(bounds.left, point.x),
      top: Math.min(bounds.top, point.y),
      right: Math.max(bounds.right, point.x),
      bottom: Math.max(bounds.bottom, point.y),
    }),
    { left: points[0]!.x, top: points[0]!.y, right: points[0]!.x, bottom: points[0]!.y },
  );
}






export function formatVectorPathNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : Number(value.toFixed(3)).toString();
}
