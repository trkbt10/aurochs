/**
 * @file Text geometry utilities
 *
 * Shared utilities for calculating text visual positions.
 * Used by both cursor positioning and text overlay rendering.
 */

import type { Pixels, Points } from "../../../../pptx/domain/types";
import type { LayoutLine, PositionedSpan } from "../../../../pptx/render/text-layout";
import { PT_TO_PX } from "../../../../pptx/domain/unit-conversion";
import { measureLayoutSpanTextWidth } from "../../../../pptx/render/react/text-measure/span-measure";
import { getAscenderRatio } from "../../../../text/font-metrics";

// =============================================================================
// Constants
// =============================================================================

/**
 * Default font size in points when no span is available.
 */
export const DEFAULT_FONT_SIZE_PT: Points = 12 as Points;

// =============================================================================
// Font Size Utilities
// =============================================================================

/**
 * Convert font size from points to pixels.
 */
export function fontSizeToPixels(fontSizePt: Points): Pixels {
  return ((fontSizePt as number) * PT_TO_PX) as Pixels;
}

/**
 * Get the effective font size for a line (max span size or default).
 */
export function getLineFontSize(line: LayoutLine): Points {
  if (line.spans.length === 0) {
    return DEFAULT_FONT_SIZE_PT;
  }

  let maxSize = line.spans[0].fontSize as number;
  for (const span of line.spans) {
    const size = span.fontSize as number;
    if (size > maxSize) {
      maxSize = size;
    }
  }

  return maxSize as Points;
}

/**
 * Get the font size at a specific character offset within a line.
 */
export function getFontSizeAtOffset(line: LayoutLine, charOffset: number): Points {
  // eslint-disable-next-line no-restricted-syntax -- early return in loop
  let remaining = charOffset;

  for (const span of line.spans) {
    if (remaining <= span.text.length) {
      return span.fontSize;
    }
    remaining -= span.text.length;
  }

  // Past end of line - use last span's font size or default
  if (line.spans.length > 0) {
    return line.spans[line.spans.length - 1].fontSize;
  }
  return DEFAULT_FONT_SIZE_PT;
}

/**
 * Get the max font size within a selection range in a line.
 */
export function getFontSizeForRange(
  line: LayoutLine,
  startOffset: number,
  endOffset: number,
): Points {
  if (line.spans.length === 0) {
    return DEFAULT_FONT_SIZE_PT;
  }

  const rangeStart = Math.min(startOffset, endOffset);
  const rangeEnd = Math.max(startOffset, endOffset);
  let maxSize = 0;
  let hasSelection = false;
  // eslint-disable-next-line no-restricted-syntax -- offset tracking
  let offset = 0;

  for (const span of line.spans) {
    const spanStart = offset;
    const spanEnd = offset + span.text.length;
    const intersects = spanEnd > rangeStart && spanStart < rangeEnd;
    if (intersects) {
      hasSelection = true;
      const size = span.fontSize as number;
      if (size > maxSize) {
        maxSize = size;
      }
    }
    offset = spanEnd;
  }

  if (!hasSelection) {
    return getLineFontSize(line);
  }

  return maxSize as Points;
}

// =============================================================================
// Visual Bounds Calculation
// =============================================================================

/**
 * Visual bounds for text at a position.
 */
export type TextVisualBounds = {
  /** Top Y coordinate (where text visually starts) */
  readonly topY: Pixels;
  /** Baseline Y coordinate */
  readonly baselineY: Pixels;
  /** Visual height of the text */
  readonly height: Pixels;
};

/**
 * Calculate visual bounds for text at a line position.
 * Uses font size for accurate positioning (not line.height which may include spacing).
 */
export function getTextVisualBounds(
  baselineY: Pixels,
  fontSizePt: Points,
  fontFamily?: string,
): TextVisualBounds {
  const fontSizePx = fontSizeToPixels(fontSizePt);
  const ascenderHeight = (fontSizePx as number) * getAscenderRatio(fontFamily);

  return {
    topY: ((baselineY as number) - ascenderHeight) as Pixels,
    baselineY,
    height: fontSizePx,
  };
}

/**
 * Calculate visual bounds for a line using the first span's font size.
 */
export function getLineVisualBounds(line: LayoutLine): TextVisualBounds {
  const fontSizePt = getLineFontSize(line);
  const fontFamily = line.spans[0]?.fontFamily;
  return getTextVisualBounds(line.y, fontSizePt, fontFamily);
}

