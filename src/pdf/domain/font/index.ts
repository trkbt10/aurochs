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

// Font name mapping
export { mapFontName } from "./font-name-map";
