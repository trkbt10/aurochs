/**
 * @file Formatting operations
 *
 * Utilities for applying run properties (formatting) to text ranges.
 */

import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import type { DocxRun, DocxRunProperties } from "@oxen/docx/domain/run";
import { getParagraphPlainText } from "./run-plain-text";
import { getRunPropertiesAtPosition } from "./run-properties";

// =============================================================================
// Apply Formatting to Range
// =============================================================================

/**
 * Apply run properties to a range in a paragraph.
 *
 * Splits the paragraph into up to three runs:
 * 1. Text before the range (keeps original formatting)
 * 2. Text in the range (gets new formatting applied)
 * 3. Text after the range (keeps original formatting)
 *
 * @param paragraph - The paragraph to modify
 * @param start - Start offset (inclusive)
 * @param end - End offset (exclusive)
 * @param properties - The properties to apply
 * @returns A new paragraph with the formatting applied
 */
export function applyFormatToRange(
  paragraph: DocxParagraph,
  start: number,
  end: number,
  properties: Partial<DocxRunProperties>,
): DocxParagraph {
  const text = getParagraphPlainText(paragraph);
  const beforeText = text.slice(0, start);
  const selectedText = text.slice(start, end);
  const afterText = text.slice(end);

  const baseProperties = getRunPropertiesAtPosition(paragraph, start);
  const newRuns: DocxRun[] = [];

  if (beforeText.length > 0) {
    newRuns.push({
      type: "run",
      properties: baseProperties,
      content: [{ type: "text", value: beforeText }],
    });
  }

  if (selectedText.length > 0) {
    newRuns.push({
      type: "run",
      properties: { ...baseProperties, ...properties },
      content: [{ type: "text", value: selectedText }],
    });
  }

  if (afterText.length > 0) {
    newRuns.push({
      type: "run",
      properties: getRunPropertiesAtPosition(paragraph, end) ?? baseProperties,
      content: [{ type: "text", value: afterText }],
    });
  }

  return {
    type: "paragraph",
    properties: paragraph.properties,
    content: newRuns,
  };
}

// =============================================================================
// Toggle Formatting
// =============================================================================

/**
 * Toggle a boolean formatting property on a range.
 *
 * If the range already has the property, removes it.
 * If the range doesn't have the property, adds it.
 *
 * @param paragraph - The paragraph to modify
 * @param start - Start offset (inclusive)
 * @param end - End offset (exclusive)
 * @param property - The property key to toggle (e.g., 'b', 'i', 'strike')
 * @returns A new paragraph with the formatting toggled
 */
export function toggleFormatOnRange(
  paragraph: DocxParagraph,
  start: number,
  end: number,
  property: "b" | "i" | "strike" | "caps" | "smallCaps",
): DocxParagraph {
  const currentProps = getRunPropertiesAtPosition(paragraph, start);
  const currentValue = currentProps?.[property];

  // Toggle: if currently true, set to undefined; if undefined/false, set to true
  const newValue = currentValue ? undefined : true;

  return applyFormatToRange(paragraph, start, end, { [property]: newValue });
}

// =============================================================================
// Remove Formatting
// =============================================================================

/**
 * Remove all formatting from a range, keeping only plain text.
 *
 * @param paragraph - The paragraph to modify
 * @param start - Start offset (inclusive)
 * @param end - End offset (exclusive)
 * @returns A new paragraph with formatting removed from the range
 */
export function removeFormatFromRange(
  paragraph: DocxParagraph,
  start: number,
  end: number,
): DocxParagraph {
  const text = getParagraphPlainText(paragraph);
  const beforeText = text.slice(0, start);
  const selectedText = text.slice(start, end);
  const afterText = text.slice(end);

  const beforeProps = getRunPropertiesAtPosition(paragraph, start);
  const afterProps = getRunPropertiesAtPosition(paragraph, end);
  const newRuns: DocxRun[] = [];

  if (beforeText.length > 0) {
    newRuns.push({
      type: "run",
      properties: beforeProps,
      content: [{ type: "text", value: beforeText }],
    });
  }

  if (selectedText.length > 0) {
    // No properties = plain text
    newRuns.push({
      type: "run",
      content: [{ type: "text", value: selectedText }],
    });
  }

  if (afterText.length > 0) {
    newRuns.push({
      type: "run",
      properties: afterProps,
      content: [{ type: "text", value: afterText }],
    });
  }

  return {
    type: "paragraph",
    properties: paragraph.properties,
    content: newRuns,
  };
}
