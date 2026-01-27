/**
 * @file Run properties operations
 *
 * Utilities for comparing, extracting, and working with DocxRunProperties.
 */

import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import type { DocxRun, DocxRunProperties } from "@oxen/docx/domain/run";
import { getRunPlainText } from "./run-plain-text";

// =============================================================================
// Properties Comparison
// =============================================================================

/**
 * Check if two run properties are equal.
 *
 * Compares key formatting properties that affect visual appearance.
 *
 * @param a - First properties object
 * @param b - Second properties object
 * @returns true if properties are equal
 */
export function areRunPropertiesEqual(
  a: DocxRunProperties | undefined,
  b: DocxRunProperties | undefined,
): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }

  return (
    a.b === b.b &&
    a.i === b.i &&
    a.u?.val === b.u?.val &&
    a.strike === b.strike &&
    a.sz === b.sz &&
    a.rFonts?.ascii === b.rFonts?.ascii &&
    a.color?.val === b.color?.val &&
    a.vertAlign === b.vertAlign &&
    a.caps === b.caps &&
    a.smallCaps === b.smallCaps &&
    a.highlight === b.highlight
  );
}

// =============================================================================
// Properties Extraction
// =============================================================================

/**
 * Get the base run properties from a paragraph.
 *
 * Uses the properties from the first text run, or the paragraph's rPr if none found.
 *
 * @param paragraph - The paragraph to extract base properties from
 * @returns Base run properties or undefined
 */
export function getBaseRunProperties(paragraph: DocxParagraph): DocxRunProperties | undefined {
  for (const content of paragraph.content) {
    if (content.type === "run" && content.properties) {
      return content.properties;
    }
    if (content.type === "hyperlink") {
      for (const run of content.content) {
        if (run.properties) {
          return run.properties;
        }
      }
    }
  }
  return paragraph.properties?.rPr;
}

/**
 * Get the run properties at a specific character offset in a paragraph.
 *
 * This is used to determine what formatting to apply when inserting text.
 *
 * @param paragraph - The paragraph to search in
 * @param charOffset - The character offset
 * @returns The run properties at that position, or undefined
 */
export function getRunPropertiesAtPosition(
  paragraph: DocxParagraph,
  charOffset: number,
): DocxRunProperties | undefined {
  type AccumulatorState = {
    readonly currentOffset: number;
    readonly found: DocxRunProperties | undefined;
  };

  const result = paragraph.content.reduce<AccumulatorState>(
    (acc, content) => {
      if (acc.found !== undefined) {
        return acc;
      }

      if (content.type !== "run") {
        return acc;
      }

      const runLength = getRunPlainText(content).length;

      if (acc.currentOffset + runLength >= charOffset) {
        return { currentOffset: acc.currentOffset, found: content.properties };
      }

      return { currentOffset: acc.currentOffset + runLength, found: undefined };
    },
    { currentOffset: 0, found: undefined },
  );

  if (result.found !== undefined) {
    return result.found;
  }

  // Past end of paragraph - use last run's properties
  const runs = paragraph.content.filter((c): c is DocxRun => c.type === "run");
  if (runs.length > 0) {
    return runs[runs.length - 1].properties;
  }

  return paragraph.properties?.rPr;
}
