/**
 * @file Cursor position calculation utilities for DOCX editor
 *
 * Maps textarea cursor position to visual coordinates on the SVG text.
 * Uses PagedLayoutResult from the layout engine to compute visual positions.
 *
 * Based on PPTX text-geometry.ts implementation for accurate text measurement.
 */

import type { DocxParagraph } from "@oxen-office/docx/domain/paragraph";
import { px } from "@oxen-office/ooxml/domain/units";
import type {
  PagedLayoutResult,
  LayoutLine,
  ContinuousCursorPosition,
  SelectionRect,
  CursorCoordinates,
  WritingMode,
} from "@oxen-office/text-layout";
import {
  isVertical,
  getLineTextLength,
  getLineMaxFontInfo,
  measureSpanTextWidth,
  getCharIndexAtOffset,
} from "@oxen-office/text-layout";
import { getParagraphPlainText } from "@oxen-office/docx/adapters";
import { editorLayoutTokens } from "@oxen-ui/ui-components/design-tokens";
import { getAscenderRatio, PT_TO_PX } from "@oxen/glyph";

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
 * Uses Canvas-based measurement for accurate cursor positioning.
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
        // Use Canvas-based measurement for accurate positioning
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
 * Get character offset within a line from inline coordinate.
 * Uses Canvas-based measurement for accurate click-to-cursor mapping.
 *
 * @param line - The line to find character position in
 * @param targetInline - Target coordinate in inline direction (X for horizontal, Y for vertical)
 * @param writingMode - Writing mode for coordinate interpretation
 */
