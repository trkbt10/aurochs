/**
 * @file Theme Type Definitions for XLSX
 *
 * Defines types for DrawingML theme elements as used in SpreadsheetML.
 * Themes are shared between PPTX and XLSX, defined in DrawingML.
 *
 * @see ECMA-376 Part 1, Section 20.1.6 (Theme)
 * @see ECMA-376 Part 4, Section 18.8 (Styles - theme color references)
 */

import type { ColorScheme, ColorMap } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";

// Re-export for convenience
export type { ColorScheme, ColorMap };
export type { FontScheme };

// =============================================================================
// Theme Types
// =============================================================================

/**
 * Theme definition for SpreadsheetML.
 *
 * Represents the parsed theme from xl/theme/theme1.xml.
 * Contains color and font schemes used for style resolution.
 *
 * @see ECMA-376 Part 1, Section 20.1.6.9 (a:theme)
 */
export type XlsxTheme = {
  /** Theme name */
  readonly name?: string;
  /** Color scheme (maps dk1, lt1, accent1, etc. to hex colors) */
  readonly colorScheme: ColorScheme;
  /** Font scheme (major and minor fonts) */
  readonly fontScheme: FontScheme;
  /** Path to the theme XML within the package */
  readonly xmlPath: string;
};
