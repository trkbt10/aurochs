/**
 * @file DOCX Range Operations
 *
 * Provides operations for manipulating ranges of content within a document.
 * These are higher-level operations that work across paragraphs and runs.
 */

import type { DocxDocument } from "@oxen/docx/domain/document";
import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import type { DocxRunProperties } from "@oxen/docx/domain/run";
import type { TextPosition, TextRange } from "../context/document/state/selection";
import {
  getParagraphText,
  insertText,
  deleteTextRange,
  splitParagraph,
  mergeParagraphs,
  applyFormattingToRange,
  createParagraph,
} from "../paragraph/mutation";
import {
  normalizeRange,
  getParagraphAtIndex,
  isRangeCollapsed,
  clampPosition,
} from "../selection/utils";

// =============================================================================
// Document Content Operations
// =============================================================================

/**
 * Get text content from a range.
 *
 * @returns The text content within the range.
 */
export function getTextInRange(document: DocxDocument, range: TextRange): string {
  const normalized = normalizeRange(range);
  const { start, end } = normalized;

  if (start.paragraphIndex === end.paragraphIndex) {
    // Single paragraph
    const paragraph = getParagraphAtIndex(document, start.paragraphIndex);
    if (!paragraph) {
      return "";
    }

    const text = getParagraphText(paragraph);
    return text.slice(start.charOffset, end.charOffset);
  }

  // Multi-paragraph
  const parts: string[] = [];

  // First paragraph (from start offset to end)
  const firstParagraph = getParagraphAtIndex(document, start.paragraphIndex);
  if (firstParagraph) {
    const text = getParagraphText(firstParagraph);
    parts.push(text.slice(start.charOffset));
  }

  // Middle paragraphs (complete)
  for (let i = start.paragraphIndex + 1; i < end.paragraphIndex; i++) {
    const paragraph = getParagraphAtIndex(document, i);
    if (paragraph) {
      parts.push(getParagraphText(paragraph));
    }
  }

  // Last paragraph (from start to end offset)
  const lastParagraph = getParagraphAtIndex(document, end.paragraphIndex);
  if (lastParagraph) {
    const text = getParagraphText(lastParagraph);
    parts.push(text.slice(0, end.charOffset));
  }

  return parts.join("\n");
}

/**
 * Delete content in a range.
 *
 * @returns Updated document.
 */
export function deleteRange(document: DocxDocument, range: TextRange): DocxDocument {
  const normalized = normalizeRange(range);
  const { start, end } = normalized;

  if (isRangeCollapsed(normalized)) {
    return document;
  }

  if (start.paragraphIndex === end.paragraphIndex) {
    // Single paragraph deletion
    const paragraph = getParagraphAtIndex(document, start.paragraphIndex);
    if (!paragraph) {
      return document;
    }

    const newParagraph = deleteTextRange(paragraph, start.charOffset, end.charOffset);

    return updateParagraphInDocument(document, start.paragraphIndex, newParagraph);
  }

  // Multi-paragraph deletion
  const firstParagraph = getParagraphAtIndex(document, start.paragraphIndex);
  const lastParagraph = getParagraphAtIndex(document, end.paragraphIndex);

  if (!firstParagraph || !lastParagraph) {
    return document;
  }

  // Delete from start offset to end of first paragraph
  const firstModified = deleteTextRange(
    firstParagraph,
    start.charOffset,
    getParagraphText(firstParagraph).length,
  );

  // Delete from start to end offset in last paragraph
  const lastModified = deleteTextRange(lastParagraph, 0, end.charOffset);

  // Merge the two modified paragraphs
  const mergedParagraph = mergeParagraphs(firstModified, lastModified);

  // Build new content array
  const newContent = [
    ...document.body.content.slice(0, start.paragraphIndex),
    mergedParagraph,
    ...document.body.content.slice(end.paragraphIndex + 1),
  ];

  return {
    ...document,
    body: {
      ...document.body,
      content: newContent,
    },
  };
}

/**
 * Insert text at a position.
 *
 * @returns Updated document and new cursor position.
 */
