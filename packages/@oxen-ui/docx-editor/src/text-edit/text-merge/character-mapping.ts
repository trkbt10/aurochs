/**
 * @file Character-to-properties mapping
 *
 * Provides character-level tracking of run properties for preserving inline formatting
 * during text editing operations.
 */

import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import type { DocxRun, DocxRunProperties } from "@oxen/docx/domain/run";
import { getRunPlainText } from "./run-plain-text";
import { areRunPropertiesEqual } from "./run-properties";

// =============================================================================
// Character Properties Map
// =============================================================================

/**
 * Build a character-to-properties map from a paragraph.
 *
 * Each index corresponds to a character position and contains the run properties
 * for that character. This enables preserving inline formatting when editing text.
 *
 * @param paragraph - The paragraph to build a map from
 * @returns Array where each index contains the properties for that character position
 */
export function buildCharacterPropertiesMap(paragraph: DocxParagraph): (DocxRunProperties | undefined)[] {
  const map: (DocxRunProperties | undefined)[] = [];

  for (const content of paragraph.content) {
    if (content.type === "run") {
      const text = getRunPlainText(content);
      for (let i = 0; i < text.length; i++) {
        map.push(content.properties);
      }
    } else if (content.type === "hyperlink") {
      for (const run of content.content) {
        const text = getRunPlainText(run);
        for (let i = 0; i < text.length; i++) {
          map.push(run.properties);
        }
      }
    }
  }

  return map;
}

// =============================================================================
// Common Prefix/Suffix Detection
// =============================================================================

/**
 * Find the length of common prefix and suffix between two strings.
 *
 * Used to detect unchanged regions when text is modified, allowing preservation
 * of formatting in those regions.
 *
 * @param original - The original text
 * @param modified - The modified text
 * @returns Object with prefixLen and suffixLen
 */
export function findCommonPrefixSuffix(
  original: string,
  modified: string,
): { prefixLen: number; suffixLen: number } {
  // Find common prefix
  let prefixLen = 0;
  const minLen = Math.min(original.length, modified.length);
  while (prefixLen < minLen && original[prefixLen] === modified[prefixLen]) {
    prefixLen++;
  }

  // Find common suffix (but don't overlap with prefix)
  let suffixLen = 0;
  const maxSuffixLen = minLen - prefixLen;
  while (
    suffixLen < maxSuffixLen &&
    original[original.length - 1 - suffixLen] === modified[modified.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  return { prefixLen, suffixLen };
}

// =============================================================================
// Runs from Properties Map
// =============================================================================

/**
 * Create runs from text and a properties map.
 *
 * Groups consecutive characters with the same properties into runs.
 * This is the inverse operation of buildCharacterPropertiesMap.
 *
 * @param text - The text content
 * @param propertiesMap - Array of properties for each character position
 * @param defaultProperties - Default properties for positions not in the map
 * @returns Array of DocxRun with the text and properties
 */
export function createRunsFromPropertiesMap(
  text: string,
  propertiesMap: (DocxRunProperties | undefined)[],
  defaultProperties: DocxRunProperties | undefined,
): DocxRun[] {
  if (text.length === 0) {
    return [];
  }

  const runs: DocxRun[] = [];
  let currentText = "";
  let currentProps: DocxRunProperties | undefined = propertiesMap[0] ?? defaultProperties;

  for (let i = 0; i < text.length; i++) {
    const props = propertiesMap[i] ?? defaultProperties;

    if (areRunPropertiesEqual(props, currentProps)) {
      currentText += text[i];
    } else {
      // Flush current run
      if (currentText.length > 0) {
        runs.push({
          type: "run",
          properties: currentProps,
          content: [{ type: "text", value: currentText }],
        });
      }
      currentText = text[i];
      currentProps = props;
    }
  }

  // Flush remaining text
  if (currentText.length > 0) {
    runs.push({
      type: "run",
      properties: currentProps,
      content: [{ type: "text", value: currentText }],
    });
  }

  return runs;
}
