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
} from "../types";
import { getKerningAdjustment } from "./kerning-table";
import { extractGlyphContour as defaultExtractGlyphContour } from "../extraction/glyph";
import { calculateOpticalKerningAdjustment } from "./kerning";

// =============================================================================
// Types
// =============================================================================

/**
 * Glyph extractor function type for dependency injection
 */
export type GlyphExtractor = (
  char: string,
  fontFamily: string,
  style: GlyphStyleKey,
) => GlyphContour;

/**
 * Dependencies for layout functions (for testing)
 */
export type LayoutDeps = {
  readonly extractGlyph: GlyphExtractor;
};

const defaultDeps: LayoutDeps = {
  extractGlyph: defaultExtractGlyphContour,
};

// =============================================================================
// Main API
// =============================================================================

/**
 * Layout text into positioned glyphs
 */
export function layoutText(
  text: string,
  config: TextLayoutConfig,
  deps: LayoutDeps = defaultDeps,
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
  const useOpticalKerning = config.opticalKerning === true;
  const enableKerning = config.enableKerning ?? true;
  const useFontKerning = enableKerning && !useOpticalKerning;

  // Extract all glyphs
  const chars = [...text]; // Properly handle Unicode (emoji, etc.)
  const glyphs: PositionedGlyph[] = [];
  const combinedPaths: ContourPath[] = [];

  // eslint-disable-next-line no-restricted-syntax -- Performance: accumulator pattern
  let cursorX = 0;
  // eslint-disable-next-line no-restricted-syntax -- Performance: accumulator pattern
  let maxAscent = 0;
  // eslint-disable-next-line no-restricted-syntax -- Performance: accumulator pattern
  let maxDescent = 0;

  for (const [i, char] of chars.entries()) {
    const glyph = deps.extractGlyph(char, config.fontFamily, style);

    // Apply kerning adjustment
    const kerning = calculateKerningForGlyph({
      index: i,
      glyph,
      glyphs,
      chars,
      fontFamily: config.fontFamily,
      letterSpacing,
      useOpticalKerning,
      useFontKerning,
    });

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

function calculateKerningForGlyph({
  index,
  glyph,
  glyphs,
  chars,
  fontFamily,
  letterSpacing,
  useOpticalKerning,
  useFontKerning,
}: {
  readonly index: number;
  readonly glyph: GlyphContour;
  readonly glyphs: readonly PositionedGlyph[];
  readonly chars: readonly string[];
  readonly fontFamily: string;
  readonly letterSpacing: number;
  readonly useOpticalKerning: boolean;
  readonly useFontKerning: boolean;
}): number {
  if (index === 0) {
    return 0;
  }

  if (useOpticalKerning) {
    const prevGlyph = glyphs[index - 1].glyph;
    return calculateOpticalKerningAdjustment(prevGlyph, glyph, letterSpacing);
  }

  if (useFontKerning) {
    return getKerningAdjustment(fontFamily, chars[index - 1], chars[index]);
  }

  return 0;
}

/**
 * Layout text and return combined bounds
 */
export function getTextBounds(
  text: string,
  config: TextLayoutConfig,
  deps: LayoutDeps = defaultDeps,
): { width: number; height: number; ascent: number; descent: number } {
  const layout = layoutText(text, config, deps);
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
export function splitTextIntoLines(text: string): string[] {
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
  deps: LayoutDeps = defaultDeps,
): number {
  if (text.length === 0) {
    return 0;
  }

  const style: GlyphStyleKey = {
    fontSize: config.fontSize,
    fontWeight: config.fontWeight,
    fontStyle: config.fontStyle,
  };

  const chars = [...text];
  const letterSpacing = config.letterSpacing ?? 0;
  const useOpticalKerning = config.opticalKerning === true;
  const enableKerning = config.enableKerning ?? true;
  const useFontKerning = enableKerning && !useOpticalKerning;

  const result = chars.reduce(
    (acc, char, i) => {
      const glyph = deps.extractGlyph(char, config.fontFamily, style);
      const kerning = calculateMeasureKerning({
        index: i,
        prevGlyph: acc.prevGlyph,
        currentGlyph: glyph,
        chars,
        fontFamily: config.fontFamily,
        letterSpacing,
        useOpticalKerning,
        useFontKerning,
      });

      return {
        width: acc.width + glyph.metrics.advanceWidth + kerning,
        prevGlyph: glyph,
      };
    },
    { width: 0, prevGlyph: null as GlyphContour | null },
  );

  return result.width + letterSpacing * (chars.length - 1);
}

function calculateMeasureKerning({
  index,
  prevGlyph,
  currentGlyph,
  chars,
  fontFamily,
  letterSpacing,
  useOpticalKerning,
  useFontKerning,
}: {
  readonly index: number;
  readonly prevGlyph: GlyphContour | null;
  readonly currentGlyph: GlyphContour;
  readonly chars: readonly string[];
  readonly fontFamily: string;
  readonly letterSpacing: number;
  readonly useOpticalKerning: boolean;
  readonly useFontKerning: boolean;
}): number {
  if (index === 0 || prevGlyph === null) {
    return 0;
  }

  if (useOpticalKerning) {
    return calculateOpticalKerningAdjustment(prevGlyph, currentGlyph, letterSpacing);
  }

  if (useFontKerning) {
    return getKerningAdjustment(fontFamily, chars[index - 1], chars[index]);
  }

  return 0;
}
