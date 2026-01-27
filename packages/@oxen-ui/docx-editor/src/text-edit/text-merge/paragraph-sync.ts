/**
 * @file Paragraph synchronization from plain text
 *
 * Utilities for synchronizing DOCX paragraphs with plain text input.
 *
 * IMPORTANT: This module is specifically for bulk text synchronization scenarios
 * where newlines represent paragraph boundaries (e.g., syncing a textarea).
 *
 * For character-level editing within a document, use paragraph-edit.ts instead.
 * Character-level editing does NOT treat newlines as paragraph separators.
 */

import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import { mergeTextIntoParagraph } from "./paragraph-edit";
import { getParagraphPlainText } from "./run-plain-text";

// =============================================================================
// Bulk Text Sync
// =============================================================================

/**
 * Apply plain text changes to an array of paragraphs.
 *
 * This function synchronizes a plain text string with an array of paragraphs,
 * where newlines in the text represent paragraph boundaries.
 *
 * USE CASE: Syncing a plain text textarea with DOCX paragraph structure.
 * In this context, newlines ARE paragraph separators.
 *
 * DO NOT USE for:
 * - Character-level editing (insertTextAtOffset, deleteTextRange)
 * - Inserting newline characters within a paragraph (use <w:br/> instead)
 * - Any editing operation that doesn't involve a plain text source
 *
 * @param originalParagraphs - The original paragraphs
 * @param newText - The new plain text (paragraphs separated by newlines)
 * @returns New array of paragraphs with the text applied
 */
export function syncParagraphsWithPlainText(
  originalParagraphs: readonly DocxParagraph[],
  newText: string,
): DocxParagraph[] {
  const lines = newText.split("\n");
  const result: DocxParagraph[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const originalPara = originalParagraphs[i];

    if (originalPara !== undefined) {
      // Reuse original paragraph with new text
      result.push(mergeTextIntoParagraph(originalPara, line));
    } else {
      // Create new paragraph based on last original paragraph's properties
      const templatePara = originalParagraphs[originalParagraphs.length - 1];
      if (templatePara !== undefined) {
        result.push(mergeTextIntoParagraph(templatePara, line));
      } else {
        // Create minimal paragraph
        result.push(createMinimalParagraph(line));
      }
    }
  }

  return result;
}

/**
 * @deprecated Use syncParagraphsWithPlainText instead.
 * This alias is kept for backwards compatibility.
 */
export const applyTextToParagraphs = syncParagraphsWithPlainText;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a minimal paragraph with the given text.
 *
 * @param text - The text content
 * @returns A minimal paragraph with no formatting
 */
function createMinimalParagraph(text: string): DocxParagraph {
  if (text.length === 0) {
    return { type: "paragraph", content: [] };
  }
  return {
    type: "paragraph",
    content: [
      {
        type: "run",
        content: [{ type: "text", value: text }],
      },
    ],
  };
}

// =============================================================================
// Plain Text Extraction
// =============================================================================

/**
 * Convert paragraphs to plain text with newlines as separators.
 *
 * This is the inverse of syncParagraphsWithPlainText.
 * Each paragraph becomes a line in the output.
 *
 * @param paragraphs - The paragraphs to convert
 * @returns Plain text with newlines separating paragraphs
 */
export function paragraphsToPlainText(paragraphs: readonly DocxParagraph[]): string {
  return paragraphs.map((p) => getParagraphPlainText(p)).join("\n");
}
