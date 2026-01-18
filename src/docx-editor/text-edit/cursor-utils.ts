/**
 * @file Cursor position calculation utilities for DOCX editor
 *
 * Maps textarea cursor position to visual coordinates on the SVG text.
 * Uses PagedLayoutResult from the layout engine to compute visual positions.
 *
 * Based on PPTX text-geometry.ts implementation for accurate text measurement.
 */

import type { DocxParagraph } from "../../docx/domain/paragraph";
import { px } from "../../ooxml/domain/units";
import type {
  PagedLayoutResult,
  LayoutLine,
  ContinuousCursorPosition,
  SelectionRect,
  CursorCoordinates,
} from "../../office-text-layout/types";
import {
  getLineTextLength,
  getLineMaxFontInfo,
  PT_TO_PX,
  measureSpanTextWidth,
  getCharIndexAtOffset,
} from "../../office-text-layout";
import { editorLayoutTokens } from "../../office-editor-components/design-tokens";
import { getAscenderRatio } from "../../text/font-metrics";
import { getParagraphPlainText } from "../../office-text-layout/adapters/docx-adapter";

// =============================================================================
// Text Position Mapping
// =============================================================================

/**
 * Convert flat character offset to paragraph-relative position.
 */
export function offsetToCursorPosition(
  paragraphs: readonly DocxParagraph[],
  offset: number,
): ContinuousCursorPosition {
  type AccumulatorState = {
    readonly remaining: number;
    readonly found: ContinuousCursorPosition | undefined;
  };

  const result = paragraphs.reduce<AccumulatorState>(
    (acc, para, pIdx) => {
      if (acc.found !== undefined) {
        return acc;
      }

      const paraText = getParagraphPlainText(para);
      const paraLength = paraText.length;

      if (acc.remaining <= paraLength) {
        return { remaining: 0, found: { paragraphIndex: pIdx, charOffset: acc.remaining } };
      }

      // +1 for newline between paragraphs
      return { remaining: acc.remaining - paraLength - 1, found: undefined };
    },
    { remaining: offset, found: undefined },
  );

  if (result.found !== undefined) {
    return result.found;
  }

  // End of text
  const lastParaIdx = paragraphs.length - 1;
  const lastPara = paragraphs[lastParaIdx];
  return {
    paragraphIndex: lastParaIdx,
    charOffset: lastPara !== undefined ? getParagraphPlainText(lastPara).length : 0,
  };
}

/**
 * Convert paragraph-relative position to flat character offset.
 */
export function cursorPositionToOffset(
  paragraphs: readonly DocxParagraph[],
  position: ContinuousCursorPosition,
): number {
  const paragraphsBeforeCursor = paragraphs.slice(0, Math.min(position.paragraphIndex, paragraphs.length));
  const offsetBeforeParagraph = paragraphsBeforeCursor.reduce(
    (acc, para) => acc + getParagraphPlainText(para).length + 1, // +1 for newline
    0,
  );
  return offsetBeforeParagraph + position.charOffset;
}

// =============================================================================
// Visual Coordinate Mapping
// =============================================================================

/**
 * Get visual bounds for text at a position.
 */
function getTextVisualBounds(
  baselineY: number,
  fontSizePt: number,
  fontFamily?: string,
): { topY: number; height: number } {
  const fontSizePx = fontSizePt * PT_TO_PX;
  const ascenderHeight = fontSizePx * getAscenderRatio(fontFamily);

  return {
    topY: baselineY - ascenderHeight,
    height: fontSizePx,
  };
}

/**
 * Get X position at a character offset within a line.
 * Uses font-aware measurement for accurate cursor positioning.
 */
function getXPositionInLine(line: LayoutLine, charOffset: number): number {
  type AccumulatorState = {
    readonly x: number;
    readonly remaining: number;
    readonly found: number | undefined;
  };

  const result = line.spans.reduce<AccumulatorState>(
    (acc, span) => {
      if (acc.found !== undefined) {
        return acc;
      }

      if (acc.remaining <= span.text.length) {
        // Use accurate text measurement for the first N characters
        const partialWidth = measureSpanTextWidth(span, acc.remaining);
        return { x: acc.x, remaining: 0, found: acc.x + (partialWidth as number) };
      }

      return {
        x: acc.x + (span.width as number) + (span.dx as number),
        remaining: acc.remaining - span.text.length,
        found: undefined,
      };
    },
    { x: line.x as number, remaining: charOffset, found: undefined },
  );

  return result.found ?? result.x;
}

