/**
 * @file Compute the axis-aligned bounding box of a list of `PathContour`s.
 *
 * Background: paths emitted by Figma's vector network do **not** start
 * at (0, 0). The vector node's `transform.m02 / m12` already places the
 * path in user space, and the path's commands carry coordinates in the
 * vector's *local* frame whose origin is the path's bbox top-left
 * relative to the node — but that bbox is **not** itself anchored at
 * (0, 0). For example the airplane silhouette in edge-cases.fig's
 * Hologram has size 19.88×19.87 but its first command sits at
 * (~14, ~4); the actual bbox spans (-0.06, -1.07) → (19.94, 18.93).
 *
 * `linearGradientAttrs` and `radialGradientAttrs` need this bbox to
 * convert paint.transform's normalized coordinates into pixel
 * endpoints — the gradient's normalized origin (0, 0) maps to bbox
 * top-left, not to path-local (0, 0). Without the bbox the gradient
 * sits inside an arbitrary frame and shifts away from the path it's
 * supposed to fill, producing the off-axis colour bands seen in the
 * Hologram airplane and the Passport world-map dots.
 *
 * The bbox returned here is computed from the path commands' control
 * points (an outer-bound approximation of the curve, not the tight
 * extremum). For Figma-emitted paths the cubic Bezier control points
 * are typically near the curve, so the over-approximation is small;
 * paint.transform's `m02 / m12` already account for the offset Figma
 * expects, so we mirror the same bbox semantic Figma uses internally.
 */

import type { PathContour } from "./types";

export type PathBbox = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Compute the bbox enclosing every command of every contour. Includes
 * curve control points (over-approximation; tighter requires roots of
 * the bezier derivative which Figma does not require for gradient
 * mapping — the engine itself uses the same control-point hull).
 *
 * Returns `undefined` when no commands are present (caller falls back
 * to the node's own size with origin (0, 0)).
 */
export function computePathContoursBbox(contours: readonly PathContour[]): PathBbox | undefined {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let any = false;
  for (const c of contours) {
    for (const cmd of c.commands) {
      switch (cmd.type) {
        case "M":
        case "L":
        case "A":
          any = true;
          if (cmd.x < minX) minX = cmd.x;
          if (cmd.y < minY) minY = cmd.y;
          if (cmd.x > maxX) maxX = cmd.x;
          if (cmd.y > maxY) maxY = cmd.y;
          break;
        case "Q":
          any = true;
          if (cmd.x1 < minX) minX = cmd.x1;
          if (cmd.y1 < minY) minY = cmd.y1;
          if (cmd.x1 > maxX) maxX = cmd.x1;
          if (cmd.y1 > maxY) maxY = cmd.y1;
          if (cmd.x < minX) minX = cmd.x;
          if (cmd.y < minY) minY = cmd.y;
          if (cmd.x > maxX) maxX = cmd.x;
          if (cmd.y > maxY) maxY = cmd.y;
          break;
        case "C":
          any = true;
          if (cmd.x1 < minX) minX = cmd.x1;
          if (cmd.y1 < minY) minY = cmd.y1;
          if (cmd.x1 > maxX) maxX = cmd.x1;
          if (cmd.y1 > maxY) maxY = cmd.y1;
          if (cmd.x2 < minX) minX = cmd.x2;
          if (cmd.y2 < minY) minY = cmd.y2;
          if (cmd.x2 > maxX) maxX = cmd.x2;
          if (cmd.y2 > maxY) maxY = cmd.y2;
          if (cmd.x < minX) minX = cmd.x;
          if (cmd.y < minY) minY = cmd.y;
          if (cmd.x > maxX) maxX = cmd.x;
          if (cmd.y > maxY) maxY = cmd.y;
          break;
        case "Z":
          break;
      }
    }
  }
  if (!any) return undefined;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
