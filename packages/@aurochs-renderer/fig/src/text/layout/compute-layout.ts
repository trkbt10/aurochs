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
  /**
   * X position (SVG text-anchor point).
   *
   * This is the coordinate used as SVG <text x=...>. Its meaning depends on
   * the horizontal alignment (textAnchor):
   * - LEFT/start:  left edge of text
   * - CENTER/middle: center of text
   * - RIGHT/end:   right edge of text
   */
  readonly x: number;
  /** Y position (baseline) */
  readonly y: number;
  /** Line index (0-based, across all paragraphs) */
  readonly index: number;
  /**
   * Paragraph index (0-based).
   *
   * Tracks which source paragraph (\n-delimited) this line belongs to.
   * A single paragraph may produce multiple lines when word-wrapping is active.
   * This is essential for cursor position mapping: editor-core's TextBodyLike
   * uses paragraph structure, so the cursor layout must group lines by paragraph.
   */
  readonly paragraphIndex: number;
  /**
   * Estimated pixel width of the line's text content.
   *
   * Computed from character count × estimated character width. This is an
   * approximation suitable for cursor positioning when precise font metrics
   * are unavailable. Callers with access to canvas.measureText (browser) or
   * font metrics can override this value for higher accuracy.
   */
  readonly estimatedWidth: number;
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
 * Average character width as a fraction of font size.
 *
 * For proportional fonts like Inter, Helvetica, Arial, the average
 * character width is approximately 0.5–0.6 × fontSize. We use 0.55
 * as a balance between narrow (i, l, t) and wide (m, w) characters.
 * This is used only when precise font measurement is not available.
 */
const AVERAGE_CHAR_WIDTH_RATIO = 0.55;

/**
 * Whether the text auto-resize mode implies a fixed width (wrapping enabled).
 *
 * - WIDTH_AND_HEIGHT: Text box expands to fit content — no wrapping.
 * - HEIGHT: Fixed width, height expands — wrapping enabled.
 * - NONE: Fixed width and height — wrapping enabled (may clip).
 * - TRUNCATE: Fixed width and height with truncation — wrapping enabled.
 */
function isFixedWidth(textAutoResize: string): boolean {
  return textAutoResize !== "WIDTH_AND_HEIGHT";
}

/**
 * Estimate character width for a given font size and letter spacing.
 * Used when precise font measurement is not available.
 */
function estimateCharWidth(fontSize: number, letterSpacing: number | undefined): number {
  return fontSize * AVERAGE_CHAR_WIDTH_RATIO + (letterSpacing ?? 0);
}

/**
 * Simple word-wrap algorithm using estimated character widths.
 *
 * Breaks text into lines that fit within maxWidth, preferring word
 * boundaries. Falls back to character-level breaks for words wider
 * than maxWidth.
 *
 * @param text - Single paragraph text (no newlines)
 * @param maxWidth - Maximum line width in pixels
 * @param charWidth - Estimated width per character
 * @returns Array of line strings
 */
function wrapParagraph(text: string, maxWidth: number, charWidth: number): string[] {
  if (text.length === 0) {
    return [""];
  }

  // If the whole text fits, no wrapping needed
  if (text.length * charWidth <= maxWidth) {
    return [text];
  }

  const lines: string[] = [];
  const words = text.split(/( +)/); // Split keeping spaces as separate entries
  // eslint-disable-next-line no-restricted-syntax -- mutable line buffer for word-wrap; cannot be expressed as pure reduce without complexity
  let currentLine = "";
  // eslint-disable-next-line no-restricted-syntax -- mutable width accumulator for word-wrap
  let currentWidth = 0;

  for (const word of words) {
    const wordWidth = word.length * charWidth;

    if (currentLine.length === 0) {
      // First word on a new line — always take it (even if too wide)
      if (wordWidth > maxWidth && word.trim().length > 0) {
        // Word is wider than maxWidth — break by character
        for (const ch of word) {
          if (currentWidth + charWidth > maxWidth && currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = "";
            currentWidth = 0;
          }
          currentLine += ch;
          currentWidth += charWidth;
        }
      } else {
        currentLine = word;
        currentWidth = wordWidth;
      }
    } else if (currentWidth + wordWidth <= maxWidth) {
      // Word fits on the current line
      currentLine += word;
      currentWidth += wordWidth;
    } else {
      // Word doesn't fit — start a new line
      // Trim trailing spaces from the current line
      lines.push(currentLine.trimEnd());
      // Skip leading spaces for the new line
      const trimmedWord = word.trimStart();
      if (trimmedWord.length === 0) {
        currentLine = "";
        currentWidth = 0;
      } else if (trimmedWord.length * charWidth > maxWidth) {
        // Word is wider than maxWidth — break by character
        currentLine = "";
        currentWidth = 0;
        for (const ch of trimmedWord) {
          if (currentWidth + charWidth > maxWidth && currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = "";
            currentWidth = 0;
          }
          currentLine += ch;
          currentWidth += charWidth;
        }
      } else {
        currentLine = trimmedWord;
        currentWidth = trimmedWord.length * charWidth;
      }
    }
  }

  // Flush the last line
  if (currentLine.length > 0) {
    lines.push(currentLine.trimEnd());
  }

  // Ensure at least one line
  if (lines.length === 0) {
    lines.push("");
  }

  return lines;
}

