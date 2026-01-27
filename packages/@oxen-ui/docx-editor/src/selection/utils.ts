/**
 * @file DOCX Selection Utilities
 *
 * Provides utility functions for working with document selections.
 * Supports both element-level and text-level selection operations.
 */

import type {
  TextPosition,
  TextRange,
  TextSelectionState,
  ElementSelectionState,
  DocxSelectionState,
} from "../context/document/state/selection";
import type { DocxDocument, DocxBlockContent } from "@oxen/docx/domain/document";
import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import type { DocxRun } from "@oxen/docx/domain/run";
import { getRunText } from "../run/mutation";
import { getParagraphText } from "../paragraph/mutation";

// =============================================================================
// Position Creation
// =============================================================================

/**
 * Create a text position.
 */
export function createPosition(paragraphIndex: number, charOffset: number): TextPosition {
  return {
    paragraphIndex,
    charOffset,
  };
}

/**
 * Create a text range.
 */
export function createRange(start: TextPosition, end: TextPosition): TextRange {
  return {
    start,
    end,
  };
}

// =============================================================================
// Position Comparison
// =============================================================================

/**
 * Compare two text positions.
 *
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function comparePositions(a: TextPosition, b: TextPosition): -1 | 0 | 1 {
  if (a.paragraphIndex < b.paragraphIndex) {
    return -1;
  }
  if (a.paragraphIndex > b.paragraphIndex) {
    return 1;
  }
  if (a.charOffset < b.charOffset) {
    return -1;
  }
  if (a.charOffset > b.charOffset) {
    return 1;
  }
  return 0;
}

/**
 * Check if two positions are equal.
 */
export function positionsEqual(a: TextPosition, b: TextPosition): boolean {
  return a.paragraphIndex === b.paragraphIndex && a.charOffset === b.charOffset;
}

/**
 * Check if position a is before position b.
 */
export function isPositionBefore(a: TextPosition, b: TextPosition): boolean {
  return comparePositions(a, b) < 0;
}

/**
 * Check if position a is after position b.
 */
export function isPositionAfter(a: TextPosition, b: TextPosition): boolean {
  return comparePositions(a, b) > 0;
}

// =============================================================================
// Range Operations
// =============================================================================

/**
 * Normalize a range so start is always before end.
 */
export function normalizeRange(range: TextRange): TextRange {
  if (comparePositions(range.start, range.end) <= 0) {
    return range;
  }
  return { start: range.end, end: range.start };
}

/**
 * Check if a position is within a range.
 */
export function isPositionInRange(position: TextPosition, range: TextRange): boolean {
  const normalized = normalizeRange(range);
  return (
    comparePositions(position, normalized.start) >= 0 &&
    comparePositions(position, normalized.end) < 0
  );
}

/**
 * Check if two ranges overlap.
 */
export function rangesOverlap(a: TextRange, b: TextRange): boolean {
  const aNorm = normalizeRange(a);
  const bNorm = normalizeRange(b);

  return (
    comparePositions(aNorm.start, bNorm.end) < 0 &&
    comparePositions(bNorm.start, aNorm.end) < 0
  );
}

/**
 * Check if range a contains range b.
 */
export function rangeContains(outer: TextRange, inner: TextRange): boolean {
  const outerNorm = normalizeRange(outer);
  const innerNorm = normalizeRange(inner);

  return (
    comparePositions(outerNorm.start, innerNorm.start) <= 0 &&
    comparePositions(outerNorm.end, innerNorm.end) >= 0
  );
}

/**
 * Get the intersection of two ranges.
 *
 * @returns The intersecting range, or undefined if ranges don't overlap.
 */
export function intersectRanges(a: TextRange, b: TextRange): TextRange | undefined {
  if (!rangesOverlap(a, b)) {
    return undefined;
  }

  const aNorm = normalizeRange(a);
  const bNorm = normalizeRange(b);

  const start = comparePositions(aNorm.start, bNorm.start) > 0 ? aNorm.start : bNorm.start;
  const end = comparePositions(aNorm.end, bNorm.end) < 0 ? aNorm.end : bNorm.end;

  return { start, end };
}

/**
 * Merge two overlapping or adjacent ranges.
 *
 * @returns The merged range, or undefined if ranges are not adjacent/overlapping.
 */
