/**
 * @file Line breaking / word wrap
 *
 * Breaks text into lines based on available width.
 * Generic implementation that works with any span type extending BreakableSpan.
 * All measurements use plain numbers (pixels for width, points for font size).
 */

import type { BreakableSpan, LineFontInfo, LineBreakResult, TextWrapping } from "./types";
import { measureTextWidth } from "../measure/measurer";
import { isCjkCodePoint } from "../metrics/cjk";

// =============================================================================
// Constants
// =============================================================================

/**
 * Default font size in points when no span is available.
 * Uses a reasonable default for text layout.
 */
export const DEFAULT_FONT_SIZE_PT = 10;

// =============================================================================
// Break Detection
// =============================================================================

/**
 * Check if character is a word break opportunity (space, tab, hyphen).
 */
function isBreakChar(char: string): boolean {
  return char === " " || char === "\t" || char === "-";
}

/**
 * Apply text transform (uppercase/lowercase) to text.
 * Must match the transform applied during rendering.
 */
function applyTextTransform(
  text: string,
  transform: "none" | "uppercase" | "lowercase" | undefined,
): string {
  if (transform === "uppercase") {
    return text.toUpperCase();
  }
  if (transform === "lowercase") {
    return text.toLowerCase();
  }
  return text;
}

// =============================================================================
// Span Breaking
// =============================================================================

/**
 * Create an overflow span if there's remaining text.
 * Applies textTransform before measuring to match rendered width.
 */
function createOverflowSpan<T extends BreakableSpan>(span: T, overflowText: string): T | null {
  if (overflowText.length === 0) {
    return null;
  }
  // Apply text transform before measuring (matches rendering)
  const transformedText = applyTextTransform(overflowText, span.textTransform);
  return {
    ...span,
    text: overflowText,
    width: measureTextWidth({
      text: transformedText,
      fontSizePt: span.fontSize,
      letterSpacingPx: span.letterSpacing,
      fontFamily: span.fontFamily,
      fontWeight: span.fontWeight,
    }),
  };
}

/**
 * Break a single span into multiple spans at word boundaries.
 * Applies textTransform for width calculations to match rendered width.
 */
function breakSpanAtWidth<T extends BreakableSpan>(
  span: T,
  maxWidth: number,
  currentLineWidth: number,
): { fits: T | null; overflow: T | null } {
  const availableWidth = maxWidth - currentLineWidth;

  // If the whole span fits, return it
  if (span.width <= availableWidth) {
    return { fits: span, overflow: null };
  }

  const text = span.text;
  // Apply text transform for width calculations (matches rendering)
  const transformedText = applyTextTransform(text, span.textTransform);
  const state = { breakIndex: -1, accumulatedWidth: 0 };

  // Find the best break point
  for (const i of Array.from({ length: text.length }, (_, index) => index)) {
    const char = text[i];
    // Use transformed character for width calculation
    const transformedChar = transformedText[i];
    const charWidth =
      measureTextWidth({
        text: transformedChar,
        fontSizePt: span.fontSize,
        letterSpacingPx: 0,
        fontFamily: span.fontFamily,
        fontWeight: span.fontWeight,
      }) +
      (i > 0 ? span.letterSpacing : 0);

    if (state.accumulatedWidth + charWidth > availableWidth && state.breakIndex >= 0) {
      // We've exceeded the width, break at the last good position
      break;
    }

    state.accumulatedWidth += charWidth;

    // Check for break opportunities (use original char for break detection)
    const charCode = char.charCodeAt(0);
    if (isBreakChar(char)) {
      // Break after space/hyphen
      state.breakIndex = i + 1;
    } else if (isCjkCodePoint(charCode)) {
      // CJK can break after any character
      state.breakIndex = i + 1;
    } else if (i > 0) {
      const prevCharCode = text.charCodeAt(i - 1);
      if (isCjkCodePoint(prevCharCode)) {
        // Can break before character after CJK
        state.breakIndex = i;
      }
    }
  }

  // If no break point found and we're at the start of a line, force break
  if (state.breakIndex <= 0) {
    if (currentLineWidth === 0) {
      // Force break - find where we exceed the width
      state.accumulatedWidth = 0;
      for (const i of Array.from({ length: text.length }, (_, index) => index)) {
        // Use transformed character for width calculation
        const transformedChar = transformedText[i];
        const charWidth =
          measureTextWidth({
            text: transformedChar,
            fontSizePt: span.fontSize,
            letterSpacingPx: 0,
            fontFamily: span.fontFamily,
            fontWeight: span.fontWeight,
          }) +
          (i > 0 ? span.letterSpacing : 0);
        if (state.accumulatedWidth + charWidth > availableWidth && i > 0) {
          state.breakIndex = i;
          break;
        }
        state.accumulatedWidth += charWidth;
      }
      if (state.breakIndex <= 0) {
        state.breakIndex = Math.max(1, text.length);
      }
    } else {
      // Can't fit anything, return the whole span as overflow
      return { fits: null, overflow: span };
    }
  }

  // Split the span
  const fitsText = text.slice(0, state.breakIndex);
  const overflowText = text.slice(state.breakIndex);

  // Apply text transform before measuring (matches rendering)
  const transformedFitsText = applyTextTransform(fitsText, span.textTransform);
  const fitsSpan: T = {
    ...span,
    text: fitsText,
    width: measureTextWidth({
      text: transformedFitsText,
      fontSizePt: span.fontSize,
      letterSpacingPx: span.letterSpacing,
      fontFamily: span.fontFamily,
      fontWeight: span.fontWeight,
    }),
  };

  return { fits: fitsSpan, overflow: createOverflowSpan(span, overflowText) };
}

