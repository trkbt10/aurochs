/**
 * @file PDF font domain
 *
 * Exports types and utilities for PDF font handling.
 */

// Types
export type {
  FontMapping,
  FontMetrics,
  FontInfo,
  FontMappings,
  CIDOrdering,
} from "./types";

// Defaults
export { DEFAULT_FONT_METRICS } from "./defaults";

// Font style detection
export { normalizeFontName, isBoldFont, isItalicFont } from "./font-style";

// Font name normalization
export { normalizeFontFamily } from "./font-name-map";

// CMap parsing
export type { CMapParseResult, CMapParserOptions } from "./cmap-parser";
export {
  parseToUnicodeCMap,
  parseBfChar,
  parseBfRange,
  hexToString,
} from "./cmap-parser";

// Text decoding
export { decodeText } from "./text-decoder";

// CID ordering fallback
export type { CIDFallbackMapping } from "./cid-ordering";
export {
  getCIDFallbackMapping,
  detectCIDOrdering,
  decodeCIDFallback,
} from "./cid-ordering";

// Encoding maps
export type { PdfEncodingName } from "./encoding-maps";
export {
  WINANSI_ENCODING,
  MACROMAN_ENCODING,
  STANDARD_ENCODING,
  getEncodingByName,
  applyEncodingDifferences,
  glyphNameToUnicode,
} from "./encoding-maps";

// Embedded font extraction
export type { FontFormat, EmbeddedFont, EmbeddedFontMetrics } from "./font-extractor";
export { extractEmbeddedFonts } from "./font-extractor";

// TrueType font repair for web compatibility
export { hasCmapTable, injectCmapTable, repairFontForWeb } from "./font-repair";

// TrueType parsing utilities
export type { TableEntry, TrueTypeFontMetrics } from "./truetype-parser";
export {
  parseTrueTypeTableDirectory,
  hasTable,
  getTableTags,
  extractTrueTypeMetrics,
  normalizeMetricsTo1000,
} from "./truetype-parser";

// Font CSS generation (@font-face)
export {
  fontToDataUrl,
  generateFontFaceCss,
  generateFontFaceStyle,
} from "./font-css-generator";
