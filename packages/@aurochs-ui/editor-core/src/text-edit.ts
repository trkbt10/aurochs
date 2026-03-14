/**
 * @file Generic text editing types
 *
 * Format-agnostic types for inline text editing.
 * These types represent cursor position, selection, and editing state
 * without reference to any specific document format (PPTX, PDF, etc.).
 */

// =============================================================================
// Cursor & Selection
// =============================================================================

/**
 * Cursor position in structured text (paragraphs with character offsets).
 */
export type CursorPosition = {
  /** Paragraph index (0-based) */
  readonly paragraphIndex: number;
  /** Character offset within the paragraph (0-based) */
  readonly charOffset: number;
};

/**
 * Selection range in structured text.
 */
export type TextSelection = {
  readonly start: CursorPosition;
  readonly end: CursorPosition;
};

/**
 * Visual cursor coordinates (for rendering).
 */
export type CursorCoordinates = {
  readonly x: number;
  readonly y: number;
  readonly height: number;
};

/**
 * Visual selection rectangle (for rendering highlights).
 */
export type SelectionRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

// =============================================================================
// Cursor Comparison Utilities
// =============================================================================

/**
 * Check if two cursor positions are the same.
 */
export function isSameCursorPosition(a: CursorPosition, b: CursorPosition): boolean {
  return a.paragraphIndex === b.paragraphIndex && a.charOffset === b.charOffset;
}

/**
 * Check if position a is before position b.
 */
export function isCursorBefore(a: CursorPosition, b: CursorPosition): boolean {
  if (a.paragraphIndex !== b.paragraphIndex) {
    return a.paragraphIndex < b.paragraphIndex;
  }
  return a.charOffset < b.charOffset;
}

/**
 * Normalize a selection so that start is always before end.
 */
export function normalizeTextSelection(selection: TextSelection): TextSelection {
  if (isCursorBefore(selection.end, selection.start)) {
    return { start: selection.end, end: selection.start };
  }
  return selection;
}

/**
 * Check if a selection is collapsed (start === end).
 */
export function isSelectionCollapsed(selection: TextSelection): boolean {
  return isSameCursorPosition(selection.start, selection.end);
}

// =============================================================================
// Text Edit Bounds & State
// =============================================================================

/**
 * Bounds of the text editing area on the canvas.
 */
export type TextEditBounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Rotation in degrees */
  readonly rotation: number;
};

/**
 * IME composition state.
 */
export type CompositionState = {
  /** Whether currently composing (IME active) */
  readonly isComposing: boolean;
  /** The composition text (未確定文字) */
  readonly text: string;
  /** Start position of composition in the textarea */
  readonly startOffset: number;
};

/**
 * Create initial composition state (not composing).
 */
export function createInitialCompositionState(): CompositionState {
  return { isComposing: false, text: "", startOffset: 0 };
}

/**
 * Cursor visual state for rendering.
 */
export type CursorState = {
  /** Cursor coordinates (or undefined if no layout available) */
  readonly cursor: CursorCoordinates | undefined;
  /** Selection rectangles */
  readonly selectionRects: readonly SelectionRect[];
  /** Whether cursor should blink */
  readonly isBlinking: boolean;
};

// =============================================================================
// Generic Text Edit State
// =============================================================================

/**
 * Inactive text edit state - no shape being edited.
 */
export type InactiveTextEditState = {
  readonly type: "inactive";
};

/**
 * Active text edit state - a shape's text is being edited.
 * TShapeId: format-specific shape identifier type.
 * TTextBody: format-specific text body type.
 */
export type ActiveTextEditState<TShapeId = string, TTextBody = unknown> = {
  readonly type: "active";
  readonly shapeId: TShapeId;
  readonly bounds: TextEditBounds;
  readonly initialTextBody: TTextBody;
};

/**
 * Text edit state union.
 */
export type TextEditState<TShapeId = string, TTextBody = unknown> =
  | InactiveTextEditState
  | ActiveTextEditState<TShapeId, TTextBody>;

/**
 * Create inactive text edit state.
 */
export function createInactiveTextEditState(): InactiveTextEditState {
  return { type: "inactive" };
}

/**
 * Check if text edit state is active.
 */
