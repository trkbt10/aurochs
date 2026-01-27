/**
 * @file Shared font types for OOXML (PPTX/XLSX) processing
 *
 * This module provides base font property types that are common across
 * DrawingML (PPTX) and SpreadsheetML (XLSX) documents.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.3 - DrawingML Font
 * @see ECMA-376 Part 4, Section 18.8.22 - SpreadsheetML Font
 */

// =============================================================================
// Base Font Properties
// =============================================================================

/**
 * Underline style values shared across OOXML formats.
 *
 * DrawingML (a:u) uses extended values like "dbl", "heavy", "wavy", etc.
 * SpreadsheetML uses simpler values: "single", "double", "singleAccounting", "doubleAccounting", "none"
 *
 * This base type uses string to accommodate both formats.
 * Format-specific types can narrow this as needed.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.3.32 (ST_TextUnderlineType) - DrawingML
 * @see ECMA-376 Part 4, Section 18.18.82 (ST_UnderlineValues) - SpreadsheetML
 */
export type BaseUnderlineStyle = string;

/**
 * Base font properties shared between PPTX and XLSX.
 *
 * This type captures the common font properties that exist in both
 * DrawingML and SpreadsheetML specifications:
 *
 * - name: Font typeface (DrawingML: typeface, SpreadsheetML: name)
 * - size: Font size in points (DrawingML: sz in 100ths, SpreadsheetML: sz)
 * - bold: Bold weight (DrawingML: b, SpreadsheetML: b)
 * - italic: Italic style (DrawingML: i, SpreadsheetML: i)
 * - underline: Underline style (DrawingML: u, SpreadsheetML: u)
 * - strikethrough: Strikethrough (DrawingML: strike, SpreadsheetML: strike)
 *
 * Note: color property is omitted and will be added after P0-1 completion
 * when the shared Color type is available.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.3 (a:font) - DrawingML
 * @see ECMA-376 Part 4, Section 18.8.22 (font) - SpreadsheetML
 */
export type BaseFontProperties = {
  /** Font typeface name (e.g., "Calibri", "Arial") */
  readonly name: string;

  /** Font size in points */
  readonly size?: number;

  /** Bold weight */
  readonly bold?: boolean;

  /** Italic style */
  readonly italic?: boolean;

  /**
   * Underline style.
   * Common values: "none", "single", "double"
   * DrawingML extends this with: "sng", "dbl", "heavy", "wavy", etc.
   * SpreadsheetML uses: "single", "double", "singleAccounting", "doubleAccounting"
   */
  readonly underline?: BaseUnderlineStyle;

  /** Strikethrough */
  readonly strikethrough?: boolean;

  // Note: color property will be added after P0-1 (shared Color type)
  // readonly color?: Color;
};

// =============================================================================
// Font Typeface Properties (DrawingML specific, shared in OOXML)
// =============================================================================

/**
 * Extended font typeface properties from DrawingML.
 *
 * These properties are specific to DrawingML but may be used
 * when working with embedded DrawingML content in XLSX.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.3 (a:font)
 */
export type FontTypefaceProperties = {
  /** Font typeface name */
  readonly typeface?: string;

  /**
   * Panose-1 classification number.
   * 10-byte font classification descriptor.
   */
  readonly panose?: string;

  /**
   * Pitch family.
   * Describes font pitch and family characteristics.
   */
  readonly pitchFamily?: number;

  /**
   * Character set.
   * Specifies the character set supported by the font.
   */
  readonly charset?: number;
};
