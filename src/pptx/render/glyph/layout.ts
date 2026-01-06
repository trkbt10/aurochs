/**
 * @file Text Layout Engine using glyph contours
 *
 * Combines individual glyph contours into positioned text.
 * Supports:
 * - Character-level positioning
 * - Kerning adjustments (when kerning table provided)
 * - Letter spacing
 */

import type {
  GlyphContour,
  GlyphStyleKey,
  ContourPath,
  PositionedGlyph,
  TextLayoutConfig,
  TextLayoutResult,
} from "./types";
import { getKerningAdjustment } from "./cache";
import { extractGlyphContour } from "./extractor";

// =============================================================================
// Main API
// =============================================================================

/**
 * Layout text into positioned glyphs
 */
export function layoutText(
  text: string,
  config: TextLayoutConfig,
): TextLayoutResult {
  if (text.length === 0) {
    return {
      glyphs: [],
      totalWidth: 0,
      ascent: 0,
      descent: 0,
      combinedPaths: [],
    };
  }

  const style: GlyphStyleKey = {
    fontSize: config.fontSize,
    fontWeight: config.fontWeight,
    fontStyle: config.fontStyle,
  };

  const letterSpacing = config.letterSpacing ?? 0;
  const enableKerning = config.enableKerning ?? true;

  // Extract all glyphs
  const chars = [...text]; // Properly handle Unicode (emoji, etc.)
  const glyphs: PositionedGlyph[] = [];
  const combinedPaths: ContourPath[] = [];

  let cursorX = 0;
  let maxAscent = 0;
  let maxDescent = 0;

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const glyph = extractGlyphContour(char, config.fontFamily, style);

    // Apply kerning adjustment
    let kerning = 0;
    if (enableKerning && i > 0) {
      kerning = getKerningAdjustment(config.fontFamily, chars[i - 1], char);
    }

    const x = cursorX + kerning;
    const y = 0; // Baseline at y=0

    glyphs.push({ glyph, x, y });

    // Add offset paths to combined
    for (const path of glyph.paths) {
      combinedPaths.push({
        points: path.points.map((p) => ({ x: p.x + x, y: p.y + y })),
        isHole: path.isHole,
      });
    }

    // Track metrics
    maxAscent = Math.max(maxAscent, glyph.metrics.ascent);
    maxDescent = Math.max(maxDescent, glyph.metrics.descent);

    // Advance cursor
    cursorX += glyph.metrics.advanceWidth + letterSpacing + kerning;
  }

  return {
    glyphs,
    totalWidth: cursorX - letterSpacing, // Remove trailing space
    ascent: maxAscent,
    descent: maxDescent,
    combinedPaths,
  };
}

/**
 * Layout text and return combined bounds
 */
export function getTextBounds(
  text: string,
  config: TextLayoutConfig,
): { width: number; height: number; ascent: number; descent: number } {
  const layout = layoutText(text, config);
  return {
    width: layout.totalWidth,
    height: layout.ascent + layout.descent,
    ascent: layout.ascent,
    descent: layout.descent,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Split text into lines (for future multi-line support)
 */
export function splitTextIntoLines(
  text: string,
  maxWidth: number,
  config: TextLayoutConfig,
): string[] {
  // Simple implementation: split on newlines only
  // Future: implement word wrapping
  return text.split("\n");
}

/**
 * Calculate text width without full layout
 * (Faster for simple width queries)
 */
export function measureTextWidth(
  text: string,
  config: TextLayoutConfig,
): number {
  const style: GlyphStyleKey = {
    fontSize: config.fontSize,
    fontWeight: config.fontWeight,
    fontStyle: config.fontStyle,
  };

  const chars = [...text];
  let width = 0;

  for (let i = 0; i < chars.length; i++) {
    const glyph = extractGlyphContour(chars[i], config.fontFamily, style);
    width += glyph.metrics.advanceWidth;

    if (i > 0 && config.enableKerning !== false) {
      width += getKerningAdjustment(config.fontFamily, chars[i - 1], chars[i]);
    }
  }

  width += (config.letterSpacing ?? 0) * (chars.length - 1);
  return width;
}