/**
 * Get character offset within a line from X coordinate.
 * Uses font-aware measurement for accurate click-to-cursor mapping.
 */
function getCharOffsetInLine(line: LayoutLine, targetX: number): number {
  if (line.spans.length === 0) {
    return 0;
  }

  const lineStartX = line.x as number;
  if (targetX <= lineStartX) {
    return 0;
  }

  type AccumulatorState = {
    readonly currentX: number;
    readonly charOffset: number;
    readonly found: number | undefined;
  };

  const result = line.spans.reduce<AccumulatorState>(
    (acc, span) => {
      if (acc.found !== undefined) {
        return acc;
      }

      const spanEnd = acc.currentX + (span.width as number);
      if (targetX <= spanEnd) {
        // Within this span - find character using accurate measurement
        const relativeX = targetX - acc.currentX;
        const charIndex = getCharIndexAtOffset(span, relativeX);
        return { ...acc, found: acc.charOffset + charIndex };
      }

      return {
        currentX: spanEnd + (span.dx as number),
        charOffset: acc.charOffset + span.text.length,
        found: undefined,
      };
    },
    { currentX: lineStartX, charOffset: 0, found: undefined },
  );

  return result.found ?? result.charOffset;
}

/**
 * Build a flat list of paragraphs from paged layout with Y offsets.
 */
type FlatParagraphInfo = {
  readonly paragraph: PagedLayoutResult["pages"][number]["paragraphs"][number];
  readonly pageIndex: number;
  readonly pageYOffset: number;
};

function buildFlatParagraphList(pagedLayout: PagedLayoutResult): FlatParagraphInfo[] {
  type AccumulatorState = {
    readonly result: FlatParagraphInfo[];
    readonly pageYOffset: number;
  };

  const pageGap = editorLayoutTokens.pageGap;

  const final = pagedLayout.pages.reduce<AccumulatorState>(
    (acc, page, pageIndex) => {
      const paragraphInfos = page.paragraphs.map((paragraph) => ({
        paragraph,
        pageIndex,
        pageYOffset: acc.pageYOffset,
      }));

      return {
        result: [...acc.result, ...paragraphInfos],
        pageYOffset: acc.pageYOffset + (page.height as number) + pageGap,
      };
    },
    { result: [], pageYOffset: 0 },
  );

  return final.result;
}

/**
 * Get total text length of a layout paragraph.
 */
function getLayoutParagraphTextLength(
  paragraph: PagedLayoutResult["pages"][number]["paragraphs"][number],
): number {
  return paragraph.lines.reduce((sum, line) => sum + getLineTextLength(line.spans), 0);
}

/**
 * Map cursor position to visual coordinates using PagedLayoutResult.
 * Returns coordinates in the combined SVG space (with page Y offsets).
 */
export function cursorPositionToCoordinates(
  pagedLayout: PagedLayoutResult,
  position: ContinuousCursorPosition,
): CursorCoordinates | undefined {
  const flatParagraphs = buildFlatParagraphList(pagedLayout);
  const { paragraphIndex, charOffset } = position;

  if (paragraphIndex >= flatParagraphs.length) {
    return undefined;
  }

  const { paragraph, pageYOffset } = flatParagraphs[paragraphIndex];
  if (paragraph.lines.length === 0) {
    return undefined;
  }

  // Find the line containing the cursor
  return findCursorCoordinatesInParagraph(paragraph, charOffset, pageYOffset);
}

/**
 * Find cursor coordinates within a paragraph.
 */