/**
 * A line with its source paragraph index.
 */
type LineWithParagraph = {
  readonly text: string;
  readonly paragraphIndex: number;
};

/**
 * Split text into lines with optional word wrapping, preserving paragraph origin.
 *
 * Each output line carries the index of its source paragraph (\n-delimited).
 * This is essential for cursor position mapping: a single paragraph may produce
 * multiple visual lines when word-wrapping is active, but editor-core's
 * TextBodyLike treats each \n-delimited segment as one paragraph.
 *
 * When props.textAutoResize is HEIGHT/NONE/TRUNCATE (fixed width),
 * wraps text at word boundaries using estimated character widths.
 * Otherwise (WIDTH_AND_HEIGHT), only splits at explicit newlines.
 */
function splitTextIntoLines(props: ExtractedTextProps): LineWithParagraph[] {
  const paragraphs = props.characters.split("\n");

  if (!isFixedWidth(props.textAutoResize) || !props.size) {
    return paragraphs.map((text, i) => ({ text, paragraphIndex: i }));
  }

  const maxWidth = props.size.width;
  if (maxWidth <= 0) {
    return paragraphs.map((text, i) => ({ text, paragraphIndex: i }));
  }

  const charWidth = estimateCharWidth(props.fontSize, props.letterSpacing);
  if (charWidth <= 0) {
    return paragraphs.map((text, i) => ({ text, paragraphIndex: i }));
  }

  const allLines: LineWithParagraph[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const wrapped = wrapParagraph(paragraphs[i], maxWidth, charWidth);
    for (const line of wrapped) {
      allLines.push({ text: line, paragraphIndex: i });
    }
  }
  return allLines;
}