export function isTextEditActive<TShapeId, TTextBody>(
  state: TextEditState<TShapeId, TTextBody>,
): state is ActiveTextEditState<TShapeId, TTextBody> {
  return state.type === "active";
}

/**
 * Text cursor/selection state for property panel integration.
 */
export type TextCursorState = {
  /** Current cursor position */
  readonly cursorPosition: CursorPosition;
  /** Current text selection (if any) */
  readonly selection: TextSelection | undefined;
};

// =============================================================================
// Abstract Text Structure Interface
// =============================================================================

/**
 * A text run within a paragraph.
 * Minimal interface for cursor calculation — only needs type and text content.
 * `text` is optional because break runs may not have text content.
 */
export type TextRunLike = {
  readonly type: string;
  readonly text?: string;
};

/**
 * A paragraph containing text runs.
 * Minimal interface for cursor calculation.
 */
export type ParagraphLike = {
  readonly runs: readonly TextRunLike[];
};

/**
 * A text body containing paragraphs.
 * Minimal interface for cursor position mapping (offset ↔ paragraph/char).
 */
export type TextBodyLike = {
  readonly paragraphs: readonly ParagraphLike[];
};

// =============================================================================
// Abstract Layout Result Interface
// =============================================================================

/**
 * A positioned span within a laid-out line.
 * Minimal interface for cursor coordinate calculation.
 */
export type LayoutSpanLike = {
  readonly text: string;
  readonly width: number;
  readonly dx: number;
  readonly fontSize: number;
  readonly fontFamily?: string;
};

/**
 * A laid-out line containing positioned spans.
 * Minimal interface for cursor coordinate calculation.
 */
export type LayoutLineLike = {
  readonly spans: readonly LayoutSpanLike[];
  readonly x: number;
  readonly y: number;
  readonly height: number;
};

/**
 * A laid-out paragraph containing lines.
 */
export type LayoutParagraphLike = {
  readonly lines: readonly LayoutLineLike[];
};

/**
 * Layout result containing laid-out paragraphs.
 * Minimal interface for visual cursor/selection coordinate mapping.
 */
export type LayoutResultLike = {
  readonly paragraphs: readonly LayoutParagraphLike[];
};

// =============================================================================
// Text Width Measurement
// =============================================================================

/**
 * Function to measure text width for a portion of a span.
 * Format-specific implementations provide this (e.g., canvas measureText, glyph metrics).
 * Returns width in the same unit as span.width.
 *
 * @param span - The layout span
 * @param substring - The text substring to measure
 * @returns Measured width, or 0 if measurement is unavailable (falls back to proportional)
 */
export type MeasureSpanTextWidth = (span: LayoutSpanLike, substring: string) => number;

/**
 * Default proportional text width estimation (no measurement engine).
 * Distributes span width evenly across characters.
 */
export function proportionalTextWidth(span: LayoutSpanLike, substring: string): number {
  if (span.text.length === 0) { return 0; }
  return (span.width / span.text.length) * substring.length;
}

// =============================================================================
// Ascender Ratio
// =============================================================================

/**
 * Function to get the ascender ratio for a font family.
 * The ascender ratio determines how much of the font size is above the baseline.
 * Default implementations can return a constant (e.g., 0.8).
 */
export type GetAscenderRatio = (fontFamily?: string) => number;

/**
 * Default ascender ratio (typical for Latin fonts).
 */
export const DEFAULT_ASCENDER_RATIO = 0.8;

/**
 * Default implementation that returns a constant ascender ratio.
 */
export function defaultGetAscenderRatio(_fontFamily?: string): number {
  return DEFAULT_ASCENDER_RATIO;
}

// =============================================================================
// Cursor Calculation Context
// =============================================================================

/**
 * Context for cursor calculations, providing format-specific measurement functions.
 */
export type CursorCalculationContext = {
  /** Measure text width for a span substring */
  readonly measureSpanTextWidth: MeasureSpanTextWidth;
  /** Get ascender ratio for a font family */
  readonly getAscenderRatio: GetAscenderRatio;
  /** Points-to-pixels conversion factor (default: 96/72 = 1.333...) */
  readonly ptToPx: number;
  /** Default font size in points when no span is available */
  readonly defaultFontSizePt: number;
};

/**
 * Default cursor calculation context (proportional width, standard ascender).
 */
