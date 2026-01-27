/**
 * @file DOCX Cursor position calculation
 *
 * Maps cursor positions between different coordinate systems:
 * 1. Flat character offset (textarea position)
 * 2. DocxCursorPosition (element index + char offset)
 * 3. Visual coordinates (x, y, height for rendering)
 */

import type { DocxDocument, DocxBlockContent } from "@oxen/docx/domain/document";
import type { DocxParagraph, DocxParagraphContent } from "@oxen/docx/domain/paragraph";
import type { DocxRun, DocxRunContent } from "@oxen/docx/domain/run";

// =============================================================================
// Types
// =============================================================================

/**
 * Cursor position in the document.
 */
export type DocxCursorPosition = {
  /** Block content index in document body */
  readonly elementIndex: number;
  /** Character offset within the element */
  readonly charOffset: number;
};

/**
 * Text selection range.
 */
export type DocxTextSelection = {
  readonly start: DocxCursorPosition;
  readonly end: DocxCursorPosition;
};

/**
 * Visual cursor coordinates for rendering.
 */
export type CursorCoordinates = {
  readonly x: number;
  readonly y: number;
  readonly height: number;
};

// =============================================================================
// Text Position Mapping
// =============================================================================

/**
 * Convert flat character offset to document-relative position.
 */
export function offsetToDocxCursorPosition(
  content: readonly DocxBlockContent[],
  offset: number
): DocxCursorPosition {
  let remaining = offset;

  for (let elementIndex = 0; elementIndex < content.length; elementIndex++) {
    const element = content[elementIndex];
    const elementLength = getBlockContentTextLength(element);

    if (remaining <= elementLength) {
      return { elementIndex, charOffset: remaining };
    }

    // +1 for newline between elements
    remaining -= elementLength + 1;
  }

  // End of document
  const lastIndex = Math.max(content.length - 1, 0);
  const lastElement = content[lastIndex];
  return {
    elementIndex: lastIndex,
    charOffset: lastElement ? getBlockContentTextLength(lastElement) : 0,
  };
}

/**
 * Convert document-relative position to flat character offset.
 */
export function docxCursorPositionToOffset(
  content: readonly DocxBlockContent[],
  position: DocxCursorPosition
): number {
  let offset = 0;

  for (let i = 0; i < position.elementIndex && i < content.length; i++) {
    offset += getBlockContentTextLength(content[i]) + 1; // +1 for newline
  }

  return offset + position.charOffset;
}

// =============================================================================
// Plain Text Extraction
// =============================================================================

/**
 * Get plain text from a paragraph.
 */
export function getPlainTextFromParagraph(paragraph: DocxParagraph): string {
  return paragraph.content.map(getPlainTextFromParagraphContent).join("");
}

/**
 * Get plain text from paragraph content (run, hyperlink, etc.).
 */
function getPlainTextFromParagraphContent(content: DocxParagraphContent): string {
  switch (content.type) {
    case "run":
      return getPlainTextFromRun(content);
    case "hyperlink":
      return content.content.map(getPlainTextFromRun).join("");
    case "bookmarkStart":
    case "bookmarkEnd":
    case "commentRangeStart":
    case "commentRangeEnd":
      return "";
  }
}

/**
 * Get plain text from a run.
 */
function getPlainTextFromRun(run: DocxRun): string {
  return run.content.map(getPlainTextFromRunContent).join("");
}

/**
 * Get plain text from run content.
 */
function getPlainTextFromRunContent(content: DocxRunContent): string {
  switch (content.type) {
    case "text":
      return content.value;
    case "tab":
      return "\t";
    case "break":
      return content.breakType === "page" || content.breakType === "column" ? "" : "\n";
    case "symbol":
      return ""; // Symbols are not directly convertible to plain text
    case "drawing":
      return ""; // Drawings are not convertible to plain text
  }
}

/**
 * Get plain text length of a block content element.
 */
function getBlockContentTextLength(content: DocxBlockContent): number {
  switch (content.type) {
    case "paragraph":
      return getPlainTextFromParagraph(content).length;
    case "table":
      // Table text is complex - for now return 0, will be expanded later
      return 0;
    case "sectionBreak":
      return 0;
  }
}