function findCursorCoordinatesInParagraph(
  paragraph: PagedLayoutResult["pages"][number]["paragraphs"][number],
  charOffset: number,
  pageYOffset: number,
): CursorCoordinates {
  type AccumulatorState = {
    readonly remainingOffset: number;
    readonly found: CursorCoordinates | undefined;
  };

  const result = paragraph.lines.reduce<AccumulatorState>(
    (acc, line) => {
      if (acc.found !== undefined) {
        return acc;
      }

      const lineLength = getLineTextLength(line.spans);

      if (acc.remainingOffset <= lineLength) {
        return { remainingOffset: 0, found: lineToCoordinates(line, acc.remainingOffset, pageYOffset) };
      }

      return { remainingOffset: acc.remainingOffset - lineLength, found: undefined };
    },
    { remainingOffset: charOffset, found: undefined },
  );

  if (result.found !== undefined) {
    return result.found;
  }

  // Past end of paragraph - use end of last line
  const lastLine = paragraph.lines[paragraph.lines.length - 1];
  return lineToCoordinates(lastLine, getLineTextLength(lastLine.spans), pageYOffset);
}

/**
 * Convert a line position to cursor coordinates.
 * Uses the maximum font in the line for vertical positioning (compound formatting support).
 */
function lineToCoordinates(line: LayoutLine, offsetInLine: number, pageYOffset: number): CursorCoordinates {
  const x = getXPositionInLine(line, offsetInLine);
  const { fontSize, fontFamily } = getLineMaxFontInfo(line.spans);
  const lineY = (line.y as number) + pageYOffset;
  const bounds = getTextVisualBounds(lineY, fontSize as number, fontFamily);

  return {
    x: px(x),
    y: px(bounds.topY),
    height: px(bounds.height),
  };
}

/**
 * Line candidate for closest line search.
 */
type LineCandidate = {
  readonly paragraphIndex: number;
  readonly lineIndex: number;
  readonly distance: number;
};

/**
 * Calculate distance from Y coordinate to a line.
 * Uses the maximum font in the line for accurate bounds calculation.
 */
function calculateLineDistance(
  y: number,
  line: LayoutLine,
  pageYOffset: number,
): number {
  const { fontSize, fontFamily } = getLineMaxFontInfo(line.spans);
  const lineY = (line.y as number) + pageYOffset;
  const bounds = getTextVisualBounds(lineY, fontSize as number, fontFamily);
  const lineTop = bounds.topY;
  const lineBottom = bounds.topY + bounds.height;

  if (y < lineTop) {
    return lineTop - y;
  }
  if (y > lineBottom) {
    return y - lineBottom;
  }
  return 0;
}

/**
 * Find the closest line to a Y coordinate.
 */
function findClosestLine(
  flatParagraphs: readonly FlatParagraphInfo[],
  y: number,
): LineCandidate {
  const allCandidates = flatParagraphs.flatMap((info, pIdx) =>
    info.paragraph.lines.map((line, lIdx) => ({
      paragraphIndex: pIdx,
      lineIndex: lIdx,
      distance: calculateLineDistance(y, line, info.pageYOffset),
    })),
  );

  if (allCandidates.length === 0) {
    return { paragraphIndex: 0, lineIndex: 0, distance: Number.POSITIVE_INFINITY };
  }

  return allCandidates.reduce((best, candidate) =>
    candidate.distance < best.distance ? candidate : best,
  );
}

/**
 * Map visual coordinates to a cursor position.
 * Searches all pages to find the closest line.
 * Expects coordinates in the combined SVG space (with page Y offsets).
 */
export function coordinatesToCursorPosition(
  pagedLayout: PagedLayoutResult,
  x: number,
  y: number,
): ContinuousCursorPosition {
  const flatParagraphs = buildFlatParagraphList(pagedLayout);

  if (flatParagraphs.length === 0) {
    return { paragraphIndex: 0, charOffset: 0 };
  }

  const { paragraphIndex, lineIndex } = findClosestLine(flatParagraphs, y);

  const { paragraph } = flatParagraphs[paragraphIndex];
  if (paragraph.lines.length === 0) {
    return { paragraphIndex, charOffset: 0 };
  }

  const targetLine = paragraph.lines[lineIndex];
  const lineOffset = getCharOffsetInLine(targetLine, x);
  const offsetBeforeLine = paragraph.lines
    .slice(0, lineIndex)
    .reduce((sum, line) => sum + getLineTextLength(line.spans), 0);

  return {
    paragraphIndex,
    charOffset: offsetBeforeLine + lineOffset,
  };
}