function resolveLinesWithParagraph(
  explicitLines: readonly string[] | undefined,
  props: ExtractedTextProps,
): LineWithParagraph[] {
  if (explicitLines) {
    return explicitLines.map((text, i) => ({ text, paragraphIndex: i }));
  }
  return splitTextIntoLines(props);
}

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

  // Get lines with paragraph origin tracking.
  // If explicit lines are provided (no paragraph info), treat each as its own paragraph.
  const linesWithParagraph: LineWithParagraph[] = resolveLinesWithParagraph(options.lines, props);

  // Calculate x position from horizontal alignment
  const x = getAlignedX(props.textAlignHorizontal, props.size?.width);

  // Calculate baseline y position from vertical alignment + font metrics
  const baseY = getAlignedYWithMetrics({
    align: props.textAlignVertical,
    height: props.size?.height,
    fontSize: props.fontSize,
    lineCount: linesWithParagraph.length,
    lineHeight,
    ascenderRatio,
  });

  // Estimate character width for approximate line width calculation
  const charWidth = estimateCharWidth(props.fontSize, props.letterSpacing);

  // Build laid-out lines
  const lines: LayoutLine[] = linesWithParagraph.map((lwp, index) => ({
    text: lwp.text,
    x,
    y: baseY + index * lineHeight,
    index,
    paragraphIndex: lwp.paragraphIndex,
    estimatedWidth: lwp.text.length * charWidth,
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

// =============================================================================
// Cursor layout conversion
// =============================================================================

/**
 * A positioned span for cursor calculation.
 * (Matches editor-core's LayoutSpanLike structurally)
 */
export type CursorLayoutSpan = {
  readonly text: string;
  readonly width: number;
  readonly dx: number;
  readonly fontSize: number;
};

/**
 * A positioned line for cursor calculation.
 * (Matches editor-core's LayoutLineLike structurally)
 */
export type CursorLayoutLine = {
  readonly spans: readonly CursorLayoutSpan[];
  readonly x: number;
  readonly y: number;
  readonly height: number;
};

/**
 * Layout result for cursor calculation.
 * (Matches editor-core's LayoutResultLike structurally)
 */
export type CursorLayoutResult = {
  readonly paragraphs: readonly {
    readonly lines: readonly CursorLayoutLine[];
  }[];
};

/**
 * Convert TextLayout's SVG-anchor-based coordinates to left-edge coordinates
 * for cursor position calculation.
 *
 * SVG <text> uses textAnchor for alignment:
 * - "start" (LEFT): x = left edge of text
 * - "middle" (CENTER): x = center of text → left edge = x − width/2
 * - "end" (RIGHT): x = right edge of text → left edge = x − width
 *
 * editor-core's cursor positioning expects line.x to be the LEFT edge
 * and span.width to be the rendered text width.
 *
 * This function is the single conversion point between these two coordinate
 * systems. FigTextEditOverlay calls this instead of performing its own
 * coordinate arithmetic.
 *
 * @param layout - Result of computeTextLayout()
 * @param getLineTextWidth - Optional function to measure actual text width
 *   per line (e.g., via canvas.measureText). If not provided, falls back to
 *   LayoutLine.estimatedWidth. Callers with browser access should provide this
 *   for accurate cursor placement.
 * @returns Cursor layout result suitable for editor-core's coordinate-to-cursor functions
 */
export function textLayoutToCursorLayout(
  layout: TextLayout,
  getLineTextWidth?: (text: string) => number,
): CursorLayoutResult {
  return computeCursorLayout(layout, getLineTextWidth);
}

function computeLeftX(anchorX: number, textWidth: number, alignH: string): number {
  switch (alignH) {
    case "CENTER":
      return anchorX - textWidth / 2;
    case "RIGHT":
      return anchorX - textWidth;
    default: // LEFT, JUSTIFIED
      return anchorX;
  }
}

function computeCursorLayout(
  layout: TextLayout,
  getLineTextWidth?: (text: string) => number,
): CursorLayoutResult {
  // Group layout lines by paragraphIndex.
  // A single source paragraph (\n-delimited) may produce multiple visual lines
  // when word-wrapping is active. editor-core's TextBodyLike uses \n-delimited
  // paragraphs, so the cursor layout must mirror that structure: each paragraph
  // contains all the visual lines that originated from the same source paragraph.
  //
  // Example: "長文テキスト\n後ろのテキスト" with wrapping:
  //   paragraph 0: line "長文テ", line "キスト"
  //   paragraph 1: line "後ろの", line "テキス", line "ト"

  const grouped = new Map<number, CursorLayoutLine[]>();

  for (const line of layout.lines) {
    const textWidth = getLineTextWidth ? getLineTextWidth(line.text) : line.estimatedWidth;

    // Convert SVG text-anchor x to left-edge x
    const leftX = computeLeftX(line.x, textWidth, layout.alignH);

    const cursorLine: CursorLayoutLine = {
      spans: [{
        text: line.text,
        width: textWidth,
        dx: 0,
        fontSize: layout.fontSize,
      }],
      x: leftX,
      y: line.y,
      height: layout.lineHeight,
    };

    const existing = grouped.get(line.paragraphIndex);
    if (existing) {
      existing.push(cursorLine);
    } else {
      grouped.set(line.paragraphIndex, [cursorLine]);
    }
  }

  // Build paragraphs in order of paragraphIndex
  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => a - b);
  const paragraphs = sortedKeys.map((key) => ({
    lines: grouped.get(key)!,
  }));

  return { paragraphs };
}
