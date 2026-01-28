/**
 * @file Line breaking / word wrap for OOXML documents
 *
 * Wraps @oxen/glyph line breaking functions with OOXML-specific types (Pixels, Points).
 * Provides type-safe line breaking for PPTX and DOCX text layout.
 *
 * @see @oxen/glyph/breaking - Core line breaking functions (plain numbers)
 */

import type { MeasuredSpan, TextWrapping } from "../types";
import type { Pixels, Points } from "@oxen-office/ooxml/domain/units";
import { px, pt } from "@oxen-office/ooxml/domain/units";
import {
  breakIntoLines as glyphBreakIntoLines,
  getLineWidth as glyphGetLineWidth,
  getLineMaxFontSize as glyphGetLineMaxFontSize,
  getLineMaxFontInfo as glyphGetLineMaxFontInfo,
  getLineTextLength as glyphGetLineTextLength,
} from "@oxen/glyph";
import type { BreakableSpan as GlyphBreakableSpan } from "@oxen/glyph";
import { SPEC_DEFAULT_FONT_SIZE_PT } from "@oxen-office/docx/domain/ecma376-defaults";

// =============================================================================
// Constants
// =============================================================================

/**
 * Default font size in points when no span is available.
 * Uses ECMA-376 specification default (10pt).
 *
 * @deprecated Use SPEC_DEFAULT_FONT_SIZE_PT from ecma376-defaults.ts directly.
 *             This export is kept for backwards compatibility.
 */
export const DEFAULT_FONT_SIZE_PT = SPEC_DEFAULT_FONT_SIZE_PT;

// =============================================================================
// Type Conversion
// =============================================================================

/**
 * Convert MeasuredSpan to plain number span for @oxen/glyph.
 */
function toGlyphSpan(span: MeasuredSpan): GlyphBreakableSpan {
  return {
    text: span.text,
    width: span.width as number,
    fontSize: span.fontSize as number,
    fontFamily: span.fontFamily,
    fontWeight: span.fontWeight,
    fontStyle: span.fontStyle,
    letterSpacing: span.letterSpacing as number,
    breakType: span.breakType,
    textTransform: span.textTransform,
  };
}

// =============================================================================
// Line Break Result
// =============================================================================

/**
 * Result of breaking spans into lines.
 */
export type LineBreakResult = {
  /** Lines of measured spans */
  readonly lines: readonly (readonly MeasuredSpan[])[];
  /** Height of each line in points */
  readonly lineHeights: readonly Points[];
  /**
   * Page break flags for each line.
   * True if the line ends with a page break (w:br type="page").
   *
   * @see ECMA-376-1:2016 Section 17.3.3.1 (br)
   */
  readonly pageBreaksAfter: readonly boolean[];
};

// =============================================================================
// Line Breaking
// =============================================================================

/**
 * Break spans into lines with word wrapping.
 */
export function breakIntoLines(
  spans: readonly MeasuredSpan[],
  firstLineWidth: Pixels,
  nextLineWidth: Pixels,
  wrapMode: TextWrapping | "wrap",
): LineBreakResult {
  if (spans.length === 0) {
    return { lines: [[]], lineHeights: [pt(0)], pageBreaksAfter: [false] };
  }

  // Convert to plain number spans
  const glyphSpans = spans.map(toGlyphSpan);

  // Create a mapping to preserve original span properties
  const spanMap = new Map<string, MeasuredSpan>();
  for (const span of spans) {
    // Use text + fontSize + fontFamily as a key (may have duplicates, but we handle that)
    const key = `${span.text}|${span.fontSize}|${span.fontFamily}|${span.fontWeight}`;
    spanMap.set(key, span);
  }

  // Call the generic line breaker
  const result = glyphBreakIntoLines(
    glyphSpans,
    firstLineWidth as number,
    nextLineWidth as number,
    wrapMode,
  );

  // Convert back to MeasuredSpan with proper types
  const lines: MeasuredSpan[][] = result.lines.map((line) =>
    line.map((glyphSpan) => {
      // Find the original span to preserve all properties
      const key = `${glyphSpan.text}|${glyphSpan.fontSize}|${glyphSpan.fontFamily}|${glyphSpan.fontWeight}`;
      const originalSpan = spanMap.get(key);

      if (originalSpan !== undefined && originalSpan.text === glyphSpan.text) {
        // Exact match, preserve all properties
        return {
          ...originalSpan,
          width: px(glyphSpan.width),
        };
      }

      // This is a split span, find parent by matching prefix
      for (const span of spans) {
        if (
          span.text.startsWith(glyphSpan.text) ||
          span.text.endsWith(glyphSpan.text) ||
          span.text.includes(glyphSpan.text)
        ) {
          return {
            ...span,
            text: glyphSpan.text,
            width: px(glyphSpan.width),
          };
        }
      }

      // Fallback: create a minimal span (shouldn't happen in practice)
      return {
        text: glyphSpan.text,
        fontSize: pt(glyphSpan.fontSize),
        fontFamily: glyphSpan.fontFamily,
        fontFamilyEastAsian: undefined,
        fontFamilyComplexScript: undefined,
        fontWeight: glyphSpan.fontWeight,
        fontStyle: glyphSpan.fontStyle,
        textDecoration: undefined,
        color: "#000000",
        verticalAlign: "baseline" as const,
        letterSpacing: px(glyphSpan.letterSpacing),
        breakType: glyphSpan.breakType,
        direction: "ltr" as const,
        highlightColor: undefined,
        textTransform: glyphSpan.textTransform,
        linkId: undefined,
        linkTooltip: undefined,
        textOutline: undefined,
        textFill: undefined,
        kerning: undefined,
        width: px(glyphSpan.width),
      };
    }),
  );

  return {
    lines,
    lineHeights: result.lineHeights.map((h) => pt(h)),
    pageBreaksAfter: result.pageBreaksAfter,
  };
}

// =============================================================================
// Line Utilities
// =============================================================================

/**
 * Calculate the total width of a line.
 */
export function getLineWidth(spans: readonly MeasuredSpan[]): Pixels {
  const glyphSpans = spans.map(toGlyphSpan);
  return px(glyphGetLineWidth(glyphSpans));
}

/**
 * Get the maximum font size in a line.
 */
export function getLineMaxFontSize(spans: readonly MeasuredSpan[]): Points {
  const glyphSpans = spans.map(toGlyphSpan);
  return pt(glyphGetLineMaxFontSize(glyphSpans));
}

/**
 * Line font info for baseline calculation.
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
  const glyphSpans = spans.map(toGlyphSpan);
  const result = glyphGetLineMaxFontInfo(glyphSpans);
  return {
    fontSize: pt(result.fontSize),
    fontFamily: result.fontFamily,
  };
}

/**
 * Get the total text length of a line.
 */
export function getLineTextLength(spans: readonly MeasuredSpan[]): number {
  const glyphSpans = spans.map(toGlyphSpan);
  return glyphGetLineTextLength(glyphSpans);
}
