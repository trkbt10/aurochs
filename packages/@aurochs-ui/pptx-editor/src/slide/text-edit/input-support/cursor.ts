/**
 * @file Cursor position calculation
 *
 * Maps textarea cursor position to visual coordinates on the SVG text.
 * Delegates to @aurochs-ui/editor-core/text-edit for generic cursor math,
 * providing PPTX-specific measurement functions via CursorCalculationContext.
 */

import type { TextBody } from "@aurochs-office/pptx/domain";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import type { LayoutResult } from "@aurochs-renderer/pptx/text-layout";
import type { PositionedSpan } from "@aurochs-renderer/pptx/text-layout";
import { PT_TO_PX } from "@aurochs-office/pptx/domain/unit-conversion";
import { measureLayoutSpanTextWidth } from "@aurochs-renderer/pptx/react";
import { getAscenderRatio } from "@aurochs/glyph";
import {
  type CursorCalculationContext,
  type LayoutSpanLike,
  normalizeTextSelection,
  offsetToCursorPosition as genericOffsetToCursorPosition,
  cursorPositionToOffset as genericCursorPositionToOffset,
  getPlainText as genericGetPlainText,
  cursorPositionToCoordinates as genericCursorPositionToCoordinates,
  coordinatesToCursorPosition as genericCoordinatesToCursorPosition,
  selectionToRects as genericSelectionToRects,
  getLineTextLength,
  isSameCursorPosition,
  isCursorBefore,
} from "@aurochs-ui/editor-core/text-edit";

// =============================================================================
// Types (local definitions, not re-exports)
// =============================================================================

/**
 * Cursor position in the text (paragraph index + character offset)
 */
export type CursorPosition = {
  readonly paragraphIndex: number;
  readonly charOffset: number;
};

/**
 * Text selection range (start and end cursor positions)
 */
export type TextSelection = {
  readonly start: CursorPosition;
  readonly end: CursorPosition;
};

/**
 * Visual cursor coordinates (branded with Pixels)
 */
export type CursorCoordinates = {
  readonly x: Pixels;
  readonly y: Pixels;
  readonly height: Pixels;
};

/**
 * Selection highlight rectangle (branded with Pixels)
 */
export type SelectionRect = {
  readonly x: Pixels;
  readonly y: Pixels;
  readonly width: Pixels;
  readonly height: Pixels;
};

// =============================================================================
// PPTX Cursor Context
// =============================================================================

function pptxMeasureSpanTextWidth(span: LayoutSpanLike, substring: string): number {
  // LayoutSpanLike is structurally a subset of PositionedSpan;
  // the measurement function only accesses fields present in LayoutSpanLike.
  return measureLayoutSpanTextWidth(span as PositionedSpan, substring) as number;
}

const PPTX_CURSOR_CONTEXT: CursorCalculationContext = {
  measureSpanTextWidth: pptxMeasureSpanTextWidth,
  getAscenderRatio,
  ptToPx: PT_TO_PX,
  defaultFontSizePt: 12,
};

// =============================================================================
// PPTX-typed Wrappers
// =============================================================================

/**
 * Convert flat character offset to paragraph-relative position.
 */
export function offsetToCursorPosition(textBody: TextBody, offset: number): CursorPosition {
  return genericOffsetToCursorPosition(textBody, offset);
}

/**
 * Convert paragraph-relative position to flat character offset.
 */
export function cursorPositionToOffset(textBody: TextBody, position: CursorPosition): number {
  return genericCursorPositionToOffset(textBody, position);
}

/**
 * Get full plain text from TextBody.
 */
export function getPlainText(textBody: TextBody): string {
  return genericGetPlainText(textBody);
}

/**
 * Check if two cursor positions are equal.
 */
export function isSamePosition(a: CursorPosition, b: CursorPosition): boolean {
  return isSameCursorPosition(a, b);
}

/**
 * Check if cursor position is before another.
 */
export function isBefore(a: CursorPosition, b: CursorPosition): boolean {
  return isCursorBefore(a, b);
}

/**
 * Normalize selection so start is before end.
 */
export function normalizeSelection(selection: TextSelection): TextSelection {
  return normalizeTextSelection(selection);
}

/**
 * Map cursor position to visual coordinates using LayoutResult.
 */
export function cursorPositionToCoordinates(
  position: CursorPosition,
  layoutResult: LayoutResult,
): CursorCoordinates | undefined {
  const result = genericCursorPositionToCoordinates(position, layoutResult, PPTX_CURSOR_CONTEXT);
  if (!result) { return undefined; }
  return { x: result.x as Pixels, y: result.y as Pixels, height: result.height as Pixels };
}

/**
 * Get line range (start/end cursor positions) for a cursor position.
 */
export function getLineRangeForPosition(
  position: CursorPosition,
  layoutResult: LayoutResult,
): { start: CursorPosition; end: CursorPosition } | undefined {
  const { paragraphIndex, charOffset } = position;
  if (paragraphIndex >= layoutResult.paragraphs.length) { return undefined; }

  const para = layoutResult.paragraphs[paragraphIndex];
  if (para.lines.length === 0) {
    return { start: { paragraphIndex, charOffset: 0 }, end: { paragraphIndex, charOffset: 0 } };
  }

  // eslint-disable-next-line no-restricted-syntax -- accumulating offset through loop
  let offset = 0;
  for (const line of para.lines) {
    const lineLength = getLineTextLength(line);
    const lineStart = offset;
    const lineEnd = offset + lineLength;

    if (charOffset <= lineEnd) {
      return { start: { paragraphIndex, charOffset: lineStart }, end: { paragraphIndex, charOffset: lineEnd } };
    }

    offset = lineEnd;
  }

  const lastLine = para.lines[para.lines.length - 1];
  const lastLength = getLineTextLength(lastLine);
  return { start: { paragraphIndex, charOffset: offset - lastLength }, end: { paragraphIndex, charOffset: offset } };
}

/**
 * Map visual coordinates to a cursor position.
 */
export function coordinatesToCursorPosition(layoutResult: LayoutResult, x: number, y: number): CursorPosition {
  return genericCoordinatesToCursorPosition({ layoutResult, x, y, ctx: PPTX_CURSOR_CONTEXT });
}

/**
 * Get selection highlight rectangles for a text selection.
 */
export function selectionToRects(selection: TextSelection, layoutResult: LayoutResult): readonly SelectionRect[] {
  const rects = genericSelectionToRects(selection, layoutResult, PPTX_CURSOR_CONTEXT);
  return rects as readonly SelectionRect[];
}
