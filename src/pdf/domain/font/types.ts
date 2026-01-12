/**
 * @file PDF font types
 *
 * Types for PDF font handling including metrics and mappings.
 * PDF Reference Chapter 5 - Fonts
 */

/**
 * Font mapping: character code → Unicode string
 */
export type FontMapping = Map<number, string>;

/**
 * Font metrics for accurate text positioning (PDF Reference 5.2)
 *
 * All values are in 1/1000 em units (glyph space).
 * The em-square is traditionally 1000 units for most fonts.
 */
export type FontMetrics = {
  /** Glyph widths: character code → width in 1/1000 em units */
  readonly widths: Map<number, number>;
  /** Default glyph width when not found in widths (1/1000 em units) */
  readonly defaultWidth: number;
  /** Ascender height (1/1000 em units from baseline) */
  readonly ascender: number;
  /** Descender depth (1/1000 em units from baseline, typically negative) */
  readonly descender: number;
};

/**
 * Font info including mapping, byte width, and metrics
 */
export type FontInfo = {
  readonly mapping: FontMapping;
  /** Number of bytes per character code (1 or 2) */
  readonly codeByteWidth: 1 | 2;
  /** Font metrics for glyph widths and vertical metrics */
  readonly metrics: FontMetrics;
};

/**
 * Collection of font info keyed by font name
 */
export type FontMappings = Map<string, FontInfo>;

/**
 * Adobe CIDFont character collection identifiers
 *
 * PDF Reference 5.6.1 defines the Registry-Ordering-Supplement system
 * for CID fonts. The Registry identifies the authority, Ordering identifies
 * the character collection, and Supplement identifies the version.
 */
export type CIDOrdering = "Japan1" | "GB1" | "CNS1" | "Korea1";
