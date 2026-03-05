/**
 * @file src/pdf/domain/font/embedded-font.ts
 */

import type { CIDOrdering } from "./types";

/**
 * Embedded font types extracted from PDFs.
 *
 * Kept in a pdf-lib-free module so both runtime code and tests can share the
 * types while allowing the PDF loader implementation to evolve independently.
 */

/**
 * Font format detected from PDF
 */
export type FontFormat = "type1" | "truetype" | "opentype" | "cff";

/**
 * Font metrics in 1/1000 em units (PDF standard).
 */
export type EmbeddedFontMetrics = {
  /** Ascender height (positive value) */
  readonly ascender: number;
  /** Descender depth (negative value) */
  readonly descender: number;
  /** Glyph widths: character code → width in 1/1000 em units */
  readonly widths?: ReadonlyMap<number, number>;
  /** Default glyph width when not found in widths */
  readonly defaultWidth?: number;
};

/**
 * ToUnicode mapping data for round-trip preservation.
 */
export type EmbeddedFontToUnicode = {
  /** Source bytes (hex) → Unicode string mapping. Key is uppercase hex (e.g., "8140" → "ア"). */
  readonly byteMapping: ReadonlyMap<string, string>;
  /** Source code byte lengths from codespace ranges (descending order). */
  readonly sourceCodeByteLengths: readonly number[];
};

/**
 * Embedded font data extracted from PDF
 */
export type EmbeddedFont = {
  /** Original BaseFont name from PDF (e.g., "/ZRDQJE+Hiragino-Sans") */
  readonly baseFontName: string;
  /** Font family name without subset prefix (e.g., "Hiragino Sans") */
  readonly fontFamily: string;
  /** Font format */
  readonly format: FontFormat;
  /** Raw font data (can be used to create @font-face) */
  readonly data: Uint8Array;
  /** MIME type for the font format */
  readonly mimeType: string;
  /** Font metrics from font file (hhea table), normalized to 1000 units */
  readonly metrics?: EmbeddedFontMetrics;
  /** ToUnicode CMap information for round-trip preservation. */
  readonly toUnicode?: EmbeddedFontToUnicode;
  /** CID ordering (Japan1, GB1, CNS1, Korea1, Identity). */
  readonly ordering?: CIDOrdering;
  /** Number of bytes per character code (1 for single-byte, 2 for CID fonts). */
  readonly codeByteWidth?: 1 | 2;
};

