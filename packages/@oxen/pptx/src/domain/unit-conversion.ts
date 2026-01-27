/**
 * @file Unit conversion utilities for PPTX
 * EMU (English Metric Units) and angle conversions
 *
 * @see ECMA-376-1:2016, Section 20.1.10.16 (ST_Coordinate)
 */

import {
  EMU_PER_INCH,
  STANDARD_DPI,
  POINTS_PER_INCH,
} from "./defaults";

/**
 * Slide factor: EMU to pixels conversion at 96 DPI.
 *
 * Per ECMA-376-1:2016, Section 20.1.10.16:
 * 914400 EMU = 1 inch. At 96 DPI, 1 inch = 96 pixels.
 * Therefore: 1 EMU = 96/914400 pixels.
 *
 * @see ECMA-376-1:2016, Section 20.1.10.16 (ST_Coordinate)
 */
export const SLIDE_FACTOR = STANDARD_DPI / EMU_PER_INCH;

/** Font size factor (legacy, kept for compatibility) */
export const FONT_SIZE_FACTOR = 4 / 3.2;

/**
 * Points to pixels conversion factor at 96 DPI.
 *
 * 1 inch = 72 points (typographic standard)
 * At 96 DPI: 1pt = 96/72 px ≈ 1.333px
 */
export const PT_TO_PX = STANDARD_DPI / POINTS_PER_INCH;

/**
 * Convert angle from EMU (English Metric Units) to degrees
 * In Office Open XML, angles are in 1/60000 of a degree
 */
export function angleToDegrees(angle: string | number | undefined): number {
  if (angle === undefined || angle === null) {
    return 0;
  }
  const numAngle = typeof angle === "string" ? parseInt(angle, 10) : angle;
  if (isNaN(numAngle)) {
    return 0;
  }
  return numAngle / 60000;
}

/**
 * Convert degrees to radians
 */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
