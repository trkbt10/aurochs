/**
 * @file Continuous Cursor Hook
 *
 * React hook for managing cursor position and selection across
 * multiple paragraphs and pages in a DOCX document.
 */

import { useMemo, useCallback } from "react";
import type { Pixels } from "@oxen/ooxml/domain/units";
import { px } from "@oxen/ooxml/domain/units";
import type {
  LayoutParagraphResult,
  LayoutLine,
  PagedLayoutResult,
  ContinuousCursorPosition,
  ContinuousSelection,
  CursorCoordinates,
  SelectionRect,
} from "@oxen/text-layout";
import { getAscenderRatio } from "@oxen/text";
import { PT_TO_PX, getLineTextLength } from "@oxen/text-layout";

// =============================================================================
// Types
// =============================================================================

export type UseContinuousCursorOptions = {
  /** Paged layout result */
  readonly pagedLayout: PagedLayoutResult;
  /** Flat paragraph results (for position calculations) - not used, kept for API compat */
  readonly paragraphs: readonly LayoutParagraphResult[];
};

export type ContinuousCursorResult = {
  /** Convert cursor position to visual coordinates */
  readonly cursorToCoords: (position: ContinuousCursorPosition) => CursorCoordinates | undefined;
  /** Convert visual coordinates to cursor position */
  readonly coordsToCursor: (x: number, y: number, pageIndex: number) => ContinuousCursorPosition;
  /** Convert selection to rectangles */
  readonly selectionToRects: (selection: ContinuousSelection) => readonly SelectionRect[];
  /** Check if two positions are equal */
  readonly isSamePosition: (a: ContinuousCursorPosition, b: ContinuousCursorPosition) => boolean;
  /** Check if a position is before another */
  readonly isBefore: (a: ContinuousCursorPosition, b: ContinuousCursorPosition) => boolean;
  /** Normalize selection (start before end) */
  readonly normalizeSelection: (selection: ContinuousSelection) => ContinuousSelection;
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Build a flat list of paragraphs from paged layout with page info.
 */
type FlatParagraphInfo = {
  readonly paragraph: LayoutParagraphResult;
  readonly pageIndex: number;
  readonly localParagraphIndex: number;
};

function buildFlatParagraphList(pagedLayout: PagedLayoutResult): FlatParagraphInfo[] {
  const result: FlatParagraphInfo[] = [];
  for (let pageIndex = 0; pageIndex < pagedLayout.pages.length; pageIndex++) {
    const page = pagedLayout.pages[pageIndex];
    for (let localIdx = 0; localIdx < page.paragraphs.length; localIdx++) {
      result.push({
        paragraph: page.paragraphs[localIdx],
        pageIndex,
        localParagraphIndex: localIdx,
      });
    }
  }
  return result;
}

/**
 * Get total text length of a paragraph.
 */
function getParagraphTextLength(paragraph: LayoutParagraphResult): number {
  return paragraph.lines.reduce((sum, line) => sum + getLineTextLength(line.spans), 0);
}

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
 */
function getXPositionInLine(line: LayoutLine, charOffset: number): number {
  let x = line.x as number;
  let remaining = charOffset;

  for (const span of line.spans) {
    if (remaining <= span.text.length) {
      // Proportional calculation within span
      const ratio = remaining / Math.max(1, span.text.length);
      return x + (span.width as number) * ratio;
    }
    remaining -= span.text.length;
    x += (span.width as number) + (span.dx as number);
  }

  return x;
}

/**
 * Get char offset within a line from X coordinate.
 */
function getCharOffsetInLine(line: LayoutLine, targetX: number): number {
  if (line.spans.length === 0) {
    return 0;
  }

  const lineStartX = line.x as number;
  if (targetX <= lineStartX) {
    return 0;
  }

  let currentX = lineStartX;
  let charOffset = 0;

  for (const span of line.spans) {
    const spanEnd = currentX + (span.width as number);
    if (targetX <= spanEnd) {
      // Within this span - find character
      const relativeX = targetX - currentX;
      const charWidth = (span.width as number) / Math.max(1, span.text.length);
      const charIndex = Math.round(relativeX / charWidth);
      return charOffset + Math.min(charIndex, span.text.length);
    }
    charOffset += span.text.length;
    currentX = spanEnd + (span.dx as number);
  }

  return charOffset;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing continuous cursor position.
 */
export function useContinuousCursor({
  pagedLayout,
}: UseContinuousCursorOptions): ContinuousCursorResult {
  // Build flat paragraph list from paged layout - this ensures consistent Y coordinates
  const flatParagraphs = useMemo(() => buildFlatParagraphList(pagedLayout), [pagedLayout]);

  /**
   * Convert cursor position to visual coordinates.
   */
  const cursorToCoords = useCallback(
    (position: ContinuousCursorPosition): CursorCoordinates | undefined => {
      const { paragraphIndex, charOffset } = position;

      if (paragraphIndex >= flatParagraphs.length) {
        return undefined;
      }

      const { paragraph, pageIndex } = flatParagraphs[paragraphIndex];
      if (paragraph.lines.length === 0) {
        return undefined;
      }

      // Find the line containing the cursor
      let remainingOffset = charOffset;
      for (let lineIndex = 0; lineIndex < paragraph.lines.length; lineIndex++) {
        const line = paragraph.lines[lineIndex];
        const lineLength = getLineTextLength(line.spans);

        if (remainingOffset <= lineLength) {
          // Cursor is in this line
          const x = getXPositionInLine(line, remainingOffset);
          const fontSizePt = line.spans.length > 0 ? (line.spans[0].fontSize as number) : 12;
          const fontFamily = line.spans.length > 0 ? line.spans[0].fontFamily : undefined;
          const bounds = getTextVisualBounds(line.y as number, fontSizePt, fontFamily);

          return {
            x: px(x),
            y: px(bounds.topY),
            height: px(bounds.height),
            pageIndex,
          };
        }

        remainingOffset -= lineLength;
      }

      // Past end of paragraph - use end of last line
      const lastLine = paragraph.lines[paragraph.lines.length - 1];
      const x = getXPositionInLine(lastLine, getLineTextLength(lastLine.spans));
      const fontSizePt = lastLine.spans.length > 0 ? (lastLine.spans[0].fontSize as number) : 12;
      const fontFamily = lastLine.spans.length > 0 ? lastLine.spans[0].fontFamily : undefined;
      const bounds = getTextVisualBounds(lastLine.y as number, fontSizePt, fontFamily);

      return {
        x: px(x),
        y: px(bounds.topY),
        height: px(bounds.height),
        pageIndex,
      };
    },
    [flatParagraphs],
  );

  /**
   * Convert visual coordinates to cursor position.
   */
  const coordsToCursor = useCallback(
    (x: number, y: number, pageIndex: number): ContinuousCursorPosition => {
      const page = pagedLayout.pages[pageIndex];
      if (page === undefined || page.paragraphs.length === 0) {
        return { paragraphIndex: 0, charOffset: 0, pageIndex };
      }

      // Find closest line on this page
      let bestLocalParagraphIndex = 0;
      let bestLineIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (let pIdx = 0; pIdx < page.paragraphs.length; pIdx++) {
        const para = page.paragraphs[pIdx];
        for (let lIdx = 0; lIdx < para.lines.length; lIdx++) {
          const line = para.lines[lIdx];
          const fontSizePt = line.spans.length > 0 ? (line.spans[0].fontSize as number) : 12;
          const fontFamily = line.spans.length > 0 ? line.spans[0].fontFamily : undefined;
          const bounds = getTextVisualBounds(line.y as number, fontSizePt, fontFamily);

          const lineTop = bounds.topY;
          const lineBottom = bounds.topY + bounds.height;
          const distance = y < lineTop ? lineTop - y : y > lineBottom ? y - lineBottom : 0;

          if (distance < bestDistance) {
            bestDistance = distance;
            bestLocalParagraphIndex = pIdx;
            bestLineIndex = lIdx;
          }
        }
      }

      // Calculate global paragraph index
      let globalParagraphIndex = 0;
      for (let i = 0; i < pageIndex; i++) {
        globalParagraphIndex += pagedLayout.pages[i].paragraphs.length;
      }
      globalParagraphIndex += bestLocalParagraphIndex;

      const targetParagraph = page.paragraphs[bestLocalParagraphIndex];
      if (targetParagraph === undefined || targetParagraph.lines.length === 0) {
        return { paragraphIndex: globalParagraphIndex, charOffset: 0, pageIndex };
      }

      const targetLine = targetParagraph.lines[bestLineIndex];
      const lineOffset = getCharOffsetInLine(targetLine, x);
      const offsetBeforeLine = targetParagraph.lines
        .slice(0, bestLineIndex)
        .reduce((sum, line) => sum + getLineTextLength(line.spans), 0);

      return {
        paragraphIndex: globalParagraphIndex,
        charOffset: offsetBeforeLine + lineOffset,
        pageIndex,
        lineIndex: bestLineIndex,
      };
    },
    [pagedLayout],
  );

  /**
   * Check if two positions are equal.
   */
  const isSamePosition = useCallback(
    (a: ContinuousCursorPosition, b: ContinuousCursorPosition): boolean => {
      return a.paragraphIndex === b.paragraphIndex && a.charOffset === b.charOffset;
    },
    [],
  );

  /**
   * Check if position a is before position b.
   */
  const isBefore = useCallback(
    (a: ContinuousCursorPosition, b: ContinuousCursorPosition): boolean => {
      if (a.paragraphIndex < b.paragraphIndex) {
        return true;
      }
      if (a.paragraphIndex > b.paragraphIndex) {
        return false;
      }
      return a.charOffset < b.charOffset;
    },
    [],
  );

  /**
   * Normalize selection so anchor is before focus.
   */
  const normalizeSelection = useCallback(
    (selection: ContinuousSelection): ContinuousSelection => {
      if (isBefore(selection.focus, selection.anchor)) {
        return { anchor: selection.focus, focus: selection.anchor };
      }
      return selection;
    },
    [isBefore],
  );

  /**
   * Convert selection to rectangles.
   */
  const selectionToRects = useCallback(
    (selection: ContinuousSelection): readonly SelectionRect[] => {
      const normalized = normalizeSelection(selection);
      const rects: SelectionRect[] = [];

      const startPara = normalized.anchor.paragraphIndex;
      const endPara = normalized.focus.paragraphIndex;

      for (let pIdx = startPara; pIdx <= endPara; pIdx++) {
        if (pIdx >= flatParagraphs.length) {
          continue;
        }

        const { paragraph, pageIndex } = flatParagraphs[pIdx];

        const paraStartOffset = pIdx === startPara ? normalized.anchor.charOffset : 0;
        const paraEndOffset =
          pIdx === endPara ? normalized.focus.charOffset : getParagraphTextLength(paragraph);

        let lineStartOffset = 0;
        for (let lIdx = 0; lIdx < paragraph.lines.length; lIdx++) {
          const line = paragraph.lines[lIdx];
          const lineLength = getLineTextLength(line.spans);
          const lineEndOffset = lineStartOffset + lineLength;

          // Check if selection intersects this line
          if (paraStartOffset < lineEndOffset && paraEndOffset > lineStartOffset) {
            const selStart = Math.max(paraStartOffset - lineStartOffset, 0);
            const selEnd = Math.min(paraEndOffset - lineStartOffset, lineLength);

            const startX = getXPositionInLine(line, selStart);
            const endX = getXPositionInLine(line, selEnd);
            const fontSizePt = line.spans.length > 0 ? (line.spans[0].fontSize as number) : 12;
            const fontFamily = line.spans.length > 0 ? line.spans[0].fontFamily : undefined;
            const bounds = getTextVisualBounds(line.y as number, fontSizePt, fontFamily);

            rects.push({
              x: px(startX),
              y: px(bounds.topY),
              width: px(endX - startX),
              height: px(bounds.height),
              pageIndex,
            });
          }

          lineStartOffset = lineEndOffset;
        }
      }

      return rects;
    },
    [flatParagraphs, normalizeSelection],
  );

  return {
    cursorToCoords,
    coordsToCursor,
    selectionToRects,
    isSamePosition,
    isBefore,
    normalizeSelection,
  };
}
