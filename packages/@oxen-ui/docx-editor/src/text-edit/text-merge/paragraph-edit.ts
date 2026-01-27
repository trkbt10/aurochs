/**
 * @file Paragraph text editing operations
 *
 * Character-level editing operations for a single paragraph.
 * These operations preserve inline formatting during text insertion and deletion.
 */

import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import type { DocxRun, DocxRunProperties } from "@oxen/docx/domain/run";
import { getParagraphPlainText } from "./run-plain-text";
import { getBaseRunProperties, getRunPropertiesAtPosition } from "./run-properties";
import {
  buildCharacterPropertiesMap,
  findCommonPrefixSuffix,
  createRunsFromPropertiesMap,
} from "./character-mapping";

// =============================================================================
// Merge Text Into Paragraph (Format-Preserving)
// =============================================================================

/**
 * Merge plain text into a paragraph while preserving inline formatting.
 *
 * This function replaces the text content of the paragraph with the new text,
 * while preserving the formatting from the original runs where the text is unchanged.
 *
 * Algorithm:
 * 1. Build character-to-properties map from original paragraph
 * 2. Find common prefix and suffix between original and new text
 * 3. Preserve formatting in unchanged regions (prefix and suffix)
 * 4. Apply formatting from edit point to changed region
 * 5. Create runs by grouping characters with same properties
 *
 * @param paragraph - The original paragraph
 * @param plainText - The new plain text to merge in
 * @returns A new paragraph with the merged text
 */
export function mergeTextIntoParagraph(paragraph: DocxParagraph, plainText: string): DocxParagraph {
  if (plainText.length === 0) {
    return {
      type: "paragraph",
      properties: paragraph.properties,
      content: [],
    };
  }

  // Build character-to-properties map from original paragraph
  const originalMap = buildCharacterPropertiesMap(paragraph);
  const originalText = getParagraphPlainText(paragraph);
  const defaultProps = getBaseRunProperties(paragraph);

  // If text is unchanged, return original paragraph
  if (plainText === originalText) {
    return paragraph;
  }

  // Find the common prefix and suffix lengths
  const { prefixLen, suffixLen } = findCommonPrefixSuffix(originalText, plainText);

  // Build new properties map by preserving formatting from unchanged regions
  const newMap: (DocxRunProperties | undefined)[] = [];

  // Copy prefix properties (unchanged region at start)
  for (let i = 0; i < prefixLen; i++) {
    newMap.push(originalMap[i]);
  }

  // For the changed middle section, use properties from the edit point
  const editStartProps = originalMap[prefixLen] ?? defaultProps;
  const changedLength = plainText.length - prefixLen - suffixLen;
  for (let i = 0; i < changedLength; i++) {
    newMap.push(editStartProps);
  }

  // Copy suffix properties (unchanged region at end)
  const originalSuffixStart = originalText.length - suffixLen;
  for (let i = 0; i < suffixLen; i++) {
    newMap.push(originalMap[originalSuffixStart + i]);
  }

  // Create runs from the new properties map
  const newRuns = createRunsFromPropertiesMap(plainText, newMap, defaultProps);

  return {
    type: "paragraph",
    properties: paragraph.properties,
    content: newRuns,
  };
}

// =============================================================================
// Insert Text at Position
// =============================================================================

/**
 * Insert text at a specific character offset in a paragraph.
 *
 * The inserted text inherits the formatting from the position where it's inserted.
 * This preserves the surrounding formatting context.
 *
 * @param paragraph - The paragraph to insert into
 * @param offset - The character offset to insert at
 * @param text - The text to insert
 * @returns A new paragraph with the text inserted
 */
export function insertTextAtOffset(paragraph: DocxParagraph, offset: number, text: string): DocxParagraph {
  const currentText = getParagraphPlainText(paragraph);
  const newText = currentText.slice(0, offset) + text + currentText.slice(offset);

  return mergeTextIntoParagraph(paragraph, newText);
}

// =============================================================================
// Delete Text Range
// =============================================================================

/**
 * Delete text at a specific range in a paragraph.
 *
 * Preserves formatting of the remaining text.
 *
 * @param paragraph - The paragraph to delete from
 * @param start - Start offset (inclusive)
 * @param end - End offset (exclusive)
 * @returns A new paragraph with the text deleted
 */
export function deleteTextRange(paragraph: DocxParagraph, start: number, end: number): DocxParagraph {
  const currentText = getParagraphPlainText(paragraph);
  const newText = currentText.slice(0, start) + currentText.slice(end);

  if (newText.length === 0) {
    return {
      type: "paragraph",
      properties: paragraph.properties,
      content: [],
    };
  }

  return mergeTextIntoParagraph(paragraph, newText);
}

// =============================================================================
// Replace Text Range
// =============================================================================

/**
 * Replace text at a specific range in a paragraph.
 *
 * The replacement text inherits the formatting from the start of the range.
 *
 * @param paragraph - The paragraph to modify
 * @param start - Start offset (inclusive)
 * @param end - End offset (exclusive)
 * @param replacement - The replacement text
 * @returns A new paragraph with the text replaced
 */
export function replaceTextRange(
  paragraph: DocxParagraph,
  start: number,
  end: number,
  replacement: string,
): DocxParagraph {
  const currentText = getParagraphPlainText(paragraph);
  const newText = currentText.slice(0, start) + replacement + currentText.slice(end);

  return mergeTextIntoParagraph(paragraph, newText);
}
