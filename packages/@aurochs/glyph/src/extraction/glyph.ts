/**
 * @file Single character glyph contour extraction (main thread)
 *
 * Extracts contours for individual characters using canvas rendering.
 * Works with cache for efficient character-level caching.
 */

import type { GlyphContour, GlyphStyleKey } from "../types";
import { getCachedGlyph, setCachedGlyph } from "./glyph-cache";
import { extractGlyphCore, createWhitespaceGlyphCore, type CanvasFactory } from "./extract-core";

// =============================================================================
// Canvas Factory (Main Thread)
// =============================================================================

const createMainThreadCanvas: CanvasFactory = (width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Failed to get 2D context from canvas.");
  }
  return { canvas, ctx };
};

// =============================================================================
// Main API
// =============================================================================

/**
 * Extract contours for a single character
 */
export function extractGlyphContour(
  char: string,
  fontFamily: string,
  style: GlyphStyleKey,
): GlyphContour {
  // Check cache first
  const cached = getCachedGlyph(fontFamily, char, style);
  if (cached) {
    return cached;
  }

  if (typeof document === "undefined") {
    throw new Error("Glyph extraction requires a browser canvas environment.");
  }

  // Handle whitespace
  if (char === " " || char === "\t" || char === "\n") {
    const spaceGlyph = createWhitespaceGlyphCore({ char, fontFamily, style, createCanvas: createMainThreadCanvas });
    setCachedGlyph({ fontFamily, char, style, glyph: spaceGlyph });
    return spaceGlyph;
  }

  try {
    // Render and extract using shared core
    const glyph = extractGlyphCore({ char, fontFamily, style, createCanvas: createMainThreadCanvas });
    setCachedGlyph({ fontFamily, char, style, glyph });
    return glyph;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to extract glyph for "${char}": ${message}`);
  }
}

/**
 * Extract contours for multiple characters (batch)
 * Returns array in same order as input
 */
export function extractGlyphContours(
  chars: string[],
  fontFamily: string,
  style: GlyphStyleKey,
): GlyphContour[] {
  return chars.map((char) => extractGlyphContour(char, fontFamily, style));
}
