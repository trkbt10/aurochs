/**
 * @file Single character glyph contour extraction
 *
 * Extracts contours for individual characters using canvas rendering.
 * Works with cache for efficient character-level caching.
 */

import type { GlyphContour, GlyphStyleKey, ContourPath } from "./types";
import { getCachedGlyph, setCachedGlyph } from "./cache";
import { formatFontFamily, GENERIC_FONT_FAMILIES } from "./font-family";
import { extractContours, processContours } from "./contour-extraction";
import { createWhitespaceGlyph } from "./whitespace-glyph";

// =============================================================================
// Configuration
// =============================================================================

const RENDER_SCALE = 2;

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
    const spaceGlyph = createWhitespaceGlyph(char, fontFamily, style);
    setCachedGlyph(fontFamily, char, style, spaceGlyph);
    return spaceGlyph;
  }

  try {
    // Render and extract
    const glyph = renderAndExtractGlyph(char, fontFamily, style);
    setCachedGlyph(fontFamily, char, style, glyph);
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

// createWhitespaceGlyph imported from ./whitespace-glyph

// =============================================================================
// Glyph Rendering & Extraction
// =============================================================================

function renderAndExtractGlyph(
  char: string,
  fontFamily: string,
  style: GlyphStyleKey,
): GlyphContour {
  const scaledSize = style.fontSize * RENDER_SCALE;

  // Create canvas for single character
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  // Set font and measure
  const fontString = `${style.fontStyle} ${style.fontWeight} ${scaledSize}px ${formatFontFamily(fontFamily, GENERIC_FONT_FAMILIES)}`;
  ctx.font = fontString;
  const textMetrics = ctx.measureText(char);
  const ascent = textMetrics.actualBoundingBoxAscent;
  const descent = textMetrics.actualBoundingBoxDescent;

  if (!Number.isFinite(ascent) || !Number.isFinite(descent)) {
    throw new Error("Canvas text metrics missing ascent/descent measurements.");
  }

  // Calculate canvas size
  const padding = scaledSize * 0.3;
  const width = Math.ceil(Math.max(textMetrics.width, scaledSize * 0.5) + padding * 2);
  const height = Math.ceil((ascent as number) + (descent as number) + padding * 2);

  canvas.width = Math.min(width, 256); // Limit size
  canvas.height = Math.min(height, 256);

  // Re-apply font after resize
  ctx.font = fontString;
  ctx.textBaseline = "alphabetic";

  // Render
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  const baselinePx = padding + (ascent as number);
  ctx.fillText(char, padding, baselinePx);

  // Extract contours
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const rawContours = extractContours(imageData);
  const baselineOffset = (baselinePx - padding) / RENDER_SCALE;
  const paths = processContours(rawContours, RENDER_SCALE, padding).map((path) => ({
    ...path,
    points: path.points.map((point) => ({
      x: point.x,
      y: point.y - baselineOffset,
    })),
  }));

  // Calculate bounds
  const bounds = calculateBounds(paths);

  // Calculate metrics
  const metrics = {
    advanceWidth: textMetrics.width / RENDER_SCALE,
    leftBearing: (textMetrics.actualBoundingBoxLeft ?? 0) / RENDER_SCALE,
    ascent: (ascent as number) / RENDER_SCALE,
    descent: (descent as number) / RENDER_SCALE,
  };

  return { char, paths, bounds, metrics };
}


// Contour extraction is shared in contour-extraction.ts

function calculateBounds(paths: readonly ContourPath[]): GlyphContour["bounds"] {
  const allPoints = paths.flatMap((path) => path.points);

  if (allPoints.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  const bounds = allPoints.reduce(
    (acc, p) => ({
      minX: Math.min(acc.minX, p.x),
      minY: Math.min(acc.minY, p.y),
      maxX: Math.max(acc.maxX, p.x),
      maxY: Math.max(acc.maxY, p.y),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );

  return bounds;
}