export const DEFAULT_CURSOR_CONTEXT: CursorCalculationContext = {
  measureSpanTextWidth: proportionalTextWidth,
  getAscenderRatio: defaultGetAscenderRatio,
  ptToPx: 96 / 72,
  defaultFontSizePt: 12,
};

// =============================================================================
// Text Position Mapping (TextBody ↔ flat offset)
// =============================================================================

/**
 * Get plain text from a paragraph.
 */
function getParagraphText(para: ParagraphLike): string {
  return para.runs
    .map((run) => {
      if (run.type === "break") { return "\n"; }
      return run.text ?? "";
    })
    .join("");
}

/**
 * Convert flat character offset to paragraph-relative position.
 */
export function offsetToCursorPosition(textBody: TextBodyLike, offset: number): CursorPosition {
  // eslint-disable-next-line no-restricted-syntax -- mutable accumulator decremented across paragraph iterations
  let remaining = offset;

  for (let pIdx = 0; pIdx < textBody.paragraphs.length; pIdx++) {
    const para = textBody.paragraphs[pIdx];
    const paraLength = getParagraphText(para).length;

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
export function cursorPositionToOffset(textBody: TextBodyLike, position: CursorPosition): number {
  const offset = textBody.paragraphs
    .slice(0, position.paragraphIndex)
    .reduce((sum, para) => sum + getParagraphText(para).length + 1, 0);
  return offset + position.charOffset;
}

/**
 * Get full plain text from a text body.
 */
export function getPlainText(textBody: TextBodyLike): string {
  return textBody.paragraphs.map((p) => getParagraphText(p)).join("\n");
}

// =============================================================================
// Layout Geometry Helpers
// =============================================================================

/**
 * Get total text length of a layout line.
 */
export function getLineTextLength(line: LayoutLineLike): number {
  return line.spans.reduce((sum, span) => sum + span.text.length, 0);
}

/**
 * Get text width for a portion of a span.
 */
function getTextWidthForChars(
  span: LayoutSpanLike,
  charCount: number,
  ctx: CursorCalculationContext,
): number {
  if (charCount === 0) { return 0; }
  if (charCount >= span.text.length) { return span.width; }

  const measured = ctx.measureSpanTextWidth(span, span.text.slice(0, charCount));
  if (measured > 0) { return measured; }

  // Fallback to proportional estimation
  return (span.width / span.text.length) * charCount;
}

/**
 * Get X position at a character offset within a line.
 */
export function getXPositionInLine(
  line: LayoutLineLike,
  charOffset: number,
  ctx: CursorCalculationContext = DEFAULT_CURSOR_CONTEXT,
): number {
  // eslint-disable-next-line no-restricted-syntax -- mutable x-coordinate accumulator across spans
  let x = line.x;
  // eslint-disable-next-line no-restricted-syntax -- mutable remaining offset decremented across spans
  let remaining = charOffset;

  for (const span of line.spans) {
    if (remaining <= span.text.length) {
      return x + getTextWidthForChars(span, remaining, ctx);
    }
    remaining -= span.text.length;
    x += span.width + span.dx;
  }

  return x;
}

/**
 * Get end X position of a line.
 */
function getLineEndX(line: LayoutLineLike): number {
  return line.spans.reduce((x, span) => x + span.width + span.dx, line.x);
}

/**
 * Convert font size from points to pixels.
 */
function fontSizeToPixels(fontSizePt: number, ptToPx: number): number {
  return fontSizePt * ptToPx;
}

/**
 * Get the effective font size for a line (max span size or default).
 */
function getLineFontSize(line: LayoutLineLike, defaultFontSizePt: number): number {
  if (line.spans.length === 0) { return defaultFontSizePt; }
  return line.spans.reduce((max, span) => Math.max(max, span.fontSize), 0);
}

/**
 * Visual bounds for text at a position.
 */
export type TextVisualBounds = {
  readonly topY: number;
  readonly baselineY: number;
  readonly height: number;
};

function getTextVisualBounds(args: {
  baselineY: number;
  fontSizePt: number;
  ctx: CursorCalculationContext;
  fontFamily?: string;
}): TextVisualBounds {
  const fontSizePx = fontSizeToPixels(args.fontSizePt, args.ctx.ptToPx);
  const ascenderHeight = fontSizePx * args.ctx.getAscenderRatio(args.fontFamily);
  return {
    topY: args.baselineY - ascenderHeight,
    baselineY: args.baselineY,
    height: fontSizePx,
  };
}

function getLineVisualBounds(line: LayoutLineLike, ctx: CursorCalculationContext): TextVisualBounds {
  const fontSizePt = getLineFontSize(line, ctx.defaultFontSizePt);
  const fontFamily = line.spans[0]?.fontFamily;
  return getTextVisualBounds({ baselineY: line.y, fontSizePt, ctx, fontFamily });
}

function getVisualBoundsForRange(args: {
  line: LayoutLineLike;
  startOffset: number;
  endOffset: number;
  ctx: CursorCalculationContext;
}): TextVisualBounds {
  const rangeStart = Math.min(args.startOffset, args.endOffset);
  const rangeEnd = Math.max(args.startOffset, args.endOffset);
  // eslint-disable-next-line no-restricted-syntax -- mutable accumulator tracking max font size across spans
  let maxSize = 0;
  // eslint-disable-next-line no-restricted-syntax -- mutable accumulator tracking font family of max-size span
  let maxFamily: string | undefined;
  // eslint-disable-next-line no-restricted-syntax -- mutable offset counter incremented across spans
  let offset = 0;
  // eslint-disable-next-line no-restricted-syntax -- mutable flag set when any span overlaps the range
  let hasSelection = false;

  for (const span of args.line.spans) {
    const spanStart = offset;
    const spanEnd = offset + span.text.length;
    if (spanEnd > rangeStart && spanStart < rangeEnd) {
      if (span.fontSize > maxSize) {
        maxSize = span.fontSize;
        maxFamily = span.fontFamily;
      }
      hasSelection = true;
    }
    offset = spanEnd;
  }

  if (!hasSelection) {
    return getLineVisualBounds(args.line, args.ctx);
  }

  return getTextVisualBounds({ baselineY: args.line.y, fontSizePt: maxSize, ctx: args.ctx, fontFamily: maxFamily });
}

// =============================================================================
// Visual Coordinate Mapping
// =============================================================================

/**
 * Map cursor position to visual coordinates using layout result.
 */
export function cursorPositionToCoordinates(
  position: CursorPosition,
  layoutResult: LayoutResultLike,
  ctx: CursorCalculationContext = DEFAULT_CURSOR_CONTEXT,
): CursorCoordinates | undefined {
  const { paragraphIndex, charOffset } = position;

  if (paragraphIndex >= layoutResult.paragraphs.length) {
    return getEndOfTextCoordinates(layoutResult, ctx);
  }

  const para = layoutResult.paragraphs[paragraphIndex];
  if (para.lines.length === 0) {
    return getEmptyParagraphCoordinates(paragraphIndex, layoutResult, ctx);
  }

  // eslint-disable-next-line no-restricted-syntax -- mutable remaining offset decremented across lines
  let remainingOffset = charOffset;

  for (const line of para.lines) {
    const lineTextLength = getLineTextLength(line);
    if (remainingOffset <= lineTextLength) {
      return getCursorInLineCoordinates(line, remainingOffset, ctx);
    }
    remainingOffset -= lineTextLength;
  }

  const lastLine = para.lines[para.lines.length - 1];
  return getEndOfLineCoordinates(lastLine, ctx);
}

function getCursorInLineCoordinates(
  line: LayoutLineLike,
  charOffset: number,
  ctx: CursorCalculationContext,
): CursorCoordinates {
  const x = getXPositionInLine(line, charOffset, ctx);
  const lineLength = getLineTextLength(line);
  if (lineLength === 0) {
    const emptyBounds = getLineVisualBounds(line, ctx);
    return { x, y: emptyBounds.topY, height: emptyBounds.height };
  }

  const rangeStart = Math.min(charOffset, Math.max(lineLength - 1, 0));
  const rangeEnd = Math.min(rangeStart + 1, lineLength);
  const bounds = getVisualBoundsForRange({ line, startOffset: rangeStart, endOffset: rangeEnd, ctx });
  return { x, y: bounds.topY, height: bounds.height };
}

function getEndOfLineCoordinates(line: LayoutLineLike, ctx: CursorCalculationContext): CursorCoordinates {
  const endX = getLineEndX(line);
  const bounds = getLineVisualBounds(line, ctx);
  return { x: endX, y: bounds.topY, height: bounds.height };
}

function getEmptyParagraphCoordinates(
  paragraphIndex: number,
  layoutResult: LayoutResultLike,
  ctx: CursorCalculationContext,
): CursorCoordinates | undefined {
  const defaultHeight = fontSizeToPixels(ctx.defaultFontSizePt, ctx.ptToPx);

  for (let i = paragraphIndex - 1; i >= 0; i--) {
    const prevPara = layoutResult.paragraphs[i];
    if (prevPara.lines.length > 0) {
      const lastLine = prevPara.lines[prevPara.lines.length - 1];
      const bounds = getLineVisualBounds(lastLine, ctx);
      return { x: lastLine.x, y: bounds.baselineY + bounds.height * 0.2, height: defaultHeight };
    }
  }

  return { x: 0, y: 0, height: defaultHeight };
}

function getEndOfTextCoordinates(
  layoutResult: LayoutResultLike,
  ctx: CursorCalculationContext,
): CursorCoordinates | undefined {
  for (let i = layoutResult.paragraphs.length - 1; i >= 0; i--) {
    const para = layoutResult.paragraphs[i];
    if (para.lines.length > 0) {
      const lastLine = para.lines[para.lines.length - 1];
      return getEndOfLineCoordinates(lastLine, ctx);
    }
  }

  const defaultHeight = fontSizeToPixels(ctx.defaultFontSizePt, ctx.ptToPx);
  return { x: 0, y: 0, height: defaultHeight };
}

/**
 * Map visual coordinates to a cursor position.
 */
export function coordinatesToCursorPosition(args: {
  layoutResult: LayoutResultLike;
  x: number;
  y: number;
  ctx?: CursorCalculationContext;
}): CursorPosition {
  const { layoutResult, x, y } = args;
  const ctx = args.ctx ?? DEFAULT_CURSOR_CONTEXT;
  if (layoutResult.paragraphs.length === 0) {
    return { paragraphIndex: 0, charOffset: 0 };
  }

  // eslint-disable-next-line no-restricted-syntax -- mutable best-match paragraph index updated during iteration
  let bestParagraphIndex = 0;
  // eslint-disable-next-line no-restricted-syntax -- mutable best-match line index updated during iteration
  let bestLineIndex = 0;
  // eslint-disable-next-line no-restricted-syntax -- mutable best-match distance updated during iteration
  let bestDistance = Number.POSITIVE_INFINITY;

  layoutResult.paragraphs.forEach((para, paragraphIndex) => {
    para.lines.forEach((line, lineIndex) => {
      const bounds = getLineVisualBounds(line, ctx);
      const top = bounds.topY;
      const bottom = bounds.topY + bounds.height;
      const distance = y < top ? top - y : y > bottom ? y - bottom : 0;

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
  const lineOffset = getCharOffsetForXInLine(targetLine, x, ctx);
  const offsetBeforeLine = targetParagraph.lines
    .slice(0, bestLineIndex)
    .reduce((sum, line) => sum + getLineTextLength(line), 0);

  return { paragraphIndex: bestParagraphIndex, charOffset: offsetBeforeLine + lineOffset };
}

function getCharOffsetForXInLine(line: LayoutLineLike, x: number, ctx: CursorCalculationContext): number {
  if (line.spans.length === 0) { return 0; }
  if (x <= line.x) { return 0; }

  const lineLength = getLineTextLength(line);
  if (lineLength === 0) { return 0; }

  // eslint-disable-next-line no-restricted-syntax -- mutable x-coordinate accumulator across spans
  let currentX = line.x;
  // eslint-disable-next-line no-restricted-syntax -- mutable character offset accumulator across spans
  let charOffset = 0;

  for (const span of line.spans) {
    const spanLength = span.text.length;
    if (spanLength === 0) {
      currentX += span.width + span.dx;
      continue;
    }

    const spanEnd = currentX + span.width;
    if (x <= spanEnd) {
      const clamped = Math.min(Math.max(x - currentX, 0), span.width);
      return charOffset + getCharOffsetInSpan(span, clamped, ctx);
    }

    charOffset += spanLength;
    currentX = spanEnd + span.dx;
  }

  return charOffset;
}

function getCharOffsetInSpan(span: LayoutSpanLike, targetX: number, ctx: CursorCalculationContext): number {
  const length = span.text.length;
  if (length === 0) { return 0; }

  // eslint-disable-next-line no-restricted-syntax -- mutable binary search lower bound
  let low = 0;
  // eslint-disable-next-line no-restricted-syntax -- mutable binary search upper bound
  let high = length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const width = getTextWidthForChars(span, mid + 1, ctx);
    if (width < targetX) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  const prevWidth = getTextWidthForChars(span, Math.max(low - 1, 0), ctx);
  const nextWidth = getTextWidthForChars(span, low, ctx);
  if (Math.abs(targetX - prevWidth) <= Math.abs(nextWidth - targetX)) {
    return Math.max(low - 1, 0);
  }
  return low;
}

// =============================================================================
// Selection Range Coordinates
// =============================================================================

/**
 * Get selection highlight rectangles for a text selection.
 * May return multiple rects for multi-line selections.
 */
export function selectionToRects(
  selection: TextSelection,
  layoutResult: LayoutResultLike,
  ctx: CursorCalculationContext = DEFAULT_CURSOR_CONTEXT,
): readonly SelectionRect[] {
  const normalized = normalizeTextSelection(selection);
  const rects: SelectionRect[] = [];

  const startCoords = cursorPositionToCoordinates(normalized.start, layoutResult, ctx);
  const endCoords = cursorPositionToCoordinates(normalized.end, layoutResult, ctx);

  if (!startCoords || !endCoords) { return rects; }

  if (normalized.start.paragraphIndex === normalized.end.paragraphIndex) {
    const startPara = layoutResult.paragraphs[normalized.start.paragraphIndex];
    if (startPara) {
      rects.push(...getSelectionRectsInParagraph({ para: startPara, startOffset: normalized.start.charOffset, endOffset: normalized.end.charOffset, ctx }));
    }
  } else {
    for (let pIdx = normalized.start.paragraphIndex; pIdx <= normalized.end.paragraphIndex; pIdx++) {
      const para = layoutResult.paragraphs[pIdx];
      if (!para) { continue; }

      if (pIdx === normalized.start.paragraphIndex) {
        const paraLength = getParagraphTextLengthFromLayout(para);
        rects.push(...getSelectionRectsInParagraph({ para, startOffset: normalized.start.charOffset, endOffset: paraLength, ctx }));
      } else if (pIdx === normalized.end.paragraphIndex) {
        rects.push(...getSelectionRectsInParagraph({ para, startOffset: 0, endOffset: normalized.end.charOffset, ctx }));
      } else {
        const paraLength = getParagraphTextLengthFromLayout(para);
        rects.push(...getSelectionRectsInParagraph({ para, startOffset: 0, endOffset: paraLength, ctx }));
      }
    }
  }

  return rects;
}

function getSelectionRectsInParagraph(args: {
  para: LayoutParagraphLike;
  startOffset: number;
  endOffset: number;
  ctx: CursorCalculationContext;
}): SelectionRect[] {
  const rects: SelectionRect[] = [];
  // eslint-disable-next-line no-restricted-syntax -- mutable offset accumulator across lines
  let currentOffset = 0;

  for (const line of args.para.lines) {
    const lineLength = getLineTextLength(line);
    const lineStart = currentOffset;
    const lineEnd = currentOffset + lineLength;

    if (args.startOffset < lineEnd && args.endOffset > lineStart) {
      const selStart = Math.max(args.startOffset - lineStart, 0);
      const selEnd = Math.min(args.endOffset - lineStart, lineLength);

      const startX = getXPositionInLine(line, selStart, args.ctx);
      const endX = getXPositionInLine(line, selEnd, args.ctx);
      const bounds = getVisualBoundsForRange({ line, startOffset: selStart, endOffset: selEnd, ctx: args.ctx });

      rects.push({
        x: startX,
        y: bounds.topY,
        width: endX - startX,
        height: bounds.height,
      });
    }

    currentOffset = lineEnd;
  }

  return rects;
}

function getParagraphTextLengthFromLayout(para: LayoutParagraphLike): number {
  return para.lines.reduce((sum, line) => sum + getLineTextLength(line), 0);
}
