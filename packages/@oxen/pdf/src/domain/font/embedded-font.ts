/**
 * @file src/pdf/domain/font/embedded-font.ts
 */

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
};

