/**
 * @file XLSX Fill Type Definitions
 *
 * SpreadsheetML-specific fill types for cell backgrounds.
 * These types differ from DrawingML fills as they use XLSX-specific color
 * representations and pattern types.
 *
 * @see ECMA-376 Part 4, Section 18.8.20 (Fill Element)
 * @see ECMA-376 Part 4, Section 18.8.32 (PatternFill)
 * @see ECMA-376 Part 4, Section 18.8.24 (GradientFill)
 * @see ECMA-376 Part 4, Section 18.18.55 (Pattern Types)
 */

// =============================================================================
// XLSX Color Types
// =============================================================================

/**
 * XLSX Color specification
 *
 * SpreadsheetML uses a different color model than DrawingML:
 * - rgb: AARRGGBB format (8 characters with alpha)
 * - theme: Theme color index with optional tint
 * - indexed: Legacy indexed color (0-63)
 * - auto: Automatic color (system default)
 *
 * @see ECMA-376 Part 4, Section 18.8.9 (color)
 */
export type XlsxColor =
  | { readonly type: "rgb"; readonly value: string }
  | { readonly type: "theme"; readonly theme: number; readonly tint?: number }
  | { readonly type: "indexed"; readonly index: number }
  | { readonly type: "auto" };

// =============================================================================
// Pattern Types
// =============================================================================

/**
 * Pattern types for pattern fills
 *
 * Note: styles.xml always contains at least 2 default fills:
 * - Index 0: none
 * - Index 1: gray125
 *
 * @see ECMA-376 Part 4, Section 18.18.55 (ST_PatternType)
 */
export type XlsxPatternType =
  | "none"
  | "solid"
  | "gray125"
  | "gray0625"
  | "darkGray"
  | "mediumGray"
  | "lightGray"
  | "darkHorizontal"
  | "darkVertical"
  | "darkDown"
  | "darkUp"
  | "darkGrid"
  | "darkTrellis"
  | "lightHorizontal"
  | "lightVertical"
  | "lightDown"
  | "lightUp"
  | "lightGrid"
  | "lightTrellis";

// =============================================================================
// Pattern Fill
// =============================================================================

/**
 * Pattern fill specification
 *
 * @see ECMA-376 Part 4, Section 18.8.32 (patternFill)
 */
export type XlsxPatternFill = {
  readonly patternType: XlsxPatternType;
  readonly fgColor?: XlsxColor;
  readonly bgColor?: XlsxColor;
};

// =============================================================================
// Gradient Fill
// =============================================================================

/**
 * Gradient stop for gradient fills
 *
 * @see ECMA-376 Part 4, Section 18.8.25 (stop)
 */
export type XlsxGradientStop = {
  /** Position of the stop (0.0 - 1.0) */
  readonly position: number;
  readonly color: XlsxColor;
};

/**
 * Gradient fill specification
 *
 * @see ECMA-376 Part 4, Section 18.8.24 (gradientFill)
 */
export type XlsxGradientFill = {
  /** Gradient type: linear or path (radial) */
  readonly gradientType: "linear" | "path";
  /** Angle in degrees for linear gradient (default: 0) */
  readonly degree?: number;
  /** Gradient stops defining color positions */
  readonly stops: readonly XlsxGradientStop[];
};

// =============================================================================
// Fill Union Type
// =============================================================================

/**
 * XLSX Fill specification
 *
 * Union type representing all fill variations in SpreadsheetML.
 * Each cell can reference a fill by index from the fills collection.
 *
 * @see ECMA-376 Part 4, Section 18.8.20 (fill)
 */
export type XlsxFill =
  | { readonly type: "none" }
  | { readonly type: "pattern"; readonly pattern: XlsxPatternFill }
  | { readonly type: "gradient"; readonly gradient: XlsxGradientFill };
