/**
 * @file Gradient coordinate finalization
 *
 * Converts gradient defs from objectBoundingBox percentages to
 * userSpaceOnUse pixel coordinates when the original Figma gradient
 * transform matrix is available.
 *
 * This module exists because gradient coordinate resolution depends on
 * two inputs that live at different levels:
 *   1. The Fill data (gradient stops, transform matrix) — known at fill level
 *   2. The element size (width, height) — known at node level
 *
 * resolveFill() produces ResolvedFillDef with the raw gradientTransform
 * preserved. This module's finalizeGradientDefs() is called by the node
 * resolver to apply the element size and produce final coordinates.
 *
 * Architecture:
 *   resolveFill(fill) → ResolvedFillDef (with raw transform)
 *       ↓
 *   finalizeGradientDefs(defs, elementSize) ← called in node resolver
 *       ↓
 *   ResolvedFillDef (with userSpaceOnUse pixel coordinates)
 */

import type { AffineMatrix } from "../types";
import type { ResolvedFillDef, ResolvedLinearGradient, ResolvedRadialGradient } from "./fill";
import type { RenderDef } from "../render-tree/types";

/**
 * Element bounding box for gradient coordinate computation.
 */
export type ElementSize = { readonly width: number; readonly height: number };

/**
 * Finalize gradient defs by converting from objectBoundingBox to
 * userSpaceOnUse when gradientTransform data is available.
 *
 * Mutates the defs array in place (replaces gradient def objects).
 * Non-gradient defs are left unchanged.
 */
export function finalizeGradientDefs(
  defs: RenderDef[],
  elementSize: ElementSize,
): void {
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    if (def.type === "linear-gradient") {
      const finalized = finalizeLinearGradient(def.def, elementSize);
      if (finalized) {
        defs[i] = { type: "linear-gradient", def: finalized } as RenderDef;
      }
    } else if (def.type === "radial-gradient") {
      const finalized = finalizeRadialGradient(def.def, elementSize);
      if (finalized) {
        defs[i] = { type: "radial-gradient", def: finalized } as RenderDef;
      }
    }
  }
}

/**
 * Convert a linear gradient from objectBoundingBox to userSpaceOnUse.
 *
 * Figma's gradient transform maps gradient space → normalized object space:
 *   (1, 0) → start (0% stop) = (m00 + m02, m10 + m12)
 *   (0, 0) → end (100% stop) = (m02, m12)
 *
 * Multiplying by elementSize converts to pixel coordinates.
 */
function finalizeLinearGradient(
  def: ResolvedLinearGradient,
  elementSize: ElementSize,
): ResolvedLinearGradient | undefined {
  const gt = def.gradientTransform as AffineMatrix | undefined;
  if (!gt) { return undefined; }

  const w = elementSize.width;
  const h = elementSize.height;
  const x1 = (gt.m00 + gt.m02) * w;
  const y1 = (gt.m10 + gt.m12) * h;
  const x2 = gt.m02 * w;
  const y2 = gt.m12 * h;

  return {
    ...def,
    x1: `${x1}`,
    y1: `${y1}`,
    x2: `${x2}`,
    y2: `${y2}`,
    gradientUnits: "userSpaceOnUse",
    gradientTransform: undefined, // Consumed — coordinates are now in pixels
  };
}

/**
 * Convert a radial gradient from objectBoundingBox to userSpaceOnUse.
 *
 * Decomposes the 2x2 rotation+scale part of the transform matrix into
 * center, angle, and ellipse radii for SVG gradientTransform.
 */
function finalizeRadialGradient(
  def: ResolvedRadialGradient,
  elementSize: ElementSize,
): ResolvedRadialGradient | undefined {
  const gt = def.gradientTransform as AffineMatrix | undefined;
  if (!gt) { return undefined; }

  const w = elementSize.width;
  const h = elementSize.height;

  // Center: transform × (0.5, 0.5) → pixel
  const cx = (gt.m00 * 0.5 + gt.m01 * 0.5 + gt.m02) * w;
  const cy = (gt.m10 * 0.5 + gt.m11 * 0.5 + gt.m12) * h;

  // Axis vectors scaled by element size
  const ax1x = gt.m00 * w * 0.5;
  const ax1y = gt.m10 * h * 0.5;
  const ax2x = gt.m01 * w * 0.5;
  const ax2y = gt.m11 * h * 0.5;
  const r1 = Math.sqrt(ax1x * ax1x + ax1y * ax1y);
  const r2 = Math.sqrt(ax2x * ax2x + ax2y * ax2y);
  const angle = Math.atan2(ax1y, ax1x) * (180 / Math.PI);

  return {
    ...def,
    cx: "0",
    cy: "0",
    r: "1",
    gradientUnits: "userSpaceOnUse",
    gradientTransform: `translate(${cx} ${cy}) rotate(${angle}) scale(${r1} ${r2})`,
  };
}