// =============================================================================
// Line Breaking
// =============================================================================

/**
 * Break spans into lines with word wrapping.
 *
 * @param options - Options for line breaking
 * @param options.spans - Array of measured spans to break
 * @param options.firstLineWidth - Maximum width for the first line (in pixels)
 * @param options.nextLineWidth - Maximum width for subsequent lines (in pixels)
 * @param options.wrapMode - Text wrapping mode ("wrap" or "none")
 * @returns Line break result with lines, heights (in points), and page break flags
 */
export function breakIntoLines<T extends BreakableSpan>({
  spans,
  firstLineWidth,
  nextLineWidth,
  wrapMode,
}: {
  readonly spans: readonly T[];
  readonly firstLineWidth: number;
  readonly nextLineWidth: number;
  readonly wrapMode: TextWrapping | "wrap";
}): LineBreakResult<T> {
  const lines: T[][] = [];
  const lineHeights: number[] = [];
  const pageBreaksAfter: boolean[] = [];

  if (spans.length === 0) {
    return { lines: [[] as T[]], lineHeights: [0], pageBreaksAfter: [false] };
  }

  type State = {
    currentLine: T[];
    currentLineWidth: number;
    currentLineHeight: number;
    currentMaxWidth: number;
  };

  const state: State = {
    currentLine: [],
    currentLineWidth: 0,
    currentLineHeight: 0,
    currentMaxWidth: firstLineWidth,
  };

  const resetLineState = () => {
    state.currentLine = [];
    state.currentLineWidth = 0;
    state.currentLineHeight = 0;
    state.currentMaxWidth = nextLineWidth;
  };

  const pushLine = (height: number, pageBreak: boolean = false) => {
    lines.push(state.currentLine);
    lineHeights.push(height);
    pageBreaksAfter.push(pageBreak);
    resetLineState();
  };

  for (const spanItem of spans) {
    const pending: T[] = [spanItem];

    // Handle explicit breaks (page, column, or line)
    if (spanItem.breakType !== "none") {
      const isPageBreak = spanItem.breakType === "page";
      pushLine(state.currentLineHeight, isPageBreak);
      continue;
    }

    if (wrapMode === "none") {
      state.currentLine.push(spanItem);
      state.currentLineWidth += spanItem.width;
      state.currentLineHeight = Math.max(state.currentLineHeight, spanItem.fontSize);
      continue;
    }

    while (pending.length > 0) {
      const span = pending.shift();
      if (span === undefined) {
        continue;
      }
      const { fits, overflow } = breakSpanAtWidth(span, state.currentMaxWidth, state.currentLineWidth);

      if (fits !== null) {
        state.currentLine.push(fits);
        state.currentLineWidth += fits.width;
        state.currentLineHeight = Math.max(state.currentLineHeight, fits.fontSize);
      }

      if (overflow !== null) {
        const height = state.currentLineHeight !== 0 ? state.currentLineHeight : overflow.fontSize;
        pushLine(height);
        pending.unshift(overflow);
      }
    }
  }

  // Don't forget the last line
  if (state.currentLine.length > 0 || lines.length === 0) {
    lines.push(state.currentLine);
    const fallbackFontSize = spans[0]?.fontSize ?? DEFAULT_FONT_SIZE_PT;
    lineHeights.push(state.currentLineHeight !== 0 ? state.currentLineHeight : fallbackFontSize);
    pageBreaksAfter.push(false); // Last line doesn't have a page break after it
  }

  return { lines, lineHeights, pageBreaksAfter };
}

// =============================================================================
// Line Utilities
// =============================================================================

/**
 * Calculate the total width of a line (in pixels).
 */
export function getLineWidth<T extends BreakableSpan>(spans: readonly T[]): number {
  return spans.reduce((sum, span) => sum + span.width, 0);
}

/**
 * Get the maximum font size in a line (in points).
 */
export function getLineMaxFontSize<T extends BreakableSpan>(spans: readonly T[]): number {
  if (spans.length === 0) {
    return DEFAULT_FONT_SIZE_PT;
  }
  return Math.max(...spans.map((s) => s.fontSize));
}

/**
 * Get font info for the span with the maximum font size.
 * Used for calculating baseline position with ascender ratio.
 */
export function getLineMaxFontInfo<T extends BreakableSpan>(spans: readonly T[]): LineFontInfo {
  if (spans.length === 0) {
    return { fontSize: DEFAULT_FONT_SIZE_PT, fontFamily: "sans-serif" };
  }

  const maxSpan = spans.reduce((current, span) => {
    if (span.fontSize > current.fontSize) {
      return span;
    }
    return current;
  }, spans[0]);

  return {
    fontSize: maxSpan.fontSize,
    fontFamily: maxSpan.fontFamily,
  };
}

/**
 * Get the total text length of a line.
 */
export function getLineTextLength<T extends BreakableSpan>(spans: readonly T[]): number {
  return spans.reduce((sum, span) => sum + span.text.length, 0);
}
