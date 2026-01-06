/**
 * @file Single character glyph contour extraction
 *
 * Extracts contours for individual characters using canvas rendering.
 * Works with cache for efficient character-level caching.
 */

import type { GlyphContour, GlyphStyleKey, ContourPath } from "./types";
import { getCachedGlyph, setCachedGlyph } from "./cache";

// =============================================================================
// Configuration
// =============================================================================

const RENDER_SCALE = 2;
const THRESHOLD = 128;
const SIMPLIFY_TOLERANCE = 0.8;
const MIN_CONTOUR_POINTS = 4;
const MAX_TRACE_ITERATIONS = 5000;
const MAX_CONTOURS_PER_CHAR = 20;

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

  // Handle whitespace
  if (char === " " || char === "\t" || char === "\n") {
    const spaceGlyph = createWhitespaceGlyph(char, fontFamily, style);
    setCachedGlyph(fontFamily, char, style, spaceGlyph);
    return spaceGlyph;
  }

  // Check if we're in a browser environment
  if (typeof document === "undefined") {
    // Return fallback glyph for non-browser environments (SSR, tests)
    const fallback = createFallbackGlyph(char, style);
    setCachedGlyph(fontFamily, char, style, fallback);
    return fallback;
  }

  try {
    // Render and extract
    const glyph = renderAndExtractGlyph(char, fontFamily, style);
    setCachedGlyph(fontFamily, char, style, glyph);
    return glyph;
  } catch (error) {
    // Return fallback on error
    console.warn(`Failed to extract glyph for "${char}":`, error);
    const fallback = createFallbackGlyph(char, style);
    setCachedGlyph(fontFamily, char, style, fallback);
    return fallback;
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

// =============================================================================
// Whitespace Handling
// =============================================================================

function createWhitespaceGlyph(
  char: string,
  fontFamily: string,
  style: GlyphStyleKey,
): GlyphContour {
  // Default width for whitespace
  let advanceWidth = style.fontSize * 0.3;

  // Try to measure using canvas if available
  if (typeof document !== "undefined") {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px "${fontFamily}"`;
        const metrics = ctx.measureText(char);
        advanceWidth = char === "\t" ? metrics.width * 4 : metrics.width;
      }
    } catch {
      // Use default
    }
  }

  return {
    char,
    paths: [],
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    metrics: {
      advanceWidth,
      leftBearing: 0,
      ascent: 0,
      descent: 0,
    },
  };
}

/**
 * Create fallback glyph when extraction fails or in non-browser environment
 */
export function createFallbackGlyph(char: string, style: GlyphStyleKey): GlyphContour {
  const width = style.fontSize * 0.6;
  const height = style.fontSize * 0.8;

  return {
    char,
    // Simple rectangle as fallback shape
    paths: [
      {
        points: [
          { x: 0, y: 0 },
          { x: width, y: 0 },
          { x: width, y: height },
          { x: 0, y: height },
        ],
        isHole: false,
      },
    ],
    bounds: { minX: 0, minY: 0, maxX: width, maxY: height },
    metrics: {
      advanceWidth: width,
      leftBearing: 0,
      ascent: height * 0.8,
      descent: height * 0.2,
    },
  };
}

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
  const fontString = `${style.fontStyle} ${style.fontWeight} ${scaledSize}px "${fontFamily}"`;
  ctx.font = fontString;
  const textMetrics = ctx.measureText(char);

  // Calculate canvas size
  const padding = scaledSize * 0.3;
  const width = Math.ceil(Math.max(textMetrics.width, scaledSize * 0.5) + padding * 2);
  const height = Math.ceil(scaledSize * 1.4 + padding * 2);

  canvas.width = Math.min(width, 256); // Limit size
  canvas.height = Math.min(height, 256);

  // Re-apply font after resize
  ctx.font = fontString;
  ctx.textBaseline = "alphabetic";

  // Render
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.fillText(char, padding, canvas.height - padding - scaledSize * 0.15);

  // Extract contours
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const rawContours = extractContours(imageData);
  const paths = processContours(rawContours, RENDER_SCALE, padding);

  // Calculate bounds
  const bounds = calculateBounds(paths);

  // Calculate metrics
  const metrics = {
    advanceWidth: textMetrics.width / RENDER_SCALE,
    leftBearing: (textMetrics.actualBoundingBoxLeft ?? 0) / RENDER_SCALE,
    ascent: (textMetrics.actualBoundingBoxAscent ?? scaledSize * 0.8) / RENDER_SCALE,
    descent: (textMetrics.actualBoundingBoxDescent ?? scaledSize * 0.2) / RENDER_SCALE,
  };

  return { char, paths, bounds, metrics };
}

// =============================================================================
// Contour Extraction (Moore Neighborhood)
// =============================================================================

type Point = { x: number; y: number };
type RawContour = Point[];

function extractContours(imageData: ImageData): RawContour[] {
  const { width, height, data } = imageData;
  const contours: RawContour[] = [];

  // Binary image
  const binary = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    binary[i] = data[i * 4] >= THRESHOLD ? 1 : 0;
  }

  // Visited tracking
  const visited = new Uint8Array(width * height);

  // Find boundary pixels
  for (let y = 1; y < height - 1 && contours.length < MAX_CONTOURS_PER_CHAR; y++) {
    for (let x = 1; x < width - 1 && contours.length < MAX_CONTOURS_PER_CHAR; x++) {
      const idx = y * width + x;

      if (binary[idx] === 1 && visited[idx] === 0 && isBoundary(binary, x, y, width)) {
        const contour = traceBoundary(binary, visited, x, y, width, height);
        if (contour.length >= MIN_CONTOUR_POINTS) {
          contours.push(contour);
        }
      }
    }
  }

  return contours;
}

function isBoundary(binary: Uint8Array, x: number, y: number, width: number): boolean {
  const idx = y * width + x;
  if (binary[idx] === 0) return false;
  return (
    binary[idx - 1] === 0 ||
    binary[idx + 1] === 0 ||
    binary[idx - width] === 0 ||
    binary[idx + width] === 0
  );
}

function traceBoundary(
  binary: Uint8Array,
  visited: Uint8Array,
  startX: number,
  startY: number,
  width: number,
  height: number,
): RawContour {
  const contour: RawContour = [];
  const dx = [1, 1, 0, -1, -1, -1, 0, 1];
  const dy = [0, 1, 1, 1, 0, -1, -1, -1];

  let x = startX;
  let y = startY;
  let dir = 0;
  let iterations = 0;

  do {
    if (++iterations > MAX_TRACE_ITERATIONS) break;

    const idx = y * width + x;
    visited[idx] = 1;
    contour.push({ x, y });

    let found = false;
    const startDir = (dir + 5) % 8;

    for (let i = 0; i < 8; i++) {
      const checkDir = (startDir + i) % 8;
      const nx = x + dx[checkDir];
      const ny = y + dy[checkDir];

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        if (binary[ny * width + nx] === 1) {
          x = nx;
          y = ny;
          dir = checkDir;
          found = true;
          break;
        }
      }
    }

    if (!found) break;
  } while (!(x === startX && y === startY) || contour.length < 3);

  return contour;
}

// =============================================================================
// Contour Processing
// =============================================================================

function processContours(
  rawContours: RawContour[],
  scale: number,
  padding: number,
): ContourPath[] {
  return rawContours.map((raw) => {
    // Subsample long contours
    let points = raw;
    if (raw.length > 300) {
      const step = Math.ceil(raw.length / 300);
      points = raw.filter((_, i) => i % step === 0);
    }

    // Simplify
    const simplified = douglasPeucker(points, SIMPLIFY_TOLERANCE);

    // Scale and offset (remove padding)
    const scaledPoints = simplified.map((p) => ({
      x: (p.x - padding) / scale,
      y: (p.y - padding) / scale,
    }));

    const isHole = !isClockwise(scaledPoints);
    return { points: scaledPoints, isHole };
  });
}

function douglasPeucker(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

function perpDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

function isClockwise(points: readonly { x: number; y: number }[]): boolean {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return area > 0;
}

function calculateBounds(paths: readonly ContourPath[]): GlyphContour["bounds"] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const path of paths) {
    for (const p of path.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }

  if (minX === Infinity) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  return { minX, minY, maxX, maxY };
}
