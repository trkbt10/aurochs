/**
 * @file PDF text utilities
 *
 * Re-exports font utilities from domain/font for backwards compatibility.
 * Font name mapping and style detection based on PDF Reference.
 */

// Re-export all font utilities from domain
export type { CIDOrdering } from "../domain/font";
export {
  mapFontName,
  isBoldFont,
  isItalicFont,
  normalizeFontName,
} from "../domain/font";
