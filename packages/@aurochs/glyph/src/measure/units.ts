/**
 * @file Unit conversion constants for text measurement
 *
 * This module provides unit conversion constants.
 * For type-safe branded units (Pixels, Points), use @aurochs-office/drawing-ml/domain/units.
 */

/**
 * Points to pixels conversion factor at 96 DPI.
 * 1 inch = 72 points (typographic standard)
 * At 96 DPI: 1pt = 96/72 px ≈ 1.333px
 */
export const PT_TO_PX = 96 / 72;

/**
 * Pixels to points conversion factor at 96 DPI.
 * 1pt = 96/72 px, so 1px = 72/96 pt
 */
export const PX_TO_PT = 72 / 96;

/**
 * Convert points to pixels.
 */
export function pointsToPixels(points: number): number {
  return points * PT_TO_PX;
}

/**
 * Convert pixels to points.
 */
export function pixelsToPoints(pixels: number): number {
  return pixels * PX_TO_PT;
}