// =============================================================================
// Selection Range Coordinates
// =============================================================================

/**
 * Create a selection rect for a line segment.
 * Uses the maximum font in the line for consistent selection height.
 */
function createLineSelectionRect(
  line: LayoutLine,
  selStart: number,
  selEnd: number,
  pageYOffset: number,
): SelectionRect {
  const startX = getXPositionInLine(line, selStart);
  const endX = getXPositionInLine(line, selEnd);
  const { fontSize, fontFamily } = getLineMaxFontInfo(line.spans);
  const lineY = (line.y as number) + pageYOffset;
  const bounds = getTextVisualBounds(lineY, fontSize as number, fontFamily);

  return {
    x: px(startX),
    y: px(bounds.topY),
    width: px(endX - startX),
    height: px(bounds.height),
  };
}

/**
 * Get selection rects for a single paragraph.
 */
function getParagraphSelectionRects(
  paragraph: PagedLayoutResult["pages"][number]["paragraphs"][number],
  pageYOffset: number,
  paraStartOffset: number,
  paraEndOffset: number,
): readonly SelectionRect[] {
  type LineAccumulator = {
    readonly lineStartOffset: number;
    readonly rects: readonly SelectionRect[];
  };

  const result = paragraph.lines.reduce<LineAccumulator>(
    (acc, line) => {
      const lineLength = getLineTextLength(line.spans);
      const lineEndOffset = acc.lineStartOffset + lineLength;

      // Check if selection intersects this line
      if (paraStartOffset < lineEndOffset && paraEndOffset > acc.lineStartOffset) {
        const selStart = Math.max(paraStartOffset - acc.lineStartOffset, 0);
        const selEnd = Math.min(paraEndOffset - acc.lineStartOffset, lineLength);
        const rect = createLineSelectionRect(line, selStart, selEnd, pageYOffset);
        return {
          lineStartOffset: lineEndOffset,
          rects: [...acc.rects, rect],
        };
      }

      return { lineStartOffset: lineEndOffset, rects: acc.rects };
    },
    { lineStartOffset: 0, rects: [] },
  );

  return result.rects;
}

/**
 * Get selection highlight rectangles for a text selection.
 * Returns rectangles in the combined SVG space (with page Y offsets).
 */
export function selectionToRects(
  pagedLayout: PagedLayoutResult,
  startPos: ContinuousCursorPosition,
  endPos: ContinuousCursorPosition,
): readonly SelectionRect[] {
  const flatParagraphs = buildFlatParagraphList(pagedLayout);
  const [normalizedStart, normalizedEnd] = normalizeSelection(startPos, endPos);

  // Generate paragraph indices in range
  const paragraphIndices = Array.from(
    { length: normalizedEnd.paragraphIndex - normalizedStart.paragraphIndex + 1 },
    (_, i) => normalizedStart.paragraphIndex + i,
  ).filter((pIdx) => pIdx < flatParagraphs.length);

  return paragraphIndices.flatMap((pIdx) => {
    const { paragraph, pageYOffset } = flatParagraphs[pIdx];
    const paraLength = getLayoutParagraphTextLength(paragraph);

    const paraStartOffset = pIdx === normalizedStart.paragraphIndex ? normalizedStart.charOffset : 0;
    const paraEndOffset = pIdx === normalizedEnd.paragraphIndex ? normalizedEnd.charOffset : paraLength;

    return getParagraphSelectionRects(paragraph, pageYOffset, paraStartOffset, paraEndOffset);
  });
}

/**
 * Check if position a is before position b.
 */
function isBefore(a: ContinuousCursorPosition, b: ContinuousCursorPosition): boolean {
  if (a.paragraphIndex < b.paragraphIndex) {
    return true;
  }
  if (a.paragraphIndex > b.paragraphIndex) {
    return false;
  }
  return a.charOffset < b.charOffset;
}

/**
 * Normalize selection so start is before end.
 */
function normalizeSelection(
  startPos: ContinuousCursorPosition,
  endPos: ContinuousCursorPosition,
): readonly [ContinuousCursorPosition, ContinuousCursorPosition] {
  if (isBefore(startPos, endPos)) {
    return [startPos, endPos];
  }
  return [endPos, startPos];
}