export function insertTextAtPosition(
  document: DocxDocument,
  position: TextPosition,
  text: string,
  properties?: DocxRunProperties,
): { document: DocxDocument; newPosition: TextPosition } {
  const clampedPosition = clampPosition(document, position);
  const paragraph = getParagraphAtIndex(document, clampedPosition.paragraphIndex);

  if (!paragraph) {
    return { document, newPosition: position };
  }

  // Handle newlines in text
  const lines = text.split("\n");

  if (lines.length === 1) {
    // No newlines - simple insertion
    const newParagraph = insertText(paragraph, clampedPosition.charOffset, text, properties);
    const newDocument = updateParagraphInDocument(document, clampedPosition.paragraphIndex, newParagraph);

    return {
      document: newDocument,
      newPosition: {
        paragraphIndex: clampedPosition.paragraphIndex,
        charOffset: clampedPosition.charOffset + text.length,
      },
    };
  }

  // Multiple lines - need to split and insert
  // eslint-disable-next-line no-restricted-syntax -- Complex multi-paragraph insertion requires mutable state
  let result = document;
  // eslint-disable-next-line no-restricted-syntax -- Position tracking through loop iterations
  let currentParagraphIndex = clampedPosition.paragraphIndex;
  // eslint-disable-next-line no-restricted-syntax -- Offset tracking through loop iterations
  let currentOffset = clampedPosition.charOffset;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const currentParagraph = getParagraphAtIndex(result, currentParagraphIndex);

    if (!currentParagraph) {
      break;
    }

    if (i === 0) {
      // First line - insert at position then split
      const withText = insertText(currentParagraph, currentOffset, line, properties);
      const newOffset = currentOffset + line.length;

      if (i < lines.length - 1) {
        // Need to split for next line
        const [before, after] = splitParagraph(withText, newOffset);
        result = replaceParagraphWithMultiple(result, currentParagraphIndex, [before, after]);
        currentParagraphIndex++;
        currentOffset = 0;
      } else {
        result = updateParagraphInDocument(result, currentParagraphIndex, withText);
        currentOffset = newOffset;
      }
    } else if (i === lines.length - 1) {
      // Last line - just insert at start
      const withText = insertText(currentParagraph, 0, line, properties);
      result = updateParagraphInDocument(result, currentParagraphIndex, withText);
      currentOffset = line.length;
    } else {
      // Middle line - insert and split
      const withText = insertText(currentParagraph, 0, line, properties);
      const [before, after] = splitParagraph(withText, line.length);
      result = replaceParagraphWithMultiple(result, currentParagraphIndex, [before, after]);
      currentParagraphIndex++;
      currentOffset = 0;
    }
  }

  return {
    document: result,
    newPosition: {
      paragraphIndex: currentParagraphIndex,
      charOffset: currentOffset,
    },
  };
}

/**
 * Replace content in a range with new text.
 *
 * @returns Updated document and new cursor position.
 */
export function replaceRange(
  document: DocxDocument,
  range: TextRange,
  text: string,
  properties?: DocxRunProperties,
): { document: DocxDocument; newPosition: TextPosition } {
  const normalized = normalizeRange(range);

  // Delete existing content
  const afterDelete = deleteRange(document, range);

  // Insert new text at start position
  return insertTextAtPosition(afterDelete, normalized.start, text, properties);
}

/**
 * Apply formatting to a range.
 *
 * @returns Updated document.
 */
export function formatRange(
  document: DocxDocument,
  range: TextRange,
  properties: Partial<DocxRunProperties>,
): DocxDocument {
  const normalized = normalizeRange(range);
  const { start, end } = normalized;

  if (isRangeCollapsed(normalized)) {
    return document;
  }

  if (start.paragraphIndex === end.paragraphIndex) {
    // Single paragraph
    const paragraph = getParagraphAtIndex(document, start.paragraphIndex);
    if (!paragraph) {
      return document;
    }

    const formatted = applyFormattingToRange(
      paragraph,
      start.charOffset,
      end.charOffset,
      properties,
    );

    return updateParagraphInDocument(document, start.paragraphIndex, formatted);
  }

  // Multi-paragraph formatting
  // eslint-disable-next-line no-restricted-syntax -- Multi-step document mutation
  let result = document;

  // Format first paragraph
  const firstParagraph = getParagraphAtIndex(result, start.paragraphIndex);
  if (firstParagraph) {
    const formatted = applyFormattingToRange(
      firstParagraph,
      start.charOffset,
      getParagraphText(firstParagraph).length,
      properties,
    );
    result = updateParagraphInDocument(result, start.paragraphIndex, formatted);
  }

  // Format middle paragraphs
  for (let i = start.paragraphIndex + 1; i < end.paragraphIndex; i++) {
    const paragraph = getParagraphAtIndex(result, i);
    if (paragraph) {
      const formatted = applyFormattingToRange(
        paragraph,
        0,
        getParagraphText(paragraph).length,
        properties,
      );
      result = updateParagraphInDocument(result, i, formatted);
    }
  }

  // Format last paragraph
  const lastParagraph = getParagraphAtIndex(result, end.paragraphIndex);
  if (lastParagraph) {
    const formatted = applyFormattingToRange(lastParagraph, 0, end.charOffset, properties);
    result = updateParagraphInDocument(result, end.paragraphIndex, formatted);
  }

  return result;
}

// =============================================================================
// Paragraph Operations
// =============================================================================

/**
 * Split paragraph at a position.
 *
 * @returns Updated document with new paragraph.
 */
export function splitParagraphAtPosition(
  document: DocxDocument,
  position: TextPosition,
): DocxDocument {
  const paragraph = getParagraphAtIndex(document, position.paragraphIndex);
  if (!paragraph) {
    return document;
  }

  const [before, after] = splitParagraph(paragraph, position.charOffset);

  return replaceParagraphWithMultiple(document, position.paragraphIndex, [before, after]);
}

