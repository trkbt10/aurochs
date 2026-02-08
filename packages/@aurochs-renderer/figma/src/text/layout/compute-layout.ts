/**
 * @file Unified text layout computation
 *
 * Computes text layout (line positions, baselines) from extracted text props.
 * This is the format-agnostic layout pipeline used by both SVG and WebGL backends.
 */

import type { ExtractedTextProps, TextAlignHorizontal, TextAlignVertical } from "./types";
import { getAlignedX, getAlignedYWithMetrics } from "./alignment";

/**
 * A single line of laid-out text
 */
export type LayoutLine = {
  /** Text content of this line */
  readonly text: string;
  /** X position (considering horizontal alignment) */
  readonly x: number;
  /** Y position (baseline) */
  readonly y: number;
  /** Line index (0-based) */
  readonly index: number;
};

/**
 * Complete text layout result
 */
export type TextLayout = {
  /** Laid-out lines with positions */
  readonly lines: readonly LayoutLine[];
  /** Horizontal alignment */
  readonly alignH: TextAlignHorizontal;
  /** Vertical alignment */
  readonly alignV: TextAlignVertical;
  /** Font size */
  readonly fontSize: number;
  /** Line height */
  readonly lineHeight: number;
  /** Ascender ratio (ascender / unitsPerEm) */
  readonly ascenderRatio: number;
};

/**
 * Options for computing text layout
 */
export type ComputeLayoutOptions = {
  /** Extracted text properties */
  readonly props: ExtractedTextProps;
  /** Explicit line array (from text wrapping). If not provided, splits by \n */
  readonly lines?: readonly string[];
  /** Ascender ratio from font metrics (for accurate baseline positioning) */
  readonly ascenderRatio?: number;
  /** Override line height (e.g., from font metrics for 100% line height) */
  readonly lineHeight?: number;
};

/**
 * Default ascender ratio when font metrics are not available
 */
const DEFAULT_ASCENDER_RATIO = 0.96875;

/**
 * Compute text layout from extracted properties
 *
 * This function determines the position of each text line based on
 * alignment, font metrics, and text box size.
 *
 * @param options - Layout computation options
 * @returns Computed text layout
 */
export function computeTextLayout(options: ComputeLayoutOptions): TextLayout {
  const { props, ascenderRatio = DEFAULT_ASCENDER_RATIO } = options;
  const lineHeight = options.lineHeight ?? props.lineHeight;

  // Get lines (from explicit array or split by newlines)
  const textLines = options.lines ?? props.characters.split("\n");

  // Calculate x position from horizontal alignment
  const x = getAlignedX(props.textAlignHorizontal, props.size?.width);

  // Calculate baseline y position from vertical alignment + font metrics
  const baseY = getAlignedYWithMetrics({
    align: props.textAlignVertical,
    height: props.size?.height,
    fontSize: props.fontSize,
    lineCount: textLines.length,
    lineHeight,
    ascenderRatio,
  });

  // Build laid-out lines
  const lines: LayoutLine[] = textLines.map((text, index) => ({
    text,
    x,
    y: baseY + index * lineHeight,
    index,
  }));

  return {
    lines,
    alignH: props.textAlignHorizontal,
    alignV: props.textAlignVertical,
    fontSize: props.fontSize,
    lineHeight,
    ascenderRatio,
  };
}
