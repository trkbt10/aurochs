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
  let currentLine = "";
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
 * Split text into lines with optional word wrapping.
 *
 * When props.textAutoResize is HEIGHT/NONE/TRUNCATE (fixed width),
 * wraps text at word boundaries using estimated character widths.
 * Otherwise (WIDTH_AND_HEIGHT), only splits at explicit newlines.
 */
function splitTextIntoLines(props: ExtractedTextProps): string[] {
  const paragraphs = props.characters.split("\n");

  if (!isFixedWidth(props.textAutoResize) || !props.size) {
    // No wrapping — just return paragraphs as lines
    return paragraphs;
  }

  const maxWidth = props.size.width;
  if (maxWidth <= 0) {
    return paragraphs;
  }

  const charWidth = estimateCharWidth(props.fontSize, props.letterSpacing);
  if (charWidth <= 0) {
    return paragraphs;
  }

  const allLines: string[] = [];
  for (const paragraph of paragraphs) {
    const wrapped = wrapParagraph(paragraph, maxWidth, charWidth);
    allLines.push(...wrapped);
  }
  return allLines;
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

  // Get lines: explicit array > word-wrapped > plain newline split
  const textLines = options.lines ?? splitTextIntoLines(props);

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