/**
 * Merge paragraph with the next paragraph.
 *
 * @returns Updated document.
 */
export function mergeParagraphWithNext(
  document: DocxDocument,
  paragraphIndex: number,
): DocxDocument {
  const current = getParagraphAtIndex(document, paragraphIndex);
  const next = getParagraphAtIndex(document, paragraphIndex + 1);

  if (!current || !next) {
    return document;
  }

  const merged = mergeParagraphs(current, next);

  const newContent = [
    ...document.body.content.slice(0, paragraphIndex),
    merged,
    ...document.body.content.slice(paragraphIndex + 2),
  ];

  return {
    ...document,
    body: {
      ...document.body,
      content: newContent,
    },
  };
}

/**
 * Insert a new paragraph at a position.
 *
 * @returns Updated document.
 */
export function insertParagraphAtIndex(
  document: DocxDocument,
  index: number,
  paragraph?: DocxParagraph,
): DocxDocument {
  const newParagraph = paragraph ?? createParagraph();

  const newContent = [
    ...document.body.content.slice(0, index),
    newParagraph,
    ...document.body.content.slice(index),
  ];

  return {
    ...document,
    body: {
      ...document.body,
      content: newContent,
    },
  };
}

/**
 * Delete a paragraph at an index.
 *
 * @returns Updated document.
 */
export function deleteParagraphAtIndex(document: DocxDocument, index: number): DocxDocument {
  const newContent = document.body.content.filter((_, i) => i !== index);

  return {
    ...document,
    body: {
      ...document.body,
      content: newContent,
    },
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Update a paragraph in the document.
 */
function updateParagraphInDocument(
  document: DocxDocument,
  index: number,
  paragraph: DocxParagraph,
): DocxDocument {
  const newContent = document.body.content.map((content, i) =>
    i === index ? paragraph : content,
  );

  return {
    ...document,
    body: {
      ...document.body,
      content: newContent,
    },
  };
}

/**
 * Replace a paragraph with multiple paragraphs.
 */
function replaceParagraphWithMultiple(
  document: DocxDocument,
  index: number,
  paragraphs: DocxParagraph[],
): DocxDocument {
  const newContent = [
    ...document.body.content.slice(0, index),
    ...paragraphs,
    ...document.body.content.slice(index + 1),
  ];

  return {
    ...document,
    body: {
      ...document.body,
      content: newContent,
    },
  };
}

// =============================================================================
// Selection-Based Operations
// =============================================================================

/**
 * Delete the character before a position (backspace).
 *
 * @returns Updated document and new cursor position.
 */
export function deleteBackward(
  document: DocxDocument,
  position: TextPosition,
): { document: DocxDocument; newPosition: TextPosition } {
  if (position.charOffset > 0) {
    // Delete within paragraph
    const range: TextRange = {
      start: { ...position, charOffset: position.charOffset - 1 },
      end: position,
    };
    return {
      document: deleteRange(document, range),
      newPosition: { ...position, charOffset: position.charOffset - 1 },
    };
  }

  if (position.paragraphIndex > 0) {
    // Merge with previous paragraph
    const prevIndex = position.paragraphIndex - 1;
    const prevParagraph = getParagraphAtIndex(document, prevIndex);
    if (!prevParagraph) {
      return { document, newPosition: position };
    }

    const cursorOffset = getParagraphText(prevParagraph).length;
    const merged = mergeParagraphWithNext(document, prevIndex);

    return {
      document: merged,
      newPosition: { paragraphIndex: prevIndex, charOffset: cursorOffset },
    };
  }

  // At document start
  return { document, newPosition: position };
}

/**
 * Delete the character after a position (delete key).
 *
 * @returns Updated document (position stays the same).
 */
export function deleteForward(
  document: DocxDocument,
  position: TextPosition,
): DocxDocument {
  const paragraph = getParagraphAtIndex(document, position.paragraphIndex);
  if (!paragraph) {
    return document;
  }

  const text = getParagraphText(paragraph);

  if (position.charOffset < text.length) {
    // Delete within paragraph
    const range: TextRange = {
      start: position,
      end: { ...position, charOffset: position.charOffset + 1 },
    };
    return deleteRange(document, range);
  }

  // At end of paragraph - merge with next
  if (position.paragraphIndex < document.body.content.length - 1) {
    return mergeParagraphWithNext(document, position.paragraphIndex);
  }

  // At document end
  return document;
}

/**
 * Insert a paragraph break (enter key).
 *
 * @returns Updated document and new cursor position.
 */
export function insertParagraphBreak(
  document: DocxDocument,
  position: TextPosition,
): { document: DocxDocument; newPosition: TextPosition } {
  const newDocument = splitParagraphAtPosition(document, position);

  return {
    document: newDocument,
    newPosition: {
      paragraphIndex: position.paragraphIndex + 1,
      charOffset: 0,
    },
  };
}