/**
 * Get full plain text from document.
 */
export function getPlainTextFromDocument(document: DocxDocument): string {
  return document.body.content
    .map((content) => {
      switch (content.type) {
        case "paragraph":
          return getPlainTextFromParagraph(content);
        case "table":
          return ""; // Tables handled separately
        case "sectionBreak":
          return "";
      }
    })
    .join("\n");
}

// =============================================================================
// Position Comparison
// =============================================================================

/**
 * Check if two cursor positions are equal.
 */
export function isSamePosition(a: DocxCursorPosition, b: DocxCursorPosition): boolean {
  return a.elementIndex === b.elementIndex && a.charOffset === b.charOffset;
}

/**
 * Check if cursor position a is before position b.
 */
export function isBefore(a: DocxCursorPosition, b: DocxCursorPosition): boolean {
  if (a.elementIndex < b.elementIndex) {
    return true;
  }
  if (a.elementIndex > b.elementIndex) {
    return false;
  }
  return a.charOffset < b.charOffset;
}

/**
 * Normalize selection so start is before end.
 */
export function normalizeSelection(selection: DocxTextSelection): DocxTextSelection {
  if (isBefore(selection.end, selection.start)) {
    return { start: selection.end, end: selection.start };
  }
  return selection;
}

// =============================================================================
// Word and Line Selection
// =============================================================================

/**
 * Get word range for double-click selection.
 *
 * @param text - The text to search in
 * @param offset - Cursor offset within the text
 * @returns Start and end offsets of the word
 */
export function getWordRange(
  text: string,
  offset: number
): { start: number; end: number } {
  if (text.length === 0) {
    return { start: 0, end: 0 };
  }

  // Clamp offset to valid range
  const safeOffset = Math.min(Math.max(offset, 0), text.length);

  // Word character pattern (Unicode-aware)
  const isWordChar = (char: string): boolean => {
    return /[\p{L}\p{N}_]/u.test(char);
  };

  // If at the end or current char is not a word char, try to look left
  let start = safeOffset;
  let end = safeOffset;

  // Find start of word
  while (start > 0 && isWordChar(text[start - 1])) {
    start--;
  }

  // Find end of word
  while (end < text.length && isWordChar(text[end])) {
    end++;
  }

  // If we didn't find a word (e.g., clicked on whitespace), select the whitespace
  if (start === end) {
    start = safeOffset;
    end = safeOffset;
    // Expand to include adjacent non-word characters
    while (start > 0 && !isWordChar(text[start - 1])) {
      start--;
    }
    while (end < text.length && !isWordChar(text[end])) {
      end++;
    }
  }

  return { start, end };
}

/**
 * Get line range for triple-click selection.
 *
 * @param text - The text to search in
 * @param offset - Cursor offset within the text
 * @returns Start and end offsets of the line
 */
export function getLineRange(
  text: string,
  offset: number
): { start: number; end: number } {
  if (text.length === 0) {
    return { start: 0, end: 0 };
  }

  const safeOffset = Math.min(Math.max(offset, 0), text.length);

  // Find start of line (after previous newline or start of text)
  let start = safeOffset;
  while (start > 0 && text[start - 1] !== "\n") {
    start--;
  }

  // Find end of line (before next newline or end of text)
  let end = safeOffset;
  while (end < text.length && text[end] !== "\n") {
    end++;
  }

  return { start, end };
}

// =============================================================================
// Selection Helpers
// =============================================================================

/**
 * Check if selection is collapsed (cursor, no range).
 */
export function isSelectionCollapsed(selection: DocxTextSelection): boolean {
  return isSamePosition(selection.start, selection.end);
}

/**
 * Create a collapsed selection at a position.
 */
export function createCollapsedSelection(position: DocxCursorPosition): DocxTextSelection {
  return { start: position, end: position };
}

/**
 * Get the length of a selection in characters.
 */
export function getSelectionLength(
  content: readonly DocxBlockContent[],
  selection: DocxTextSelection
): number {
  const normalized = normalizeSelection(selection);
  const startOffset = docxCursorPositionToOffset(content, normalized.start);
  const endOffset = docxCursorPositionToOffset(content, normalized.end);
  return endOffset - startOffset;
}
