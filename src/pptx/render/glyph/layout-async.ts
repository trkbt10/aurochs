/**
 * @file Async Text Layout Engine using glyph contours
 *
 * Uses Web Worker for glyph extraction to avoid blocking main thread.
 */

import type {
  GlyphStyleKey,
  ContourPath,
  PositionedGlyph,
  TextLayoutConfig,
  TextLayoutResult,
} from "./types";
import { getKerningAdjustment } from "./cache";
import { extractGlyphsAsync } from "./worker-manager";
import { calculateOpticalKerningAdjustment } from "./optical-kerning";

// =============================================================================
// Main API
// =============================================================================

/**
 * Layout text into positioned glyphs (async - uses Web Worker)
 */
export async function layoutTextAsync(
  text: string,
  config: TextLayoutConfig,
): Promise<TextLayoutResult> {
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
  const useOpticalKerning = config.opticalKerning === true;
  const enableKerning = config.enableKerning ?? true;
  const useFontKerning = enableKerning && !useOpticalKerning;

  // Extract all glyphs using worker
  const chars = [...text]; // Properly handle Unicode
  const glyphContours = await extractGlyphsAsync(chars, config.fontFamily, style);

  // Layout glyphs
  const glyphs: PositionedGlyph[] = [];
  const combinedPaths: ContourPath[] = [];

  let cursorX = 0;
  let maxAscent = 0;
  let maxDescent = 0;

  for (let i = 0; i < chars.length; i++) {
    const glyph = glyphContours[i];

    // Apply kerning adjustment
    let kerning = 0;
    if (i > 0) {
      if (useOpticalKerning) {
        const prevGlyph = glyphContours[i - 1];
        kerning = calculateOpticalKerningAdjustment(prevGlyph, glyph, letterSpacing);
      } else if (useFontKerning) {
        kerning = getKerningAdjustment(config.fontFamily, chars[i - 1], chars[i]);
      }
    }

    const x = cursorX + kerning;
    const y = 0;

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
    totalWidth: cursorX - letterSpacing,
    ascent: maxAscent,
    descent: maxDescent,
    combinedPaths,
  };
}