export function mergeRanges(a: TextRange, b: TextRange): TextRange | undefined {
  const aNorm = normalizeRange(a);
  const bNorm = normalizeRange(b);

  // Check if adjacent or overlapping
  const adjacent =
    rangesOverlap(a, b) ||
    positionsEqual(aNorm.end, bNorm.start) ||
    positionsEqual(bNorm.end, aNorm.start);

  if (!adjacent) {
    return undefined;
  }

  const start = comparePositions(aNorm.start, bNorm.start) < 0 ? aNorm.start : bNorm.start;
  const end = comparePositions(aNorm.end, bNorm.end) > 0 ? aNorm.end : bNorm.end;

  return { start, end };
}

/**
 * Check if a range is collapsed (start equals end).
 */
export function isRangeCollapsed(range: TextRange): boolean {
  return positionsEqual(range.start, range.end);
}

/**
 * Get the length of a range in characters (single paragraph only).
 */
export function getRangeLength(range: TextRange): number {
  const normalized = normalizeRange(range);
  if (normalized.start.paragraphIndex !== normalized.end.paragraphIndex) {
    // Cross-paragraph range - cannot calculate simple length
    return -1;
  }
  return normalized.end.charOffset - normalized.start.charOffset;
}

// =============================================================================
// Selection State Queries
// =============================================================================

/**
 * Check if any text is selected.
 */
export function hasTextSelection(selection: DocxSelectionState): boolean {
  return selection.text.range !== undefined && !selection.text.isCollapsed;
}

/**
 * Check if any elements are selected.
 */
export function hasElementSelection(selection: DocxSelectionState): boolean {
  return selection.element.selectedIds.length > 0;
}

/**
 * Check if selection is empty (no text cursor and no elements).
 */
export function isSelectionEmpty(selection: DocxSelectionState): boolean {
  return (
    !hasTextSelection(selection) &&
    !hasElementSelection(selection) &&
    selection.text.cursor === undefined
  );
}

/**
 * Get current selection anchor position.
 */
export function getSelectionAnchor(selection: TextSelectionState): TextPosition | undefined {
  return selection.cursor ?? selection.range?.start;
}

/**
 * Get current selection focus position.
 */
export function getSelectionFocus(selection: TextSelectionState): TextPosition | undefined {
  return selection.cursor ?? selection.range?.end;
}

// =============================================================================
// Document Position Utilities
// =============================================================================

/**
 * Get paragraph at a given index.
 */
export function getParagraphAtIndex(
  document: DocxDocument,
  paragraphIndex: number,
): DocxParagraph | undefined {
  const content = document.body.content[paragraphIndex];
  if (content?.type === "paragraph") {
    return content;
  }
  return undefined;
}

/**
 * Count paragraphs in document.
 */
export function getParagraphCount(document: DocxDocument): number {
  return document.body.content.filter(
    (c): c is DocxParagraph => c.type === "paragraph",
  ).length;
}

/**
 * Get all paragraph indices in document.
 */
export function getParagraphIndices(document: DocxDocument): number[] {
  const indices: number[] = [];
  document.body.content.forEach((content, index) => {
    if (content.type === "paragraph") {
      indices.push(index);
    }
  });
  return indices;
}

/**
 * Find run and offset within paragraph for a character offset.
 *
 * @returns Tuple of [runIndex, offsetWithinRun] or undefined if out of bounds.
 */
export function findRunAtOffset(
  paragraph: DocxParagraph,
  charOffset: number,
): [number, number] | undefined {
  type Result = { found: [number, number] | undefined; offset: number };
  const initial: Result = { found: undefined, offset: 0 };

  const { found, offset: finalOffset } = paragraph.content.reduce<Result>((acc, item, index) => {
    if (acc.found !== undefined) {
      return acc;
    }
    if (item.type !== "run") {
      return acc;
    }

    const runText = getRunText(item);
    const runLength = runText.length;

    if (charOffset <= acc.offset + runLength) {
      return { found: [index, charOffset - acc.offset], offset: acc.offset + runLength };
    }

    return { found: undefined, offset: acc.offset + runLength };
  }, initial);

  if (found !== undefined) {
    return found;
  }

  // At end of paragraph
  if (charOffset === finalOffset) {
    const lastRunIndex = paragraph.content.length - 1;
    if (lastRunIndex >= 0 && paragraph.content[lastRunIndex].type === "run") {
      const lastRun = paragraph.content[lastRunIndex] as DocxRun;
      return [lastRunIndex, getRunText(lastRun).length];
    }
  }

  return undefined;
}

/**
 * Convert a position to a run-based position.
 *
 * @returns Object with runIndex and offsetWithinRun, or undefined if invalid.
 */
