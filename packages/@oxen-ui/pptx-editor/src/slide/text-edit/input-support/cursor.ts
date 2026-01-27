/**
 * @file Cursor position calculation
 *
 * Maps textarea cursor position to visual coordinates on the SVG text.
 * Uses LayoutResult from the text-layout engine to compute visual positions.
 */

import type { TextBody } from "@oxen/pptx/domain";
import type { Pixels } from "@oxen/ooxml/domain/units";
import type { LayoutResult, LayoutLine } from "@oxen/pptx-render/text-layout";
import {
  getVisualBoundsForRange,
  getLineVisualBounds,
  getXPositionInLine,
  getLineEndX,
  getLineTextLength,
  getTextWidthForChars,
  DEFAULT_FONT_SIZE_PT,
  fontSizeToPixels,
} from "../text-render/text-geometry";

// =============================================================================
// Types
// =============================================================================

/**
 * Cursor position in the text
 */
export type CursorPosition = {
  /** Paragraph index */
  readonly paragraphIndex: number;
  /** Character offset within the paragraph */
  readonly charOffset: number;
};

/**
 * Selection range in the text
 */
export type TextSelection = {
  readonly start: CursorPosition;
  readonly end: CursorPosition;
};

/**
 * Visual cursor coordinates
 */
export type CursorCoordinates = {
  readonly x: Pixels;
  readonly y: Pixels;
  readonly height: Pixels;
};

// =============================================================================
// Text Position Mapping
// =============================================================================

/**
 * Convert flat character offset to paragraph-relative position.
 */
export function offsetToCursorPosition(
  textBody: TextBody,
  offset: number,
): CursorPosition {
  // eslint-disable-next-line no-restricted-syntax -- performance-critical iteration
  let remaining = offset;

  for (const [pIdx, para] of textBody.paragraphs.entries()) {
    const paraText = getParagraphText(para);
    const paraLength = paraText.length;

    if (remaining <= paraLength) {
      return { paragraphIndex: pIdx, charOffset: remaining };
    }

    // +1 for newline between paragraphs
    remaining -= paraLength + 1;
  }

  // End of text
  const lastParaIdx = textBody.paragraphs.length - 1;
  const lastPara = textBody.paragraphs[lastParaIdx];
  return {
    paragraphIndex: lastParaIdx,
    charOffset: getParagraphText(lastPara).length,
  };
}

/**
 * Convert paragraph-relative position to flat character offset.
 */
export function cursorPositionToOffset(
  textBody: TextBody,
  position: CursorPosition,
): number {
  const offset = textBody.paragraphs
    .slice(0, position.paragraphIndex)
    .reduce((sum, para) => sum + getParagraphText(para).length + 1, 0);
  return offset + position.charOffset;
}

/**
 * Get plain text from a paragraph.
 */
function getParagraphText(para: TextBody["paragraphs"][number]): string {
  return para.runs
    .map((run) => {
      switch (run.type) {
        case "text":
          return run.text;
        case "break":
          return "\n";
        case "field":
          return run.text ?? "";
      }
    })
    .join("");
}

/**
 * Get full plain text from TextBody.
 */
export function getPlainText(textBody: TextBody): string {
  return textBody.paragraphs.map((p) => getParagraphText(p)).join("\n");
}

/**
 * Check if two cursor positions are equal.
 */
export function isSamePosition(a: CursorPosition, b: CursorPosition): boolean {
  return a.paragraphIndex === b.paragraphIndex && a.charOffset === b.charOffset;
}

/**
 * Check if cursor position is before another.
 */
