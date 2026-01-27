/**
 * @file Run operations
 *
 * Utilities for splitting and merging DocxRun structures.
 */

import type { DocxParagraphContent } from "@oxen/docx/domain/paragraph";
import type { DocxRun } from "@oxen/docx/domain/run";
import { getRunPlainText } from "./run-plain-text";
import { areRunPropertiesEqual } from "./run-properties";

// =============================================================================
// Run Splitting
// =============================================================================

/**
 * Split a text run at a specific character offset.
 *
 * @param run - The run to split
 * @param offset - The character offset to split at
 * @returns A tuple of [before, after] runs
 */
export function splitRunAtOffset(run: DocxRun, offset: number): [DocxRun, DocxRun] {
  const text = getRunPlainText(run);
  const safeOffset = Math.min(Math.max(offset, 0), text.length);

  const beforeText = text.slice(0, safeOffset);
  const afterText = text.slice(safeOffset);

  const beforeRun: DocxRun = {
    type: "run",
    properties: run.properties,
    content: beforeText.length > 0 ? [{ type: "text", value: beforeText }] : [],
  };

  const afterRun: DocxRun = {
    type: "run",
    properties: run.properties,
    content: afterText.length > 0 ? [{ type: "text", value: afterText }] : [],
  };

  return [beforeRun, afterRun];
}

// =============================================================================
// Run Merging
// =============================================================================

/**
 * Flush current run and append new item.
 */
function flushAndAppend(
  result: DocxParagraphContent[],
  currentRun: DocxRun | null,
  item: DocxParagraphContent,
): DocxParagraphContent[] {
  if (currentRun !== null) {
    return [...result, currentRun, item];
  }
  return [...result, item];
}

/**
 * Merge adjacent runs with the same formatting.
 *
 * This consolidates consecutive runs with identical properties into single runs
 * to reduce DOM complexity and improve rendering performance.
 *
 * @param content - Array of paragraph content items
 * @returns New array with merged runs
 */
export function mergeAdjacentRuns(content: readonly DocxParagraphContent[]): DocxParagraphContent[] {
  if (content.length === 0) {
    return [];
  }

  type AccumulatorState = {
    readonly result: DocxParagraphContent[];
    readonly currentRun: DocxRun | null;
  };

  const final = content.reduce<AccumulatorState>(
    (acc, item) => {
      if (item.type !== "run") {
        // Non-run content: flush current run and add item
        const newResult = flushAndAppend(acc.result, acc.currentRun, item);
        return { result: newResult, currentRun: null };
      }

      if (acc.currentRun === null) {
        // Start new run
        return { result: acc.result, currentRun: { ...item, content: [...item.content] } };
      }

      // Check if we can merge
      if (areRunPropertiesEqual(acc.currentRun.properties, item.properties)) {
        // Merge content
        const mergedRun: DocxRun = {
          ...acc.currentRun,
          content: [...acc.currentRun.content, ...item.content],
        };
        return { result: acc.result, currentRun: mergedRun };
      }

      // Different formatting: flush and start new
      return {
        result: [...acc.result, acc.currentRun],
        currentRun: { ...item, content: [...item.content] },
      };
    },
    { result: [], currentRun: null },
  );

  // Flush remaining run
  if (final.currentRun !== null) {
    return [...final.result, final.currentRun];
  }

  return final.result;
}
