/**
 * @file Line property types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 20.1.10 - Line Properties
 */

// =============================================================================
// Line Properties Types
// =============================================================================

/**
 * Line end type (arrow styles)
 * @see ECMA-376 Part 1, Section 20.1.10.55 (ST_LineEndType)
 */
export type LineEndType = "none" | "triangle" | "stealth" | "diamond" | "oval" | "arrow";

/**
 * Line end size
 * @see ECMA-376 Part 1, Section 20.1.10.56 (ST_LineEndWidth/Length)
 */
export type LineEndSize = "sm" | "med" | "lg";

/**
 * Line cap style
 * @see ECMA-376 Part 1, Section 20.1.10.31 (ST_LineCap)
 */
export type LineCap = "flat" | "round" | "square";

/**
 * Line join style
 * @see ECMA-376 Part 1, Section 20.1.10.32 (ST_LineJoin)
 */
export type LineJoin = "bevel" | "miter" | "round";

/**
 * Compound line type
 * @see ECMA-376 Part 1, Section 20.1.10.33 (ST_CompoundLine)
 */
export type CompoundLine = "sng" | "dbl" | "thickThin" | "thinThick" | "tri";

/**
 * Preset dash style
 * @see ECMA-376 Part 1, Section 20.1.10.48 (ST_PresetLineDashVal)
 */
export type DashStyle =
  | "solid"
  | "dot"
  | "dash"
  | "lgDash"
  | "dashDot"
  | "lgDashDot"
  | "lgDashDotDot"
  | "sysDot"
  | "sysDash"
  | "sysDashDot"
  | "sysDashDotDot";
