/**
 * @file Glyph extraction and layout module
 *
 * Provides character-level glyph extraction using canvas rendering.
 * This module is general-purpose and not tied to any specific renderer.
 *
 * Usage:
 * ```typescript
 * import { extractGlyphContour, layoutText } from "./glyph";
 *
 * // Extract single glyph
 * const glyph = extractGlyphContour("A", "Arial", { fontSize: 24, fontWeight: 400, fontStyle: "normal" });
 *
 * // Layout text
 * const layout = layoutText("Hello", { fontFamily: "Arial", fontSize: 24, fontWeight: 400, fontStyle: "normal" });
 * ```
 */

// Types
export type {
  ContourPath,
  ContourPoint,
  GlyphMetrics,
  GlyphBounds,
  GlyphContour,
  GlyphStyleKey,
  KerningPair,
  KerningTable,
  PositionedGlyph,
  TextLayoutConfig,
  TextLayoutResult,
} from "./types";

// Cache
export {
  getCachedGlyph,
  setCachedGlyph,
  hasGlyphCache,
  clearFontGlyphCache,
  clearAllGlyphCache,
  getGlyphCacheStats,
  setKerningTable,
  getKerningAdjustment,
  hasKerningTable,
} from "./cache";

// Extractor
export {
  extractGlyphContour,
  extractGlyphContours,
  createFallbackGlyph,
} from "./extractor";

// Layout (sync)
export {
  layoutText,
  getTextBounds,
  splitTextIntoLines,
  measureTextWidth,
} from "./layout";

// Layout (async - Web Worker)
export { layoutTextAsync } from "./layout-async";

// Worker manager
export {
  extractGlyphAsync,
  extractGlyphsAsync,
  terminateWorker,
} from "./worker-manager";
