/**
 * @file Line breaking / word wrap
 * Breaks text into lines based on available width
 */

import type { MeasuredSpan, TextBoxConfig } from "./types";
import type { Pixels, Points } from "../../domain/types";
import { px, pt } from "../../domain/types";
import { estimateTextWidth } from "./measurer";
import { isCjkCodePoint } from "../../../text/cjk";
import { DEFAULT_FONT_SIZE_PT } from "../../core/ecma376/defaults";

// =============================================================================
// Line Break Result
// =============================================================================

/**
 * Result of breaking spans into lines
 */
export type LineBreakResult = {
  /** Lines of measured spans */
  readonly lines: readonly (readonly MeasuredSpan[])[];
  /** Height of each line in points */
  readonly lineHeights: readonly Points[];
};

// =============================================================================
// Break Detection
// =============================================================================

/**
 * Check if character is a word break opportunity (space, tab, hyphen)
 */
function isBreakChar(char: string): boolean {
  return char === " " || char === "\t" || char === "-";
}

// =============================================================================
// Span Breaking
// =============================================================================

/**
 * Create an overflow span if there's remaining text
 */
function createOverflowSpan(span: MeasuredSpan, overflowText: string): MeasuredSpan | null {
  if (overflowText.length === 0) {
    return null;
  }
  return {
    ...span,
    text: overflowText,
    width: estimateTextWidth(overflowText, span.fontSize, span.letterSpacing, span.fontFamily),
  };
}

/**
 * Break a single span into multiple spans at word boundaries
 */
function breakSpanAtWidth(
  span: MeasuredSpan,
  maxWidth: Pixels,
  currentLineWidth: Pixels,
): { fits: MeasuredSpan | null; overflow: MeasuredSpan | null } {
  const availableWidth = (maxWidth as number) - (currentLineWidth as number);

  // If the whole span fits, return it
  if ((span.width as number) <= availableWidth) {
    return { fits: span, overflow: null };
  }

  const text = span.text;
  const state = { breakIndex: -1, accumulatedWidth: 0 };

  // Find the best break point
  for (const i of Array.from({ length: text.length }, (_, index) => index)) {
    const char = text[i];
    const charWidth = (estimateTextWidth(char, span.fontSize, px(0), span.fontFamily) as number) +
      (i > 0 ? (span.letterSpacing as number) : 0);

    if (state.accumulatedWidth + charWidth > availableWidth && state.breakIndex >= 0) {
      // We've exceeded the width, break at the last good position
      break;
    }

    state.accumulatedWidth += charWidth;

    // Check for break opportunities
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
    if ((currentLineWidth as number) === 0) {
      // Force break - find where we exceed the width
      state.accumulatedWidth = 0;
      for (const i of Array.from({ length: text.length }, (_, index) => index)) {
        const charWidth = (estimateTextWidth(text[i], span.fontSize, px(0), span.fontFamily) as number) +
          (i > 0 ? (span.letterSpacing as number) : 0);
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

  const fitsSpan: MeasuredSpan = {
    ...span,
    text: fitsText,
    width: estimateTextWidth(fitsText, span.fontSize, span.letterSpacing, span.fontFamily),
  };

  return { fits: fitsSpan, overflow: createOverflowSpan(span, overflowText) };
}

// =============================================================================
// Line Breaking
// =============================================================================

/**
 * Break spans into lines with word wrapping
 */
export function breakIntoLines(
  spans: readonly MeasuredSpan[],
  firstLineWidth: Pixels,
  nextLineWidth: Pixels,
  wrapMode: TextBoxConfig["wrapMode"],
): LineBreakResult {
  const lines: MeasuredSpan[][] = [];
  const lineHeights: Points[] = [];

  if (spans.length === 0) {
    return { lines: [[]], lineHeights: [pt(0)] };
  }

  type State = {
    currentLine: MeasuredSpan[];
    currentLineWidth: number;
    currentLineHeight: number;
    currentMaxWidth: Pixels;
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

  const pushLine = (height: number) => {
    lines.push(state.currentLine);
    lineHeights.push(pt(height));
    resetLineState();
  };

  for (const spanItem of spans) {
    const pending: MeasuredSpan[] = [spanItem];

    // Handle explicit line breaks
    if (spanItem.isBreak) {
      pushLine(state.currentLineHeight);
      continue;
    }

    if (wrapMode === "none") {
      state.currentLine.push(spanItem);
      state.currentLineWidth += spanItem.width as number;
      state.currentLineHeight = Math.max(state.currentLineHeight, spanItem.fontSize as number);
      continue;
    }

    while (pending.length > 0) {
      const span = pending.shift();
      if (span === undefined) {
        continue;
      }
      const { fits, overflow } = breakSpanAtWidth(span, state.currentMaxWidth, px(state.currentLineWidth));

      if (fits !== null) {
        state.currentLine.push(fits);
        state.currentLineWidth += fits.width as number;
        state.currentLineHeight = Math.max(state.currentLineHeight, fits.fontSize as number);
      }

      if (overflow !== null) {
        const height = state.currentLineHeight !== 0 ? state.currentLineHeight : overflow.fontSize as number;
        pushLine(height);
        pending.unshift(overflow);
      }
    }
  }

  // Don't forget the last line
  if (state.currentLine.length > 0 || lines.length === 0) {
    lines.push(state.currentLine);
    const fallbackFontSize = (spans[0]?.fontSize ?? pt(DEFAULT_FONT_SIZE_PT)) as number;
    lineHeights.push(pt(state.currentLineHeight !== 0 ? state.currentLineHeight : fallbackFontSize));
  }

  return { lines, lineHeights };
}

// =============================================================================
// Line Utilities
// =============================================================================

/**
 * Calculate the total width of a line
 */
export function getLineWidth(spans: readonly MeasuredSpan[]): Pixels {
  const width = spans.reduce((sum, span) => sum + (span.width as number), 0);
  return px(width);
}

/**
 * Get the maximum font size in a line
 */
export function getLineMaxFontSize(spans: readonly MeasuredSpan[]): Points {
  if (spans.length === 0) {
    return pt(DEFAULT_FONT_SIZE_PT);
  }
  const max = Math.max(...spans.map((s) => s.fontSize as number));
  return pt(max);
}

/**
 * Line font info for baseline calculation
 */
export type LineFontInfo = {
  readonly fontSize: Points;
  readonly fontFamily: string;
};

/**
 * Get font info for the span with the maximum font size.
 * Used for calculating baseline position with ascender ratio.
 */
export function getLineMaxFontInfo(spans: readonly MeasuredSpan[]): LineFontInfo {
  if (spans.length === 0) {
    return { fontSize: pt(DEFAULT_FONT_SIZE_PT), fontFamily: "sans-serif" };
  }

  const maxSpan = spans.reduce((current, span) => {
    if ((span.fontSize as number) > (current.fontSize as number)) {
      return span;
    }
    return current;
  }, spans[0]);

  return {
    fontSize: maxSpan.fontSize,
    fontFamily: maxSpan.fontFamily,
  };
}
