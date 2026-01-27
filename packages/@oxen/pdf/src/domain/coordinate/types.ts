/**
 * @file PDF coordinate system types
 *
 * PDF coordinate system: origin at bottom-left, Y-axis pointing up
 * PPTX coordinate system: origin at top-left, Y-axis pointing down
 */

/**
 * A point in PDF coordinate space.
 *
 * - Origin: bottom-left
 * - Units: PDF points (1 point = 1/72 inch)
 *
 * @property x - X coordinate in PDF points (from left edge)
 * @property y - Y coordinate in PDF points (from bottom edge)
 */
export type PdfPoint = {
  readonly x: number;
  readonly y: number;
};

/**
 * PDF bounding box in PDF points: [x1, y1, x2, y2].
 *
 * - (x1, y1): bottom-left corner
 * - (x2, y2): top-right corner
 */
export type PdfBBox = readonly [number, number, number, number];

/**
 * PDF transformation matrix [a, b, c, d, e, f]
 * | a  b  0 |
 * | c  d  0 |
 * | e  f  1 |
 */
export type PdfMatrix = readonly [number, number, number, number, number, number];
