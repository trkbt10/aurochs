/**
 * @file Text width measurement
 *
 * Measures text width using Canvas API for accuracy with browser rendering.
 * Falls back to font-metrics estimation in non-browser environments.
 *
 * All measurements use plain numbers (pixels for width, points for font size).
 * For type-safe branded units, use @aurochs-office/text-layout which wraps these functions.
 *
 * @see ../metrics/font-metrics.ts - Font metrics data (fallback)
 */

import { PT_TO_PX } from "./units";
import { getCharWidth, getKerningAdjustment, isCjkCodePoint, isMonospace } from "../metrics";

// =============================================================================
// Canvas Measurement
// =============================================================================

/**
 * Shared canvas context for text measurement.
 * Created lazily and reused for performance.
 */
const measurementState: {
  canvas?: HTMLCanvasElement;
  context?: CanvasRenderingContext2D;
  lastInitError?: unknown;
} = {};

/**
 * Check if Canvas measurement is available.
 */
function canUseCanvas(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  if (measurementState.context !== undefined) {
    return true;
  }
  try {
    measurementState.canvas = document.createElement("canvas");
    measurementState.context = measurementState.canvas.getContext("2d") ?? undefined;
    return measurementState.context !== undefined;
  } catch (error) {
    measurementState.canvas = undefined;
    measurementState.context = undefined;
    measurementState.lastInitError = error;
    return false;
  }
}

/**
 * Build a CSS font string for Canvas measurement.
 * Must match the format used by SVG rendering.
 */
function buildFontString(args: {
  readonly fontSizePx: number;
  readonly fontFamily: string;
  readonly fontWeight: number;
  readonly fontStyle: "normal" | "italic";
}): string {
  const { fontSizePx, fontFamily, fontWeight, fontStyle } = args;
  const style = fontStyle === "italic" ? "italic " : "";
  const weight = fontWeight !== 400 ? `${fontWeight} ` : "";
  return `${style}${weight}${fontSizePx}px ${fontFamily}`;
}

/**
 * Measurement cache to avoid redundant Canvas calls.
 * Key format: "fontString|letterSpacing|text"
 */
const measurementCache = new Map<string, number>();
const MAX_CACHE_SIZE = 10000;

/**
 * Measure text width using Canvas API.
 * Returns undefined if Canvas is not available.
 */
