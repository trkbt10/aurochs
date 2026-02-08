/**
 * @file PDF-related constants
 *
 * Contains constants used in PDF parsing and conversion.
 * All values are derived from official specifications.
 */

/**
 * Conversion factor from PDF points to CSS pixels.
 *
 * Derivation:
 * - PDF Reference 1.7, Appendix C.2: 1 point = 1/72 inch
 * - CSS Values and Units Module Level 3: 1px = 1/96 inch (reference pixel)
 * - Therefore: 1pt = (1/72) inch × (96 px/inch) = 96/72 px ≈ 1.333px
 *
 * Note: This is the standard CSS reference pixel at 96 DPI.
 * The actual physical size depends on the device's pixel density.
 */
export const PT_TO_PX = 96 / 72;

/**
 * Conversion factor from CSS pixels to PDF points.
 *
 * Inverse of PT_TO_PX.
 */
export const PX_TO_PT = 72 / 96;