/**
 * Calculate visual bounds at a specific character offset in a line.
 */
export function getVisualBoundsAtOffset(
  line: LayoutLine,
  charOffset: number,
): TextVisualBounds {
  const span = getSpanAtOffset(line, charOffset);
  const fontSizePt = span?.fontSize ?? getFontSizeAtOffset(line, charOffset);
  return getTextVisualBounds(line.y, fontSizePt, span?.fontFamily);
}

/**
 * Calculate visual bounds using the max font size within a line range.
 */
export function getVisualBoundsForRange(
  line: LayoutLine,
  startOffset: number,
  endOffset: number,
): TextVisualBounds {
  const { fontSizePt, fontFamily } = getFontMetricsForRange(line, startOffset, endOffset);
  return getTextVisualBounds(line.y, fontSizePt, fontFamily);
}

function getSpanAtOffset(
  line: LayoutLine,
  charOffset: number,
): PositionedSpan | undefined {
  // eslint-disable-next-line no-restricted-syntax -- early return in loop
  let remaining = charOffset;

  for (const span of line.spans) {
    if (remaining <= span.text.length) {
      return span;
    }
    remaining -= span.text.length;
  }

  return line.spans.length > 0 ? line.spans[line.spans.length - 1] : undefined;
}

function getFontMetricsForRange(
  line: LayoutLine,
  startOffset: number,
  endOffset: number,
): { fontSizePt: Points; fontFamily?: string } {
  if (line.spans.length === 0) {
    return { fontSizePt: DEFAULT_FONT_SIZE_PT };
  }

  const rangeStart = Math.min(startOffset, endOffset);
  const rangeEnd = Math.max(startOffset, endOffset);
  let maxSize = 0;
  let maxFamily: string | undefined = undefined;
  let hasSelection = false;
  // eslint-disable-next-line no-restricted-syntax -- offset tracking
  let offset = 0;

  for (const span of line.spans) {
    const spanStart = offset;
    const spanEnd = offset + span.text.length;
    const intersects = spanEnd > rangeStart && spanStart < rangeEnd;
    if (intersects) {
      hasSelection = true;
      const size = span.fontSize as number;
      if (size > maxSize) {
        maxSize = size;
        maxFamily = span.fontFamily;
      }
    }
    offset = spanEnd;
  }

  if (!hasSelection) {
    return {
      fontSizePt: getLineFontSize(line),
      fontFamily: line.spans[0]?.fontFamily,
    };
  }

  return { fontSizePt: maxSize as Points, fontFamily: maxFamily };
}

// =============================================================================
// X Position Utilities
// =============================================================================

/**
 * Get text width for a portion of a span (proportional estimation).
 */
export function getTextWidthForChars(span: PositionedSpan, charCount: number): Pixels {
  if (charCount === 0) {
    return 0 as Pixels;
  }
  if (charCount >= span.text.length) {
    return span.width;
  }

  const measured = measureLayoutSpanTextWidth(span, span.text.slice(0, charCount));
  if ((measured as number) > 0) {
    return measured;
  }

  // Fallback to proportional estimation when measurement is unavailable.
  const avgCharWidth = (span.width as number) / span.text.length;
  return (avgCharWidth * charCount) as Pixels;
}

/**
 * Get X position at a character offset within a line.
 */
export function getXPositionInLine(line: LayoutLine, charOffset: number): Pixels {
  // eslint-disable-next-line no-restricted-syntax -- early return in loop
  let x = line.x as number;
  // eslint-disable-next-line no-restricted-syntax -- early return in loop
  let remaining = charOffset;

  for (const span of line.spans) {
    if (remaining <= span.text.length) {
      return (x + (getTextWidthForChars(span, remaining) as number)) as Pixels;
    }
    remaining -= span.text.length;
    x += (span.width as number) + (span.dx as number);
  }

  return x as Pixels;
}

/**
 * Get end X position of a line.
 */
export function getLineEndX(line: LayoutLine): Pixels {
  return line.spans.reduce(
    (x, span) => (x + (span.width as number) + (span.dx as number)) as Pixels,
    line.x,
  );
}

// =============================================================================
// Line Text Length
// =============================================================================

/**
 * Get total text length of a line.
 */
export function getLineTextLength(line: LayoutLine): number {
  return line.spans.reduce((sum, span) => sum + span.text.length, 0);
}