function measureWithCanvas(args: {
  readonly text: string;
  readonly fontSizePx: number;
  readonly fontFamily: string;
  readonly fontWeight: number;
  readonly fontStyle: "normal" | "italic";
  readonly letterSpacing: number;
}): number | undefined {
  const { text, fontSizePx, fontFamily, fontWeight, fontStyle, letterSpacing } = args;
  if (!canUseCanvas() || measurementState.context === undefined) {
    return undefined;
  }

  const ctx = measurementState.context;
  const fontString = buildFontString({ fontSizePx, fontFamily, fontWeight, fontStyle });
  const cacheKey = `${fontString}|${letterSpacing}|${text}`;

  const cached = measurementCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Set font and letter spacing
  ctx.font = fontString;
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${letterSpacing}px`;

  const metrics = ctx.measureText(text);
  const width = metrics.width;

  // Maintain cache size
  if (measurementCache.size >= MAX_CACHE_SIZE) {
    const firstKey = measurementCache.keys().next().value;
    if (firstKey !== undefined) {
      measurementCache.delete(firstKey);
    }
  }
  measurementCache.set(cacheKey, width);

  return width;
}

// =============================================================================
// Character Width Calculation
// =============================================================================

/**
 * Result of character width calculation with kerning.
 * All values are in pixels.
 */
export type CharWidthResult = {
  /** Character width in pixels */
  readonly width: number;
  /** Kerning adjustment from previous character (negative = tighter) */
  readonly kerningAdjust: number;
  /** Total width including kerning adjustment */
  readonly totalWidth: number;
};

/**
 * Calculate the width of a single character with kerning context.
 *
 * @param char - Current character
 * @param prevChar - Previous character (for kerning)
 * @param fontSizePt - Font size in points
 * @param fontFamily - Font family name
 * @param fontWeight - Font weight (default: 400)
 * @returns Character width result with kerning adjustment (all values in pixels)
 */
export function calculateCharWidth(args: {
  readonly char: string;
  readonly prevChar: string | undefined;
  readonly fontSizePt: number;
  readonly fontFamily: string;
  readonly fontWeight?: number;
}): CharWidthResult {
  const { char, prevChar, fontSizePt, fontFamily, fontWeight = 400 } = args;
  const charCode = char.charCodeAt(0);
  const fontSizePx = fontSizePt * PT_TO_PX;
  const isCjk = isCjkCodePoint(charCode);

  // Get base character width from font metrics (with bold adjustment)
  const widthRatio = getCharWidth({ char, fontFamily, isCjk, fontWeight });
  const width = fontSizePx * widthRatio;

  // Calculate kerning adjustment
  const kerningAdjust = resolveKerningAdjust({ prevChar, char, fontSizePx, fontFamily });

  return {
    width,
    kerningAdjust,
    totalWidth: width + kerningAdjust,
  };
}

/**
 * Resolve kerning adjustment for a character pair.
 */
function resolveKerningAdjust(args: {
  readonly prevChar: string | undefined;
  readonly char: string;
  readonly fontSizePx: number;
  readonly fontFamily: string;
}): number {
  const { prevChar, char, fontSizePx, fontFamily } = args;
  if (prevChar === undefined) {
    return 0;
  }
  if (isMonospace(fontFamily)) {
    return 0;
  }
  const pair = prevChar + char;
  const kerningEm = getKerningAdjustment(pair, fontFamily);
  return fontSizePx * kerningEm;
}

// =============================================================================
// Text Width Measurement
// =============================================================================

/**
 * Measure the width of a text string.
 * Uses Canvas API for accurate browser-consistent measurement.
 * Falls back to font-metrics estimation in non-browser environments.
 *
 * @param text - Text to measure
 * @param fontSizePt - Font size in points
 * @param letterSpacingPx - Additional letter spacing in pixels
 * @param fontFamily - Font family for metrics lookup
 * @param fontWeight - Font weight (default: 400)
 * @param fontStyle - Font style (default: "normal")
 * @returns Width in pixels
 */
export function measureTextWidth(args: {
  readonly text: string;
  readonly fontSizePt: number;
  readonly letterSpacingPx: number;
  readonly fontFamily: string;
  readonly fontWeight?: number;
  readonly fontStyle?: "normal" | "italic";
}): number {
  const { text, fontSizePt, letterSpacingPx, fontFamily, fontWeight = 400, fontStyle = "normal" } = args;
  const fontSizePx = fontSizePt * PT_TO_PX;

  // Try Canvas measurement first (matches browser rendering)
  const canvasWidth = measureWithCanvas({
    text,
    fontSizePx,
    fontFamily,
    fontWeight,
    fontStyle,
    letterSpacing: letterSpacingPx,
  });
  if (canvasWidth !== undefined) {
    return canvasWidth;
  }

  // Fallback to font-metrics estimation
  return estimateTextWidthFallback({ text, fontSizePt, letterSpacingPx, fontFamily, fontWeight });
}

/**
 * Fallback text width estimation using font metrics.
 * Used when Canvas is not available (e.g., server-side rendering).
 */
export function estimateTextWidthFallback(args: {
  readonly text: string;
  readonly fontSizePt: number;
  readonly letterSpacingPx: number;
  readonly fontFamily: string;
  readonly fontWeight?: number;
}): number {
  const { text, fontSizePt, letterSpacingPx, fontFamily, fontWeight = 400 } = args;
  const chars = Array.from(text);

  const width = chars.reduce((acc, char, index) => {
    const prevChar = index > 0 ? chars[index - 1] : undefined;
    const charResult = calculateCharWidth({ char, prevChar, fontSizePt, fontFamily, fontWeight });
    const spacing = index > 0 ? letterSpacingPx : 0;
    return acc + charResult.totalWidth + spacing;
  }, 0);

  return width;
}

// =============================================================================
// Detailed Measurement (for kerning)
// =============================================================================

/**
 * Detailed span measurement with per-character data.
 * All values are in pixels.
 */
export type DetailedMeasurement = {
  /** Total width in pixels */
  readonly totalWidth: number;
  /** Per-character width data */
  readonly charWidths: readonly CharWidthResult[];
  /** Cumulative positions (x offset for each character) in pixels */
  readonly positions: readonly number[];
};

/**
 * Calculate detailed character measurements for a text span.
 * Returns per-character width and position data for precise tspan placement.
 *
 * @param text - Text to measure
 * @param fontSizePt - Font size in points
 * @param letterSpacingPx - Additional letter spacing in pixels
 * @param fontFamily - Font family for metrics lookup
 * @param fontWeight - Font weight (default: 400)
 * @returns Detailed measurement with per-character data (all values in pixels)
 */
export function measureTextDetailed(args: {
  readonly text: string;
  readonly fontSizePt: number;
  readonly letterSpacingPx: number;
  readonly fontFamily: string;
  readonly fontWeight?: number;
}): DetailedMeasurement {
  const { text, fontSizePt, letterSpacingPx, fontFamily, fontWeight = 400 } = args;
  const chars = Array.from(text);

  const measurement = chars.reduce(
    (acc, char, index) => {
      const prevChar = index > 0 ? chars[index - 1] : undefined;
      const charResult = calculateCharWidth({ char, prevChar, fontSizePt, fontFamily, fontWeight });
      const spacing = index > 0 ? letterSpacingPx : 0;

      acc.positions.push(acc.totalWidth);
      acc.charWidths.push(charResult);
      acc.totalWidth += charResult.totalWidth + spacing;
      return acc;
    },
    { totalWidth: 0, charWidths: [] as CharWidthResult[], positions: [] as number[] },
  );

  return {
    totalWidth: measurement.totalWidth,
    charWidths: measurement.charWidths,
    positions: measurement.positions,
  };
}

// =============================================================================
// Text Measurer Interface (for dependency injection)
// =============================================================================

/**
 * Text measurer interface for measuring text width.
 * Allows injection of different measurement strategies.
 */
export type TextMeasurer = {
  /**
   * Measure the width of a text string.
   *
   * @param text - Text to measure
   * @param fontSizePt - Font size in points
   * @param letterSpacingPx - Additional letter spacing in pixels
   * @param fontFamily - Font family for metrics lookup
   * @param fontWeight - Font weight (default: 400)
   * @param fontStyle - Font style (default: "normal")
   * @returns Width in pixels
   */
  measureTextWidth(args: {
    readonly text: string;
    readonly fontSizePt: number;
    readonly letterSpacingPx: number;
    readonly fontFamily: string;
    readonly fontWeight?: number;
    readonly fontStyle?: "normal" | "italic";
  }): number;
};

/**
 * Create a text measurer instance.
 * Returns the default Canvas-based measurer with font-metrics fallback.
 */
export function createTextMeasurer(): TextMeasurer {
  return {
    measureTextWidth,
  };
}