export function isBefore(a: CursorPosition, b: CursorPosition): boolean {
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
export function normalizeSelection(selection: TextSelection): TextSelection {
  if (isBefore(selection.end, selection.start)) {
    return { start: selection.end, end: selection.start };
  }
  return selection;
}

// =============================================================================
// Visual Coordinate Mapping
// =============================================================================

/**
 * Map cursor position to visual coordinates using LayoutResult.
 *
 * Walks through the layout result to find the exact x/y position
 * corresponding to the cursor position.
 */
export function cursorPositionToCoordinates(
  position: CursorPosition,
  layoutResult: LayoutResult,
): CursorCoordinates | undefined {
  const { paragraphIndex, charOffset } = position;

  // Check bounds
  if (paragraphIndex >= layoutResult.paragraphs.length) {
    return getEndOfTextCoordinates(layoutResult);
  }

  const para = layoutResult.paragraphs[paragraphIndex];
  if (para.lines.length === 0) {
    // Empty paragraph - use next paragraph or end of text
    return getEmptyParagraphCoordinates(paragraphIndex, layoutResult);
  }

  // Find the line and span containing the cursor
  // eslint-disable-next-line no-restricted-syntax -- early return in loop
  let remainingOffset = charOffset;

  for (const line of para.lines) {
    const lineTextLength = getLineTextLength(line);

    if (remainingOffset <= lineTextLength) {
      return getCursorInLineCoordinates(line, remainingOffset);
    }

    remainingOffset -= lineTextLength;
  }

  // Past end of paragraph - return end of last line
  const lastLine = para.lines[para.lines.length - 1];
  return getEndOfLineCoordinates(lastLine);
}

/**
 * Get line range (start/end cursor positions) for a cursor position.
 */
export function getLineRangeForPosition(
  position: CursorPosition,
  layoutResult: LayoutResult,
): { start: CursorPosition; end: CursorPosition } | undefined {
  const { paragraphIndex, charOffset } = position;
  if (paragraphIndex >= layoutResult.paragraphs.length) {
    return undefined;
  }

  const para = layoutResult.paragraphs[paragraphIndex];
  if (para.lines.length === 0) {
    return {
      start: { paragraphIndex, charOffset: 0 },
      end: { paragraphIndex, charOffset: 0 },
    };
  }

  let offset = 0;
  for (const line of para.lines) {
    const lineLength = getLineTextLength(line);
    const lineStart = offset;
    const lineEnd = offset + lineLength;

    if (charOffset <= lineEnd) {
      return {
        start: { paragraphIndex, charOffset: lineStart },
        end: { paragraphIndex, charOffset: lineEnd },
      };
    }

    offset = lineEnd;
  }

  const lastLine = para.lines[para.lines.length - 1];
  const lastLength = getLineTextLength(lastLine);
  return {
    start: { paragraphIndex, charOffset: offset - lastLength },
    end: { paragraphIndex, charOffset: offset },
  };
}

/**
 * Map visual coordinates to a cursor position.
 */
export function coordinatesToCursorPosition(
  layoutResult: LayoutResult,
  x: number,
  y: number,
): CursorPosition {
  if (layoutResult.paragraphs.length === 0) {
    return { paragraphIndex: 0, charOffset: 0 };
  }

  let bestParagraphIndex = 0;
  let bestLineIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  layoutResult.paragraphs.forEach((para, paragraphIndex) => {
    para.lines.forEach((line, lineIndex) => {
      const bounds = getLineVisualBounds(line);
      const top = bounds.topY as number;
      const bottom = (bounds.topY as number) + (bounds.height as number);
      const distance =
        y < top ? top - y : y > bottom ? y - bottom : 0;

      if (distance < bestDistance) {
        bestDistance = distance;
        bestParagraphIndex = paragraphIndex;
        bestLineIndex = lineIndex;
      }
    });
  });

  const targetParagraph = layoutResult.paragraphs[bestParagraphIndex];
  if (!targetParagraph || targetParagraph.lines.length === 0) {
    return { paragraphIndex: bestParagraphIndex, charOffset: 0 };
  }

  const targetLine = targetParagraph.lines[bestLineIndex];
  const lineOffset = getCharOffsetForXInLine(targetLine, x);
  const offsetBeforeLine = targetParagraph.lines
    .slice(0, bestLineIndex)
    .reduce((sum, line) => sum + getLineTextLength(line), 0);

  return {
    paragraphIndex: bestParagraphIndex,
    charOffset: offsetBeforeLine + lineOffset,
  };
}

/**
 * Get coordinates for cursor within a line.
 */
function getCursorInLineCoordinates(
  line: LayoutLine,
  charOffset: number,
): CursorCoordinates {
  const x = getXPositionInLine(line, charOffset);
  const lineLength = getLineTextLength(line);
  if (lineLength === 0) {
    const emptyBounds = getLineVisualBounds(line);
    return {
      x,
      y: emptyBounds.topY,
      height: emptyBounds.height,
    };
  }

  const rangeStart = Math.min(charOffset, Math.max(lineLength - 1, 0));
  const rangeEnd = Math.min(rangeStart + 1, lineLength);
  const bounds = getVisualBoundsForRange(line, rangeStart, rangeEnd);

  return {
    x,
    y: bounds.topY,
    height: bounds.height,
  };
}

/**
 * Get character offset within a line from an x-coordinate.
 */
function getCharOffsetForXInLine(line: LayoutLine, x: number): number {
  if (line.spans.length === 0) {
    return 0;
  }

  const lineStartX = line.x as number;
  if (x <= lineStartX) {
    return 0;
  }

  const lineLength = getLineTextLength(line);
  if (lineLength === 0) {
    return 0;
  }

  // eslint-disable-next-line no-restricted-syntax -- accumulate through spans
  let currentX = lineStartX;
  // eslint-disable-next-line no-restricted-syntax -- accumulate through spans
  let charOffset = 0;

  for (const span of line.spans) {
    const spanLength = span.text.length;
    if (spanLength === 0) {
      currentX += (span.width as number) + (span.dx as number);
      continue;
    }

    const spanStart = currentX;
    const spanEnd = currentX + (span.width as number);
    if (x <= spanEnd) {
      const spanWidth = span.width as number;
      const clamped = Math.min(Math.max(x - spanStart, 0), spanWidth);
      return charOffset + getCharOffsetInSpan(span, clamped);
    }

    charOffset += spanLength;
    currentX = spanEnd + (span.dx as number);
  }

  return charOffset;
}

function getCharOffsetInSpan(span: LayoutLine["spans"][number], targetX: number): number {
  const length = span.text.length;
  if (length === 0) {
    return 0;
  }

  let low = 0;
  let high = length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const width = getTextWidthForChars(span, mid + 1) as number;
    if (width < targetX) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  const prevIndex = Math.max(low - 1, 0);
  const prevWidth = getTextWidthForChars(span, prevIndex) as number;
  const nextWidth = getTextWidthForChars(span, low) as number;
  return Math.abs(targetX - prevWidth) <= Math.abs(nextWidth - targetX)
    ? prevIndex
    : low;
}

/**
 * Get coordinates for end of a line.
 */
function getEndOfLineCoordinates(line: LayoutLine): CursorCoordinates {
  const endX = getLineEndX(line);
  const bounds = getLineVisualBounds(line);

  return {
    x: endX,
    y: bounds.topY,
    height: bounds.height,
  };
}

/**
 * Get coordinates for an empty paragraph.
 */
function getEmptyParagraphCoordinates(
  paragraphIndex: number,
  layoutResult: LayoutResult,
): CursorCoordinates | undefined {
  const defaultHeight = fontSizeToPixels(DEFAULT_FONT_SIZE_PT);

  // Try to find previous paragraph's end
  for (let i = paragraphIndex - 1; i >= 0; i--) {
    const prevPara = layoutResult.paragraphs[i];
    if (prevPara.lines.length > 0) {
      const lastLine = prevPara.lines[prevPara.lines.length - 1];
      const bounds = getLineVisualBounds(lastLine);
      // Position at start of next line
      return {
        x: lastLine.x,
        y: ((bounds.baselineY as number) + (bounds.height as number) * 0.2) as Pixels,
        height: defaultHeight,
      };
    }
  }

  // No previous content - return top-left
  return {
    x: 0 as Pixels,
    y: 0 as Pixels,
    height: defaultHeight,
  };
}

/**
 * Get coordinates for end of text.
 */
function getEndOfTextCoordinates(
  layoutResult: LayoutResult,
): CursorCoordinates | undefined {
  for (let i = layoutResult.paragraphs.length - 1; i >= 0; i--) {
    const para = layoutResult.paragraphs[i];
    if (para.lines.length > 0) {
      const lastLine = para.lines[para.lines.length - 1];
      return getEndOfLineCoordinates(lastLine);
    }
  }

  // Empty text
  const defaultHeight = fontSizeToPixels(DEFAULT_FONT_SIZE_PT);
  return {
    x: 0 as Pixels,
    y: 0 as Pixels,
    height: defaultHeight,
  };
}

// =============================================================================
// Selection Range Coordinates
// =============================================================================

/**
 * Selection highlight rectangle
 */
export type SelectionRect = {
  readonly x: Pixels;
  readonly y: Pixels;
  readonly width: Pixels;
  readonly height: Pixels;
};

/**
 * Get selection highlight rectangles for a text selection.
 * May return multiple rects for multi-line selections.
 */
export function selectionToRects(
  selection: TextSelection,
  layoutResult: LayoutResult,
): readonly SelectionRect[] {
  const normalized = normalizeSelection(selection);
  const rects: SelectionRect[] = [];

  // Convert positions to flat offsets for comparison
  const startCoords = cursorPositionToCoordinates(normalized.start, layoutResult);
  const endCoords = cursorPositionToCoordinates(normalized.end, layoutResult);

  if (!startCoords || !endCoords) {
    return rects;
  }

  // Simple case: same line
  if (normalized.start.paragraphIndex === normalized.end.paragraphIndex) {
    const startPara = layoutResult.paragraphs[normalized.start.paragraphIndex];
    if (startPara) {
      rects.push(...getSelectionRectsInParagraph(
        startPara,
        normalized.start.charOffset,
        normalized.end.charOffset,
      ));
    }
  } else {
    // Multi-paragraph selection - iterate through paragraphs
    for (let pIdx = normalized.start.paragraphIndex; pIdx <= normalized.end.paragraphIndex; pIdx++) {
      const para = layoutResult.paragraphs[pIdx];
      if (!para) {
        continue;
      }

      if (pIdx === normalized.start.paragraphIndex) {
        // First paragraph: from start offset to end
        const paraLength = getParagraphTextLength(para);
        rects.push(...getSelectionRectsInParagraph(para, normalized.start.charOffset, paraLength));
      } else if (pIdx === normalized.end.paragraphIndex) {
        // Last paragraph: from start to end offset
        rects.push(...getSelectionRectsInParagraph(para, 0, normalized.end.charOffset));
      } else {
        // Middle paragraphs: full line
        const paraLength = getParagraphTextLength(para);
        rects.push(...getSelectionRectsInParagraph(para, 0, paraLength));
      }
    }
  }

  return rects;
}

/**
 * Get selection rects within a single paragraph.
 */
function getSelectionRectsInParagraph(
  para: { readonly lines: readonly LayoutLine[] },
  startOffset: number,
  endOffset: number,
): SelectionRect[] {
  const rects: SelectionRect[] = [];
  // eslint-disable-next-line no-restricted-syntax -- accumulating offset through loop
  let currentOffset = 0;

  for (const line of para.lines) {
    const lineLength = getLineTextLength(line);
    const lineStart = currentOffset;
    const lineEnd = currentOffset + lineLength;

    // Check if selection intersects this line
    if (startOffset < lineEnd && endOffset > lineStart) {
      const selStart = Math.max(startOffset - lineStart, 0);
      const selEnd = Math.min(endOffset - lineStart, lineLength);

      const startX = getXPositionInLine(line, selStart);
      const endX = getXPositionInLine(line, selEnd);
      const bounds = getVisualBoundsForRange(line, selStart, selEnd);

      rects.push({
        x: startX,
        y: bounds.topY,
        width: ((endX as number) - (startX as number)) as Pixels,
        height: bounds.height,
      });
    }

    currentOffset = lineEnd;
  }

  return rects;
}

/**
 * Get total text length of a paragraph.
 */
function getParagraphTextLength(
  para: { readonly lines: readonly LayoutLine[] },
): number {
  return para.lines.reduce((sum, line) => sum + getLineTextLength(line), 0);
}
