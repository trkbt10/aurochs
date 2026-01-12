/**
 * @file PDF coordinate system types
 *
 * PDF coordinate system: origin at bottom-left, Y-axis pointing up
 * PPTX coordinate system: origin at top-left, Y-axis pointing down
 */

/**
 * PDF point (in PDF user space units)
 * PDF uses bottom-left origin; conversion handles Y-flip
 */
export type PdfPoint = {
  readonly x: number;
  readonly y: number;
};

/**
 * PDF bounding box [x1, y1, x2, y2]
 */
export type PdfBBox = readonly [number, number, number, number];

/**
 * PDF transformation matrix [a, b, c, d, e, f]
 * | a  b  0 |
 * | c  d  0 |
 * | e  f  1 |
 */
export type PdfMatrix = readonly [number, number, number, number, number, number];
