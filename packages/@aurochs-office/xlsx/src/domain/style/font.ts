/**
 * @file SpreadsheetML Font Type Definitions
 *
 * This module defines font-related types specific to SpreadsheetML (XLSX).
 * These types represent font formatting concepts as defined in ECMA-376.
 *
 * @see ECMA-376 Part 4, Section 18.8.22 (font)
 * @see ECMA-376 Part 4, Section 18.8.9 (color)
 */

// =============================================================================
// XlsxColor Type
// =============================================================================

/**
 * SpreadsheetML color specification
 *
 * Colors in SpreadsheetML can be specified in multiple ways:
 * - RGB: Direct AARRGGBB hex value
 * - Theme: Reference to theme color with optional tint
 * - Indexed: Reference to legacy indexed color palette
 * - Auto: Automatic color (system-dependent)
 *
 * @see ECMA-376 Part 4, Section 18.8.9 (color)
 * @see ECMA-376 Part 4, Section 18.8.3 (CT_Color)
 */
export type XlsxColor =
  | { readonly type: "rgb"; readonly value: string }
  | { readonly type: "theme"; readonly theme: number; readonly tint?: number }
  | { readonly type: "indexed"; readonly index: number }
  | { readonly type: "auto" };

// =============================================================================
// UnderlineStyle Type
// =============================================================================

/**
 * Underline style for font formatting
 *
 * @see ECMA-376 Part 4, Section 18.8.42 (u)
 * @see ECMA-376 Part 4, Section 18.18.82 (ST_UnderlineValues)
 */
export type UnderlineStyle =
  | "single"
  | "double"
  | "singleAccounting"
  | "doubleAccounting"
  | "none";

// =============================================================================
// XlsxFont Type
// =============================================================================

/**
 * SpreadsheetML font definition
 *
 * Represents a complete font specification including typeface, size,
 * and various formatting options.
 *
 * @see ECMA-376 Part 4, Section 18.8.22 (font)
 *
 * Child elements mapping:
 * - name: Font name (§18.8.29)
 * - sz: Font size in points (§18.8.38)
 * - b: Bold (§18.8.2)
 * - i: Italic (§18.8.26)
 * - u: Underline (§18.8.42)
 * - strike: Strikethrough (§18.8.36)
 * - color: Font color (§18.8.9)
 * - family: Font family (§18.8.18)
 * - scheme: Font scheme (§18.8.35)
 * - vertAlign: Vertical alignment (§18.8.43)
 * - outline: Outline effect
 * - shadow: Shadow effect
 * - condense: Condensed font
 * - extend: Extended font
 */
export type XlsxFont = {
  /** Font name (e.g., "Calibri", "Arial") */
  readonly name: string;

  /** Font size in points */
  readonly size: number;

  /** Bold formatting */
  readonly bold?: boolean;

  /** Italic formatting */
  readonly italic?: boolean;

  /** Underline style */
  readonly underline?: UnderlineStyle;

  /** Strikethrough formatting */
  readonly strikethrough?: boolean;

  /** Font color */
  readonly color?: XlsxColor;

  /**
   * Font family number
   * @see ECMA-376 Part 4, Section 18.8.18 (family)
   *
   * Common values:
   * - 0: Not applicable
   * - 1: Roman
   * - 2: Swiss
   * - 3: Modern
   * - 4: Script
   * - 5: Decorative
   */
  readonly family?: number;

  /**
   * Font scheme for theme-aware fonts
   * @see ECMA-376 Part 4, Section 18.8.35 (scheme)
   */
  readonly scheme?: "major" | "minor" | "none";

  /**
   * Vertical alignment for superscript/subscript
   * @see ECMA-376 Part 4, Section 18.8.43 (vertAlign)
   */
  readonly vertAlign?: "superscript" | "subscript" | "baseline";

  /** Outline effect */
  readonly outline?: boolean;

  /** Shadow effect */
  readonly shadow?: boolean;

  /** Condensed font */
  readonly condense?: boolean;

  /** Extended font */
  readonly extend?: boolean;
};
