/**
 * @file PDF font types
 *
 * Types for PDF font handling including metrics and mappings.
 * PDF Reference Chapter 5 - Fonts
 */

import type { PdfMatrix } from "../coordinate";

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
  /** PDF text writing mode: 0 = horizontal, 1 = vertical */
  readonly writingMode?: 0 | 1;
  /** Number of bytes per character code (1 or 2) */
  readonly codeByteWidth: 1 | 2;
  /**
   * Exact ToUnicode mapping keyed by source bytes as uppercase hex.
   * Example: `8140` -> `"あ"`.
   */
  readonly toUnicodeByteMapping?: ReadonlyMap<string, string>;
  /**
   * Source code byte lengths available in ToUnicode mappings/codespace.
   * Sorted descending (for longest-match decode).
   */
  readonly toUnicodeSourceCodeByteLengths?: readonly number[];
  /**
   * Minimal ToUnicode parse diagnostics for debugging mojibake.
   */
  readonly toUnicodeDiagnostics?: Readonly<{
    readonly invalidEntryCount: number;
    readonly truncatedRangeCount: number;
    readonly sourceLengthOutsideCodeSpaceCount: number;
    readonly replacementCharMapCount: number;
    readonly privateUseCharMapCount: number;
    readonly sourceCodeLengthHistogram: ReadonlyMap<number, number>;
  }>;
  /** Font metrics for glyph widths and vertical metrics */
  readonly metrics: FontMetrics;
  /**
   * Vertical displacement metrics (`w1`) for writing mode 1.
   * Values are in 1/1000 em units.
   */
  readonly verticalDisplacements?: ReadonlyMap<number, number>;
  /**
   * Default vertical displacement (`DW2` second value, fallback -1000).
   * Value is in 1/1000 em units.
   */
  readonly defaultVerticalDisplacement?: number;
  /**
   * Type3 font support (glyph programs stored in `/CharProcs`).
   *
   * When present, callers may execute the glyph content streams to render
   * vector paths (commonly used for icon fonts).
   */
  readonly type3?: Readonly<{
    readonly fontMatrix: PdfMatrix;
    readonly codeToCharName: ReadonlyMap<number, string>;
    readonly charProcs: ReadonlyMap<string, Uint8Array>;
  }>;
  /**
   * CID ordering for fallback decoding when ToUnicode is not available.
   * Only present for CID fonts (Type0 with CIDFont descendants).
   */
  readonly ordering?: CIDOrdering;
  /**
   * Supplemental CID code -> Unicode mapping derived from CIDToGIDMap and
   * embedded font cmap tables. Used as a fallback when ToUnicode entries are
   * missing or corrupted.
   */
  readonly cidCodeToUnicodeFallbackMap?: ReadonlyMap<number, string>;
  /**
   * Encoding map for single-byte fonts.
   * Used when ToUnicode is not available but font has a known encoding.
   */
  readonly encodingMap?: ReadonlyMap<number, string>;
  /**
   * Whether the font is bold.
   * Detected from font name or FontDescriptor Flags.
   */
  readonly isBold?: boolean;
  /**
   * Whether the font is italic/oblique.
   * Detected from FontDescriptor Flags (bit 7) or font name.
   */
  readonly isItalic?: boolean;
  /**
   * Whether the font is a symbol / dingbats font (Wingdings, Symbol, ZapfDingbats, etc.).
   *
   * Symbol fonts legitimately map glyphs to the Unicode Private Use Area.
   * When true, PUA entries in the ToUnicode CMap should NOT be treated as
   * a corruption signal.
   *
   * Detected from BaseFont name heuristics (not the PDF Symbolic flag,
   * which is also set on CJK and other non-Latin fonts).
   */
  readonly isSymbolFont?: boolean;
  /**
   * The actual font name from BaseFont entry.
   * This is the real font name (e.g., "ABCDEF+Arial" or "Helvetica"),
   * not the resource identifier (e.g., "F1" or "JRLKGN").
   */
  readonly baseFont?: string;
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
 *
 * - Japan1, GB1, CNS1, Korea1: Adobe character collections with script type info
 * - Identity: Generic CID encoding without script type info (ISO 32000-1 Section 9.7.5)
 */
export type CIDOrdering = "Japan1" | "GB1" | "CNS1" | "Korea1" | "Identity";
