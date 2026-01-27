/**
 * @file Style reference types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 20.1.10 - Simple Types
 */

// =============================================================================
// Color Scheme Types
// =============================================================================

/**
 * Theme color scheme index
 * @see ECMA-376 Part 1, Section 20.1.10.14 (ST_ColorSchemeIndex)
 */
export type ColorSchemeIndex =
  | "dk1"
  | "lt1"
  | "dk2"
  | "lt2"
  | "accent1"
  | "accent2"
  | "accent3"
  | "accent4"
  | "accent5"
  | "accent6"
  | "hlink"
  | "folHlink";

/**
 * Scheme color value
 * @see ECMA-376 Part 1, Section 20.1.10.54 (ST_SchemeColorVal)
 */
export type SchemeColorValue =
  | "dk1"
  | "lt1"
  | "dk2"
  | "lt2"
  | "accent1"
  | "accent2"
  | "accent3"
  | "accent4"
  | "accent5"
  | "accent6"
  | "hlink"
  | "folHlink"
  | "bg1"
  | "bg2"
  | "tx1"
  | "tx2"
  | "phClr";

// =============================================================================
// Font and Style Matrix Types
// =============================================================================

/**
 * Font collection index
 * @see ECMA-376 Part 1, Section 20.1.10.25 (ST_FontCollectionIndex)
 */
export type FontCollectionIndex = "major" | "minor" | "none";

/**
 * Style matrix column index (unsigned int)
 * @see ECMA-376 Part 1, Section 20.1.10.57 (ST_StyleMatrixColumnIndex)
 */
export type StyleMatrixColumnIndex = number;

/**
 * Shape ID (token)
 * @see ECMA-376 Part 1, Section 20.1.10.55 (ST_ShapeID)
 */
export type ShapeId = string;
