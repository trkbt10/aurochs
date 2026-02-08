/**
 * @file Core glyph extraction logic shared between main thread and worker
 *
 * Pure extraction function with DI for canvas creation.
 * Caching is handled by callers (glyph.ts, text-async.ts).
 */

import type { GlyphContour, GlyphStyleKey } from "../types";
import { extractContours, processContours } from "./contour";
import { formatFontFamily, GENERIC_FONT_FAMILIES } from "./font-format";

// =============================================================================
// Types
// =============================================================================

/**
 * Canvas factory for dependency injection.
 * Main thread: document.createElement("canvas")
 * Worker: new OffscreenCanvas(width, height)
 */
export type CanvasFactory = (width: number, height: number) => {
  readonly canvas: { width: number; height: number };
  readonly ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
};

// =============================================================================
// Configuration
// =============================================================================

/**
 * Render scale multiplier for glyph extraction.
 * With Marching Squares interpolation, 2x provides good precision.
 */
const RENDER_SCALE = 2;

/**
 * Maximum canvas dimension.
 * Larger values support bigger fonts but use more memory.
 */
const MAX_CANVAS_SIZE = 512;

// =============================================================================
// Main API
// =============================================================================

/**
 * Extract glyph contours from a character using canvas rendering.
 * Pure function - no caching, no side effects.
 *
 * @param options - Options for glyph extraction
 * @param options.char - Single character to extract
 * @param options.fontFamily - Font family name
 * @param options.style - Font style (size, weight, style)
 * @param options.createCanvas - Factory function to create canvas with context
 * @returns Glyph contour data
 */
export function extractGlyphCore({
  char,
  fontFamily,
  style,
  createCanvas,
}: {
  readonly char: string;
  readonly fontFamily: string;
  readonly style: GlyphStyleKey;
  readonly createCanvas: CanvasFactory;
}): GlyphContour {
  const scaledSize = style.fontSize * RENDER_SCALE;

  // Calculate required canvas size based on font size
  // Use larger canvas for larger fonts to avoid clipping
  const estimatedSize = Math.ceil(scaledSize * 1.5);
  const initialSize = Math.min(Math.max(estimatedSize, 256), MAX_CANVAS_SIZE);

  // Create initial canvas for measurement
  const { canvas, ctx } = createCanvas(initialSize, initialSize);

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
  const height = Math.ceil(ascent + descent + padding * 2);

  // Resize canvas (clamp to max size)
  canvas.width = Math.min(width, MAX_CANVAS_SIZE);
  canvas.height = Math.min(height, MAX_CANVAS_SIZE);

  // Re-apply font after resize
  ctx.font = fontString;
  ctx.textBaseline = "alphabetic";

  // Render character
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  const baselinePx = padding + ascent;
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
    ascent: ascent / RENDER_SCALE,
    descent: descent / RENDER_SCALE,
  };

  return { char, paths, bounds, metrics };
}

/**
 * Create whitespace glyph (space, tab, newline).
 * No contour extraction needed - just metrics.
 *
 * @param options - Options for whitespace glyph creation
 * @param options.char - Whitespace character
 * @param options.fontFamily - Font family name
 * @param options.style - Font style (size, weight, style)
 * @param options.createCanvas - Factory function to create canvas with context
 * @returns Glyph contour data with empty paths
 */
export function createWhitespaceGlyphCore({
  char,
  fontFamily,
  style,
  createCanvas,
}: {
  readonly char: string;
  readonly fontFamily: string;
  readonly style: GlyphStyleKey;
  readonly createCanvas: CanvasFactory;
}): GlyphContour {
  const { ctx } = createCanvas(64, 64);

  const fontString = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${formatFontFamily(fontFamily, GENERIC_FONT_FAMILIES)}`;
  ctx.font = fontString;
  const textMetrics = ctx.measureText(char);
  const advanceWidth = char === "\t" ? textMetrics.width * 4 : textMetrics.width;

  return {
    char,
    paths: [],
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    metrics: { advanceWidth, leftBearing: 0, ascent: 0, descent: 0 },
  };
}

// =============================================================================
// Helpers
// =============================================================================

function calculateBounds(paths: GlyphContour["paths"]): GlyphContour["bounds"] {
  const allPoints = paths.flatMap((path) => path.points);

  if (allPoints.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  return allPoints.reduce(
    (acc, p) => ({
      minX: Math.min(acc.minX, p.x),
      minY: Math.min(acc.minY, p.y),
      maxX: Math.max(acc.maxX, p.x),
      maxY: Math.max(acc.maxY, p.y),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
}
