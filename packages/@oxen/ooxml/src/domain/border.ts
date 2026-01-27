/**
 * @file Shared border types for OOXML processing (DOCX/XLSX)
 *
 * These types represent border styling concepts that are common across
 * WordprocessingML and SpreadsheetML with slight variations.
 *
 * @see ECMA-376 Part 1, Section 17.3.4 (Run Border Properties - WordprocessingML)
 * @see ECMA-376 Part 1, Section 17.4.4 (Table Border Properties - WordprocessingML)
 * @see ECMA-376 Part 4, Section 18.8.4 (Border - SpreadsheetML)
 */

import type { Brand } from "./units";

// =============================================================================
// Border Style Types (Common across DOCX/XLSX)
// =============================================================================

/**
 * Core border styles shared between WordprocessingML and SpreadsheetML.
 *
 * Both formats support a similar set of border line styles, though
 * WordprocessingML has additional decorative styles.
 *
 * @see ECMA-376 Part 1, Section 17.18.2 (ST_Border - WordprocessingML)
 * @see ECMA-376 Part 4, Section 18.18.3 (ST_BorderStyle - SpreadsheetML)
 */
export type CoreBorderStyle =
  | "none"
  | "thin"
  | "medium"
  | "thick"
  | "dashed"
  | "dotted"
  | "double"
  | "hair";

/**
 * Extended border styles specific to SpreadsheetML.
 *
 * @see ECMA-376 Part 4, Section 18.18.3 (ST_BorderStyle)
 */
export type SpreadsheetBorderStyle =
  | CoreBorderStyle
  | "mediumDashed"
  | "dashDot"
  | "mediumDashDot"
  | "dashDotDot"
  | "mediumDashDotDot"
  | "slantDashDot";

/**
 * WordprocessingML border styles.
 *
 * Includes core styles plus decorative options like waves and 3D effects.
 *
 * @see ECMA-376 Part 1, Section 17.18.2 (ST_Border)
 */
export type WordBorderStyle =
  | "nil"
  | "none"
  | "single"
  | "thick"
  | "double"
  | "dotted"
  | "dashed"
  | "dotDash"
  | "dotDotDash"
  | "triple"
  | "thinThickSmallGap"
  | "thickThinSmallGap"
  | "thinThickThinSmallGap"
  | "thinThickMediumGap"
  | "thickThinMediumGap"
  | "thinThickThinMediumGap"
  | "thinThickLargeGap"
  | "thickThinLargeGap"
  | "thinThickThinLargeGap"
  | "wave"
  | "doubleWave"
  | "dashSmallGap"
  | "dashDotStroked"
  | "threeDEmboss"
  | "threeDEngrave"
  | "outset"
  | "inset";

// =============================================================================
// Border Width Types
// =============================================================================

/**
 * Border width in eighths of a point (WordprocessingML).
 *
 * Per ECMA-376 Part 1, Section 17.3.4, border width is specified
 * in eighths of a point (1/8 pt = 0.125 pt).
 *
 * @see ECMA-376 Part 1, Section 17.18.4 (ST_EighthPointMeasure)
 */
export type EighthPoints = Brand<number, "EighthPoints">;

/**
 * Create an EighthPoints value from a number.
 */
export const eighthPt = (value: number): EighthPoints => value as EighthPoints;

// =============================================================================
// Border Spacing Types
// =============================================================================

/**
 * Border spacing in points (WordprocessingML).
 *
 * Used for spacing between border and content.
 *
 * @see ECMA-376 Part 1, Section 17.3.4 (space attribute)
 */
export type BorderSpacing = Brand<number, "BorderSpacing">;

/**
 * Create a BorderSpacing value from a number.
 */
export const borderSpacing = (value: number): BorderSpacing => value as BorderSpacing;

// =============================================================================
// Shared Border Edge Type
// =============================================================================

/**
 * Generic border edge definition.
 *
 * This is a parameterized type that can be specialized for different
 * OOXML formats. The color type is kept generic to allow for different
 * color representations.
 *
 * @typeParam TStyle - Border style type (WordBorderStyle, SpreadsheetBorderStyle)
 * @typeParam TColor - Color type (varies by format)
 */
export type BorderEdge<TStyle, TColor> = {
  /** Border line style */
  readonly style: TStyle;

  /** Border color (optional) */
  readonly color?: TColor;
};