function getCharOffsetInLine(line: LayoutLine, targetInline: number, _writingMode: WritingMode = "horizontal-tb"): number {
  if (line.spans.length === 0) {
    return 0;
  }

  // For vertical text, the inline start position is at line.x (which stores the inline origin)
  // For horizontal text, line.x is the X start position
  const lineStartInline = line.x as number;
  if (targetInline <= lineStartInline) {
    return 0;
  }

  type AccumulatorState = {
    readonly currentInline: number;
    readonly charOffset: number;
    readonly found: number | undefined;
  };

  const result = line.spans.reduce<AccumulatorState>(
    (acc, span) => {
      if (acc.found !== undefined) {
        return acc;
      }

      const spanEnd = acc.currentInline + (span.width as number);
      if (targetInline <= spanEnd) {
        // Within this span - find character using Canvas-based measurement
        const relativeOffset = targetInline - acc.currentInline;
        const charIndex = getCharIndexAtOffset(span, relativeOffset);
        return { ...acc, found: acc.charOffset + charIndex };
      }

      return {
        currentInline: spanEnd + (span.dx as number),
        charOffset: acc.charOffset + span.text.length,
        found: undefined,
      };
    },
    { currentInline: lineStartInline, charOffset: 0, found: undefined },
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
 *
 * For horizontal text (horizontal-tb): cursor is a vertical line at x position
 * For vertical text (vertical-rl/lr): cursor is a horizontal line at y position
 *
 * @param pagedLayout - The paged layout result containing pages and writingMode
 * @param position - The cursor position in paragraph/character coordinates
 */
export function cursorPositionToCoordinates(
  pagedLayout: PagedLayoutResult,
  position: ContinuousCursorPosition,
): CursorCoordinates | undefined {
  const flatParagraphs = buildFlatParagraphList(pagedLayout);
  const { paragraphIndex, charOffset } = position;
  const writingMode = pagedLayout.writingMode ?? "horizontal-tb";

  if (paragraphIndex >= flatParagraphs.length) {
    return undefined;
  }

  const { paragraph, pageYOffset } = flatParagraphs[paragraphIndex];
  if (paragraph.lines.length === 0) {
    return undefined;
  }

  // Find the line containing the cursor
  return findCursorCoordinatesInParagraph(paragraph, charOffset, pageYOffset, writingMode);
}

/**
 * Find cursor coordinates within a paragraph.
 *
 * @param paragraph - The paragraph to search within
 * @param charOffset - Character offset within the paragraph
 * @param pageYOffset - Y offset of the page in combined SVG space
 * @param writingMode - Writing mode for coordinate interpretation
 */
function findCursorCoordinatesInParagraph(
  ...args: [
    paragraph: PagedLayoutResult["pages"][number]["paragraphs"][number],
    charOffset: number,
    pageYOffset: number,
    writingMode: WritingMode,
  ]
): CursorCoordinates {
  const [paragraph, charOffset, pageYOffset, writingMode] = args;
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
        return { remainingOffset: 0, found: lineToCoordinates(line, acc.remainingOffset, pageYOffset, writingMode) };
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
  return lineToCoordinates(lastLine, getLineTextLength(lastLine.spans), pageYOffset, writingMode);
}

/**
 * Convert a line position to cursor coordinates.
 * Uses the maximum font in the line for vertical positioning (compound formatting support).
 *
 * For horizontal text: cursor is positioned at (x, y) with height extending downward
 * For vertical text: cursor coordinates are swapped - the "height" becomes width
 *
 * @param line - The line containing the cursor
 * @param offsetInLine - Character offset within the line
 * @param pageYOffset - Y offset of the page in combined SVG space
 * @param writingMode - Writing mode for coordinate interpretation
 */
function lineToCoordinates(
  ...args: [line: LayoutLine, offsetInLine: number, pageYOffset: number, writingMode: WritingMode]
): CursorCoordinates {
  const [line, offsetInLine, pageYOffset, writingMode] = args;
  const { fontSize, fontFamily } = getLineMaxFontInfo(line.spans);
  const fontSizePx = (fontSize as number) * PT_TO_PX;

  if (isVertical(writingMode)) {
    // Vertical text: coordinates already transformed by page-flow
    // line.x = physical column X position
    // line.y = physical inline Y position
    // getXPositionInLine returns absolute position starting from line.x
    // We need the relative inline offset for vertical Y calculation
    const inlineAbsPos = getXPositionInLine(line, offsetInLine);
    const lineX = line.x as number;
    const inlineOffset = inlineAbsPos - lineX; // Convert to relative offset
    const lineY = (line.y as number) + pageYOffset + inlineOffset;

    return {
      x: px(lineX),
      y: px(lineY),
      height: px(fontSizePx), // Column width (for horizontal cursor line)
    };
  }

  // Horizontal text (default)
  const x = getXPositionInLine(line, offsetInLine);
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
 * Calculate distance from block coordinate to a line.
 * Uses the maximum font in the line for accurate bounds calculation.
 *
 * @param blockCoord - Coordinate in block direction (Y for horizontal, X for vertical)
 * @param line - The line to calculate distance to
 * @param pageYOffset - Y offset of the page in combined SVG space
 * @param writingMode - Writing mode for coordinate interpretation
 */
function calculateLineDistance(
  ...args: [blockCoord: number, line: LayoutLine, pageYOffset: number, writingMode: WritingMode]
): number {
  const [blockCoord, line, pageYOffset, writingMode] = args;
  const { fontSize, fontFamily } = getLineMaxFontInfo(line.spans);

  if (isVertical(writingMode)) {
    // Vertical text: block direction is X
    // After page-flow transformation: line.x = physical column X position
    // line.width = column width (fontSizePx after transformation)
    const lineX = line.x as number;
    const columnWidth = line.width as number;
    const lineStart = lineX;
    const lineEnd = lineX + columnWidth;

    if (blockCoord < lineStart) {
      return lineStart - blockCoord;
    }
    if (blockCoord > lineEnd) {
      return blockCoord - lineEnd;
    }
    return 0;
  }

  // Horizontal text: block direction is Y
  const lineY = (line.y as number) + pageYOffset;
  const bounds = getTextVisualBounds(lineY, fontSize as number, fontFamily);
  const lineTop = bounds.topY;
  const lineBottom = bounds.topY + bounds.height;

  if (blockCoord < lineTop) {
    return lineTop - blockCoord;
  }
  if (blockCoord > lineBottom) {
    return blockCoord - lineBottom;
  }
  return 0;
}

/**
 * Find the closest line to a block coordinate.
 *
 * @param flatParagraphs - Flattened list of paragraphs with page offsets
 * @param blockCoord - Coordinate in block direction (Y for horizontal, X for vertical)
 * @param writingMode - Writing mode for coordinate interpretation
 */
function findClosestLine(
  flatParagraphs: readonly FlatParagraphInfo[],
  blockCoord: number,
  writingMode: WritingMode,
): LineCandidate {
  const allCandidates = flatParagraphs.flatMap((info, pIdx) =>
    info.paragraph.lines.map((line, lIdx) => ({
      paragraphIndex: pIdx,
      lineIndex: lIdx,
      distance: calculateLineDistance(blockCoord, line, info.pageYOffset, writingMode),
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
 *
 * For horizontal text: Y is used to find the line, X to find character position
 * For vertical text: X is used to find the line, Y to find character position
 */
export function coordinatesToCursorPosition(
  pagedLayout: PagedLayoutResult,
  x: number,
  y: number,
): ContinuousCursorPosition {
  const flatParagraphs = buildFlatParagraphList(pagedLayout);
  const writingMode = pagedLayout.writingMode ?? "horizontal-tb";

  if (flatParagraphs.length === 0) {
    return { paragraphIndex: 0, charOffset: 0 };
  }

  // For vertical text, swap the meaning of x and y for line finding
  const blockCoord = isVertical(writingMode) ? x : y;
  const inlineCoord = isVertical(writingMode) ? y : x;

  const { paragraphIndex, lineIndex } = findClosestLine(flatParagraphs, blockCoord, writingMode);

  const { paragraph } = flatParagraphs[paragraphIndex];
  if (paragraph.lines.length === 0) {
    return { paragraphIndex, charOffset: 0 };
  }

  const targetLine = paragraph.lines[lineIndex];
  const lineOffset = getCharOffsetInLine(targetLine, inlineCoord, writingMode);
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
 *
 * For vertical mode:
 * - line.x = column X position (physical)
 * - line.y = inline Y position (physical)
 * - Selection rect extends vertically (inline direction)
 */
function createLineSelectionRect(
  ...args: [line: LayoutLine, selStart: number, selEnd: number, pageYOffset: number, writingMode?: WritingMode]
): SelectionRect {
  const [line, selStart, selEnd, pageYOffset, writingMode = "horizontal-tb"] = args;
  const startInline = getXPositionInLine(line, selStart);
  const endInline = getXPositionInLine(line, selEnd);
  const { fontSize, fontFamily } = getLineMaxFontInfo(line.spans);
  const fontSizePx = (fontSize as number) * PT_TO_PX;

  if (isVertical(writingMode)) {
    // Vertical text: selection extends along Y axis (inline direction)
    // line.x is the column X position, line.y is the inline start
    // startInline/endInline are absolute positions starting from line.x
    // Convert to relative offsets for vertical Y calculation
    const lineX = line.x as number;
    const lineY = (line.y as number) + pageYOffset;
    const startOffset = startInline - lineX;
    const endOffset = endInline - lineX;

    return {
      x: px(lineX),
      y: px(lineY + startOffset),
      width: px(fontSizePx),  // Column width
      height: px(endOffset - startOffset),  // Inline extent
    };
  }

  // Horizontal text: selection extends along X axis
  const lineY = (line.y as number) + pageYOffset;
  const bounds = getTextVisualBounds(lineY, fontSize as number, fontFamily);

  return {
    x: px(startInline),
    y: px(bounds.topY),
    width: px(endInline - startInline),
    height: px(bounds.height),
  };
}

/**
 * Get selection rects for a single paragraph.
 */
function getParagraphSelectionRects(
  ...args: [
    paragraph: PagedLayoutResult["pages"][number]["paragraphs"][number],
    pageYOffset: number,
    paraStartOffset: number,
    paraEndOffset: number,
    writingMode?: WritingMode,
  ]
): readonly SelectionRect[] {
  const [paragraph, pageYOffset, paraStartOffset, paraEndOffset, writingMode = "horizontal-tb"] = args;
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
        const rect = createLineSelectionRect(line, selStart, selEnd, pageYOffset, writingMode);
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
  const writingMode = pagedLayout.writingMode ?? "horizontal-tb";

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

    return getParagraphSelectionRects(paragraph, pageYOffset, paraStartOffset, paraEndOffset, writingMode);
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

// =============================================================================
// Vertical Cursor Movement (Arrow Up/Down)
// =============================================================================

/**
 * Line info for vertical navigation.
 */
type FlatLineInfo = {
  readonly paragraphIndex: number;
  readonly lineIndex: number;
  readonly line: LayoutLine;
  readonly pageYOffset: number;
  readonly charOffsetInParagraph: number;
};

/**
 * Build a flat list of all lines with their paragraph offsets.
 */
function buildFlatLineList(pagedLayout: PagedLayoutResult): FlatLineInfo[] {
  const flatParagraphs = buildFlatParagraphList(pagedLayout);
  const result: FlatLineInfo[] = [];

  for (let pIdx = 0; pIdx < flatParagraphs.length; pIdx++) {
    const { paragraph, pageYOffset } = flatParagraphs[pIdx];
    let charOffsetInParagraph = 0;

    for (let lIdx = 0; lIdx < paragraph.lines.length; lIdx++) {
      const line = paragraph.lines[lIdx];
      result.push({
        paragraphIndex: pIdx,
        lineIndex: lIdx,
        line,
        pageYOffset,
        charOffsetInParagraph,
      });
      charOffsetInParagraph += getLineTextLength(line.spans);
    }
  }

  return result;
}

/**
 * Find the flat line index containing the cursor position.
 */
function findCurrentLineIndex(
  flatLines: readonly FlatLineInfo[],
  position: ContinuousCursorPosition,
): number {
  let currentLineIndex = 0;

  for (let i = 0; i < flatLines.length; i++) {
    const lineInfo = flatLines[i];
    if (lineInfo.paragraphIndex !== position.paragraphIndex) {
      if (lineInfo.paragraphIndex > position.paragraphIndex) {
        break;
      }
      currentLineIndex = i + 1;
      continue;
    }

    const lineLength = getLineTextLength(lineInfo.line.spans);
    const lineEndOffset = lineInfo.charOffsetInParagraph + lineLength;

    if (position.charOffset <= lineEndOffset) {
      return i;
    }
    currentLineIndex = i + 1;
  }

  return Math.min(currentLineIndex, flatLines.length - 1);
}

/**
 * Move cursor vertically (up/down) while maintaining horizontal position.
 *
 * @param pagedLayout - The paged layout result
 * @param currentPosition - Current cursor position
 * @param direction - Direction to move: "up" or "down"
 * @param preferredX - Preferred X position (for maintaining column during vertical navigation)
 * @returns New cursor position and the X position at that line (for future movements)
 */
export function moveCursorVertically(
  ...args: [
    pagedLayout: PagedLayoutResult,
    currentPosition: ContinuousCursorPosition,
    direction: "up" | "down",
    preferredX?: number,
  ]
): { position: ContinuousCursorPosition; xPosition: number } | undefined {
  const [pagedLayout, currentPosition, direction, preferredX] = args;
  const flatLines = buildFlatLineList(pagedLayout);
  if (flatLines.length === 0) {
    return undefined;
  }

  const currentLineIdx = findCurrentLineIndex(flatLines, currentPosition);
  const targetLineIdx = direction === "up" ? currentLineIdx - 1 : currentLineIdx + 1;

  if (targetLineIdx < 0 || targetLineIdx >= flatLines.length) {
    return undefined;
  }

  const currentLineInfo = flatLines[currentLineIdx];
  const targetLineInfo = flatLines[targetLineIdx];

  // Calculate the X position to use
  const charOffsetInLine = currentPosition.charOffset - currentLineInfo.charOffsetInParagraph;
  const currentX = preferredX ?? getXPositionInLine(currentLineInfo.line, charOffsetInLine);

  // Find the character offset in the target line at the same X position
  const writingMode = pagedLayout.writingMode ?? "horizontal-tb";
  const newCharOffsetInLine = getCharOffsetInLine(targetLineInfo.line, currentX, writingMode);
  const newCharOffset = targetLineInfo.charOffsetInParagraph + newCharOffsetInLine;

  return {
    position: {
      paragraphIndex: targetLineInfo.paragraphIndex,
      charOffset: newCharOffset,
    },
    xPosition: currentX,
  };
}
