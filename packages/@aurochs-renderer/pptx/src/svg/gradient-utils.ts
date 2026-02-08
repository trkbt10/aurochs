/**
 * @file Shared gradient utilities for SVG and React renderers
 *
 * Provides common functions for converting OOXML gradient specifications
 * to SVG gradient coordinates.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
 * @see ECMA-376 Part 1, Section 20.1.8.41 (a:lin)
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Linear gradient coordinates for SVG
 */
export type LinearGradientCoords = {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
};

/**
 * Radial gradient coordinates for SVG
 */
export type RadialGradientCoords = {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly fx?: number;
  readonly fy?: number;
};

// =============================================================================
// Coordinate Calculations
// =============================================================================

/**
 * Convert OOXML linear gradient angle to SVG coordinates.
 *
 * OOXML angle convention (a:lin ang attribute):
 * - 0° = gradient flows from left to right
 * - 90° = gradient flows from top to bottom
 * - 180° = gradient flows from right to left
 * - 270° = gradient flows from bottom to top
 *
 * SVG linearGradient uses x1,y1 → x2,y2 to define direction.
 * We need to offset by -90° to convert OOXML to standard math angle.
 *
 * @param angle - OOXML angle in degrees
 * @returns SVG linearGradient coordinates (as percentages 0-100)
 *
 * @see ECMA-376 Part 1, Section 20.1.8.41 (a:lin)
 */
export function ooxmlAngleToSvgLinearGradient(angle: number): LinearGradientCoords {
  // OOXML angle: 0°=right, 90°=down, 180°=left, 270°=up
  // Standard math angle: 0°=right, 90°=up
  // We need to subtract 90° to align with SVG coordinate system where Y increases downward
  const rad = ((angle - 90) * Math.PI) / 180;

  // Calculate start and end points on a 100x100 unit square
  // Center at (50, 50), radius 50 to reach edges
  const x1 = 50 - 50 * Math.cos(rad);
  const y1 = 50 - 50 * Math.sin(rad);
  const x2 = 50 + 50 * Math.cos(rad);
  const y2 = 50 + 50 * Math.sin(rad);

  return { x1, y1, x2, y2 };
}

/**
 * Calculate radial gradient center from OOXML fillToRect.
 *
 * @param fillToRect - OOXML fillToRect percentages
 * @returns SVG radialGradient center coordinates
 *
 * @see ECMA-376 Part 1, Section 20.1.8.30 (a:fillToRect)
 */
export function fillToRectToRadialCenter(fillToRect: {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}): { cx: number; cy: number } {
  // fillToRect specifies margins from edges
  // Center is calculated as the midpoint of the remaining area
  const cx = (fillToRect.left + (100 - fillToRect.right)) / 2;
  const cy = (fillToRect.top + (100 - fillToRect.bottom)) / 2;
  return { cx, cy };
}

/**
 * Get default radial gradient coordinates.
 *
 * @param radialCenter - Optional center override
 * @param useExtendedRadius - Use extended radius (70.7% ≈ √2/2) for backgrounds
 * @returns SVG radialGradient coordinates
 */
export function getRadialGradientCoords(
  radialCenter?: { cx: number; cy: number },
  useExtendedRadius = false,
): RadialGradientCoords {
  const cx = radialCenter?.cx ?? 50;
  const cy = radialCenter?.cy ?? 50;
  // Background uses 70.7% (√2/2) to ensure corners are covered
  // Shape fills use 50% for standard circular gradient
  const r = useExtendedRadius ? 70.7 : 50;

  return { cx, cy, r, fx: cx, fy: cy };
}