export function positionToRunPosition(
  document: DocxDocument,
  position: TextPosition,
): { runIndex: number; offsetWithinRun: number } | undefined {
  const paragraph = getParagraphAtIndex(document, position.paragraphIndex);
  if (!paragraph) {
    return undefined;
  }

  const result = findRunAtOffset(paragraph, position.charOffset);
  if (!result) {
    return undefined;
  }

  return { runIndex: result[0], offsetWithinRun: result[1] };
}

// =============================================================================
// Position Validation
// =============================================================================

/**
 * Check if a position is valid within a document.
 */
export function isPositionValid(document: DocxDocument, position: TextPosition): boolean {
  const paragraph = getParagraphAtIndex(document, position.paragraphIndex);
  if (!paragraph) {
    return false;
  }

  const text = getParagraphText(paragraph);
  return position.charOffset >= 0 && position.charOffset <= text.length;
}

/**
 * Check if a range is valid within a document.
 */
export function isRangeValid(document: DocxDocument, range: TextRange): boolean {
  return isPositionValid(document, range.start) && isPositionValid(document, range.end);
}

/**
 * Clamp a position to valid bounds within a document.
 */
export function clampPosition(document: DocxDocument, position: TextPosition): TextPosition {
  const contentLength = document.body.content.length;
  const paragraphIndex = Math.max(0, Math.min(position.paragraphIndex, contentLength - 1));

  const paragraph = getParagraphAtIndex(document, paragraphIndex);
  if (!paragraph) {
    return { paragraphIndex: 0, charOffset: 0 };
  }

  const text = getParagraphText(paragraph);
  const charOffset = Math.max(0, Math.min(position.charOffset, text.length));

  return { paragraphIndex, charOffset };
}

// =============================================================================
// Position Movement
// =============================================================================

/**
 * Move position forward by one character.
 */
export function movePositionForward(
  document: DocxDocument,
  position: TextPosition,
): TextPosition {
  const paragraph = getParagraphAtIndex(document, position.paragraphIndex);
  if (!paragraph) {
    return position;
  }

  const text = getParagraphText(paragraph);

  if (position.charOffset < text.length) {
    return { ...position, charOffset: position.charOffset + 1 };
  }

  // Move to next paragraph
  const nextIndex = position.paragraphIndex + 1;
  if (nextIndex < document.body.content.length) {
    return { paragraphIndex: nextIndex, charOffset: 0 };
  }

  return position;
}

/**
 * Move position backward by one character.
 */
export function movePositionBackward(
  document: DocxDocument,
  position: TextPosition,
): TextPosition {
  if (position.charOffset > 0) {
    return { ...position, charOffset: position.charOffset - 1 };
  }

  // Move to previous paragraph
  if (position.paragraphIndex > 0) {
    const prevIndex = position.paragraphIndex - 1;
    const prevParagraph = getParagraphAtIndex(document, prevIndex);
    if (prevParagraph) {
      const text = getParagraphText(prevParagraph);
      return { paragraphIndex: prevIndex, charOffset: text.length };
    }
  }

  return position;
}

/**
 * Get position at start of paragraph.
 */
export function getPositionAtParagraphStart(paragraphIndex: number): TextPosition {
  return { paragraphIndex, charOffset: 0 };
}

/**
 * Get position at end of paragraph.
 */
export function getPositionAtParagraphEnd(
  document: DocxDocument,
  paragraphIndex: number,
): TextPosition {
  const paragraph = getParagraphAtIndex(document, paragraphIndex);
  if (!paragraph) {
    return { paragraphIndex, charOffset: 0 };
  }

  const text = getParagraphText(paragraph);
  return { paragraphIndex, charOffset: text.length };
}

// =============================================================================
// Element Selection Utilities
// =============================================================================

/**
 * Get selected body content items.
 */
export function getSelectedBodyContent(
  document: DocxDocument,
  selection: ElementSelectionState,
): DocxBlockContent[] {
  // Element IDs in this implementation correspond to content indices
  return selection.selectedIds
    .map((id) => {
      const index = parseInt(id, 10);
      return !isNaN(index) ? document.body.content[index] : undefined;
    })
    .filter((c): c is DocxBlockContent => c !== undefined);
}

/**
 * Create element ID from content index.
 */
export function contentIndexToElementId(index: number): string {
  return String(index);
}

/**
 * Parse element ID to content index.
 */
export function elementIdToContentIndex(elementId: string): number | undefined {
  const index = parseInt(elementId, 10);
  return isNaN(index) ? undefined : index;
}
