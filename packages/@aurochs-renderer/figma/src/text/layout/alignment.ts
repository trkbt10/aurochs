/**
 * @file Text alignment calculations (shared, format-agnostic)
 */

import type { TextAlignHorizontal, TextAlignVertical } from "./types";

/**
 * Default ascender ratio used when font metrics are not available
 *
 * Inter font has ascender ratio of 0.96875 (1984/2048).
 * For accurate positioning, use getAlignedYWithMetrics() with actual font metrics.
 */
const DEFAULT_ASCENDER_RATIO = 0.96875;

/**
 * Get x position based on horizontal alignment
 *
 * @param align - Figma horizontal alignment
 * @param width - Text box width
 * @returns X position for text element
 */
export function getAlignedX(align: TextAlignHorizontal, width: number | undefined): number {
  if (!width) return 0;
  switch (align) {
    case "CENTER":
      return width / 2;
    case "RIGHT":
      return width;
    case "LEFT":
    case "JUSTIFIED":
    default:
      return 0;
  }
}

/**
 * Options for Y alignment calculation
 */
export type AlignYOptions = {
  /** Vertical alignment */
  align: TextAlignVertical;
  /** Text box height (optional) */
  height: number | undefined;
  /** Font size in pixels */
  fontSize: number;
  /** Number of text lines */
  lineCount: number;
  /** Line height in pixels */
  lineHeight: number;
  /** Ascender ratio (ascender / unitsPerEm) from font metrics */
  ascenderRatio?: number;
};

/**
 * Calculate starting y position based on vertical alignment
 *
 * The y value represents the baseline position of text.
 * We calculate where the first line's baseline should be placed
 * based on vertical alignment within the text box.
 *
 * @param options - Alignment options including font metrics
 * @returns Y position for first line baseline
 */
export function getAlignedYWithMetrics(options: AlignYOptions): number {
  const {
    align,
    height,
    fontSize,
    lineCount,
    lineHeight,
    ascenderRatio = DEFAULT_ASCENDER_RATIO,
  } = options;

  // Baseline offset from top of text box
  // ascenderRatio determines where baseline sits relative to top of em square
  const baselineOffset = fontSize * ascenderRatio;

  // Total text height: from top of first line to baseline of last line
  const totalTextHeight = baselineOffset + (lineCount - 1) * lineHeight;

  if (!height) {
    return baselineOffset; // Default: baseline at ascender from top
  }

  switch (align) {
    case "CENTER":
      return (height - totalTextHeight) / 2 + baselineOffset;
    case "BOTTOM":
      return height - totalTextHeight + baselineOffset;
    case "TOP":
    default:
      return baselineOffset;
  }
}

/**
 * Calculate starting y position based on vertical alignment (legacy API)
 *
 * @deprecated Use getAlignedYWithMetrics() for accurate font-aware positioning
 */
export function getAlignedY(
  align: TextAlignVertical,
  height: number | undefined,
  fontSize: number,
  lineCount: number,
  lineHeight: number
): number {
  return getAlignedYWithMetrics({
    align,
    height,
    fontSize,
    lineCount,
    lineHeight,
  });
}
