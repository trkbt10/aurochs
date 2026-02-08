/**
 * @file Optical kerning helpers
 *
 * Computes pair spacing based on measured glyph contours instead of font kerning tables.
 */

import type { GlyphContour } from "../types";

function hasInk(glyph: GlyphContour): boolean {
  if (glyph.paths.length === 0) {
    return false;
  }
  return glyph.bounds.maxX !== glyph.bounds.minX || glyph.bounds.maxY !== glyph.bounds.minY;
}

/**
 * Calculate the advance needed to keep a target ink gap between glyphs.
 *
 * The target gap is typically the letterSpacing value in pixels.
 * When either glyph has no ink (e.g., whitespace), falls back to the
 * glyph's advance width plus target gap.
 */
export function calculateOpticalAdvance(
  prevGlyph: GlyphContour,
  nextGlyph: GlyphContour,
  targetGap: number,
): number {
  if (!hasInk(prevGlyph) || !hasInk(nextGlyph)) {
    return prevGlyph.metrics.advanceWidth + targetGap;
  }

  const desiredAdvance = prevGlyph.bounds.maxX - nextGlyph.bounds.minX + targetGap;
  if (!Number.isFinite(desiredAdvance)) {
    throw new Error("Optical kerning produced a non-finite advance.");
  }

  return Math.max(0, desiredAdvance);
}

/**
 * Calculate kerning adjustment based on optical spacing.
 *
 * Returns the delta to add to the pen position for the next glyph.
 */
export function calculateOpticalKerningAdjustment(
  prevGlyph: GlyphContour,
  nextGlyph: GlyphContour,
  letterSpacing: number,
): number {
  const defaultAdvance = prevGlyph.metrics.advanceWidth + letterSpacing;
  const opticalAdvance = calculateOpticalAdvance(prevGlyph, nextGlyph, letterSpacing);
  return opticalAdvance - defaultAdvance;
}
