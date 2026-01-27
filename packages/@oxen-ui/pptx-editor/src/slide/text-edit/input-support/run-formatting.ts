/**
 * @file Run formatting operations
 *
 * Provides algorithms for applying text formatting to selections.
 * Handles run splitting, property merging, and defragmentation.
 */

import type {
  TextBody,
  Paragraph,
  TextRun,
  RunProperties,
  ParagraphProperties,
  RegularRun,
} from "@oxen/pptx/domain/text";
import type { TextSelection, CursorPosition } from "./cursor";
import { normalizeSelection, isSamePosition } from "./cursor";
import { mergeRunProperties, areRunPropertiesEqual } from "../../../editors/text/mixed-properties";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of applying formatting to a TextBody.
 */
export type FormatOperationResult = {
  readonly textBody: TextBody;
  readonly changed: boolean;
};

// =============================================================================
// Run Length Utilities
// =============================================================================

/**
 * Get the character length of a text run.
 */
function getRunLength(run: TextRun): number {
  switch (run.type) {
    case "text":
      return run.text.length;
    case "break":
      return 1;
    case "field":
      return run.text.length;
  }
}

/**
 * Get total character length of a paragraph.
 */
function getParagraphLength(paragraph: Paragraph): number {
  return paragraph.runs.reduce((sum, run) => sum + getRunLength(run), 0);
}

// =============================================================================
// Run Splitting
// =============================================================================

/**
 * Split a text run at specified offsets.
 * Returns up to 3 parts: before, selected, after.
 */
function splitTextRunAtSelection(
  run: RegularRun,
  runStart: number,
  runEnd: number,
  selStart: number,
  selEnd: number,
  propertyUpdate: Partial<RunProperties>
): TextRun[] {
  const result: TextRun[] = [];
  const text = run.text;

  // Calculate split points relative to run text
  const splitStartInRun = Math.max(0, selStart - runStart);
  const splitEndInRun = Math.min(text.length, selEnd - runStart);

  // Part 1: Before selection (unchanged)
  if (splitStartInRun > 0) {
    result.push({
      type: "text",
      text: text.substring(0, splitStartInRun),
      properties: run.properties,
    });
  }

  // Part 2: Selected portion (with merged properties)
  if (splitEndInRun > splitStartInRun) {
    const selectedText = text.substring(splitStartInRun, splitEndInRun);
    const mergedProps = mergeRunProperties(run.properties, propertyUpdate);
    result.push({
      type: "text",
      text: selectedText,
      properties: Object.keys(mergedProps).length > 0 ? mergedProps : undefined,
    });
  }

  // Part 3: After selection (unchanged)
  if (splitEndInRun < text.length) {
    result.push({
      type: "text",
      text: text.substring(splitEndInRun),
      properties: run.properties,
    });
  }

  return result;
}

/**
 * Apply formatting to a single run based on selection overlap.
 */
function applyFormatToRun(
  run: TextRun,
  runStart: number,
  runEnd: number,
  selStart: number,
  selEnd: number,
  propertyUpdate: Partial<RunProperties>
): TextRun[] {
  // Case 1: Run entirely before selection
  if (runEnd <= selStart) {
    return [run];
  }

  // Case 2: Run entirely after selection
  if (runStart >= selEnd) {
    return [run];
  }

  // Case 3: Run fully contained in selection
  if (runStart >= selStart && runEnd <= selEnd) {
    const mergedProps = mergeRunProperties(run.properties, propertyUpdate);
    return [{
      ...run,
      properties: Object.keys(mergedProps).length > 0 ? mergedProps : undefined,
    }];
  }

  // Case 4: Selection fully within run (needs splitting)
  // Case 5: Partial overlap at start or end (needs splitting)
  switch (run.type) {
    case "text":
      return splitTextRunAtSelection(run, runStart, runEnd, selStart, selEnd, propertyUpdate);

    case "break":
      // Break runs are atomic - if within selection, apply formatting
      if (runStart >= selStart && runEnd <= selEnd) {
        const mergedProps = mergeRunProperties(run.properties, propertyUpdate);
        return [{
          ...run,
          properties: Object.keys(mergedProps).length > 0 ? mergedProps : undefined,
        }];
      }
      return [run];

    case "field":
      // Field runs are atomic - if any overlap, apply to entire field
      if (runStart < selEnd && runEnd > selStart) {
        const mergedProps = mergeRunProperties(run.properties, propertyUpdate);
        return [{
          ...run,
          properties: Object.keys(mergedProps).length > 0 ? mergedProps : undefined,
        }];
      }
      return [run];
  }
}

// =============================================================================
// Run Merging (Defragmentation)
// =============================================================================

/**
 * Check if two runs can be merged (same type, same properties).
 */
function canMergeRuns(a: TextRun, b: TextRun): boolean {
  // Only merge text runs
  if (a.type !== "text" || b.type !== "text") {
    return false;
  }

  return areRunPropertiesEqual(a.properties, b.properties);
}

/**
 * Merge adjacent runs with identical properties.
 */
export function mergeAdjacentRuns(runs: readonly TextRun[]): TextRun[] {
  if (runs.length === 0) {
    return [];
  }

  const result: TextRun[] = [];
  // eslint-disable-next-line no-restricted-syntax -- mutation for performance
  let pending = runs[0];

  for (let i = 1; i < runs.length; i++) {
    const current = runs[i];

    if (canMergeRuns(pending, current)) {
      // Merge text content
      pending = {
        type: "text",
        text: (pending as RegularRun).text + (current as RegularRun).text,
        properties: pending.properties,
      };
    } else {
      result.push(pending);
      pending = current;
    }
  }

  result.push(pending);
  return result;
}

// =============================================================================
// Paragraph Processing
// =============================================================================

/**
 * Apply formatting to runs within a paragraph.
 */
function applyFormatToParagraphRuns(
  paragraph: Paragraph,
  selStart: number,
  selEnd: number,
  propertyUpdate: Partial<RunProperties>
): Paragraph {
  const newRuns: TextRun[] = [];
  // eslint-disable-next-line no-restricted-syntax -- tracking offset
  let currentOffset = 0;

  for (const run of paragraph.runs) {
    const runLength = getRunLength(run);
    const runStart = currentOffset;
    const runEnd = currentOffset + runLength;

    const processedRuns = applyFormatToRun(
      run,
      runStart,
      runEnd,
      selStart,
      selEnd,
      propertyUpdate
    );
    newRuns.push(...processedRuns);

    currentOffset += runLength;
  }

  // Merge adjacent runs with identical properties
  const mergedRuns = mergeAdjacentRuns(newRuns);

  return {
    properties: paragraph.properties,
    runs: mergedRuns,
    endProperties: paragraph.endProperties,
  };
}

/**
 * Process a single paragraph for formatting application.
 */
function processParagraphForFormat(
  paragraph: Paragraph,
  paragraphIndex: number,
  selection: TextSelection,
  propertyUpdate: Partial<RunProperties>
): Paragraph {
  const { start, end } = selection;

  // Check if paragraph is affected
  if (paragraphIndex < start.paragraphIndex || paragraphIndex > end.paragraphIndex) {
    return paragraph;
  }

  // Determine selection bounds within this paragraph
  const paragraphLength = getParagraphLength(paragraph);

  const selStartInPara =
    paragraphIndex === start.paragraphIndex ? start.charOffset : 0;

  const selEndInPara =
    paragraphIndex === end.paragraphIndex ? end.charOffset : paragraphLength;

  // No selection in this paragraph
  if (selStartInPara >= selEndInPara) {
    return paragraph;
  }

  return applyFormatToParagraphRuns(paragraph, selStartInPara, selEndInPara, propertyUpdate);
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Apply run properties to a text selection.
 * Handles run splitting and merging as needed.
 *
 * @param textBody - Original TextBody (immutable)
 * @param selection - Text selection range
 * @param propertyUpdate - Partial RunProperties to apply/merge
 * @returns New TextBody with formatting applied
 */
export function applyRunPropertiesToSelection(
  textBody: TextBody,
  selection: TextSelection,
  propertyUpdate: Partial<RunProperties>
): TextBody {
  // Handle empty selection
  if (isSamePosition(selection.start, selection.end)) {
    return textBody;
  }

  // Handle empty update
  if (Object.keys(propertyUpdate).length === 0) {
    return textBody;
  }

  const normalized = normalizeSelection(selection);

  const newParagraphs = textBody.paragraphs.map((paragraph, pIdx) =>
    processParagraphForFormat(paragraph, pIdx, normalized, propertyUpdate)
  );

  return {
    bodyProperties: textBody.bodyProperties,
    paragraphs: newParagraphs,
  };
}

/**
 * Apply paragraph properties to selected paragraphs.
 *
 * @param textBody - Original TextBody (immutable)
 * @param paragraphIndices - Indices of paragraphs to update
 * @param propertyUpdate - Partial ParagraphProperties to apply/merge
 * @returns New TextBody with formatting applied
 */
export function applyParagraphPropertiesToSelection(
  textBody: TextBody,
  paragraphIndices: readonly number[],
  propertyUpdate: Partial<ParagraphProperties>
): TextBody {
  if (paragraphIndices.length === 0 || Object.keys(propertyUpdate).length === 0) {
    return textBody;
  }

  const indexSet = new Set(paragraphIndices);

  const newParagraphs = textBody.paragraphs.map((paragraph, pIdx) => {
    if (!indexSet.has(pIdx)) {
      return paragraph;
    }

    return {
      ...paragraph,
      properties: {
        ...paragraph.properties,
        ...propertyUpdate,
      },
    };
  });

  return {
    bodyProperties: textBody.bodyProperties,
    paragraphs: newParagraphs,
  };
}

/**
 * Normalize an entire TextBody by merging adjacent runs with identical properties.
 */
export function normalizeTextBody(textBody: TextBody): TextBody {
  const newParagraphs = textBody.paragraphs.map((paragraph) => ({
    ...paragraph,
    runs: mergeAdjacentRuns(paragraph.runs),
  }));

  return {
    bodyProperties: textBody.bodyProperties,
    paragraphs: newParagraphs,
  };
}

/**
 * Toggle a boolean run property in a selection.
 * If all runs have the property true, sets to false (or removes).
 * Otherwise, sets all to true.
 *
 * @param textBody - Original TextBody
 * @param selection - Text selection range
 * @param propertyKey - The boolean property key (e.g., "bold", "italic")
 * @param currentValue - The current extracted value (if same across selection)
 * @returns New TextBody with toggled property
 */
export function toggleRunProperty(
  textBody: TextBody,
  selection: TextSelection,
  propertyKey: keyof RunProperties,
  currentValue: boolean | undefined
): TextBody {
  // If current value is true, turn it off; otherwise turn it on
  const newValue = currentValue === true ? undefined : true;

  return applyRunPropertiesToSelection(textBody, selection, {
    [propertyKey]: newValue,
  } as Partial<RunProperties>);
}

/**
 * Clear specific run properties from a selection.
 * Removes the properties entirely (inherits from default).
 *
 * @param textBody - Original TextBody
 * @param selection - Text selection range
 * @param propertyKeys - Keys of properties to clear
 * @returns New TextBody with properties cleared
 */
export function clearRunProperties(
  textBody: TextBody,
  selection: TextSelection,
  propertyKeys: readonly (keyof RunProperties)[]
): TextBody {
  const clearUpdate: Partial<RunProperties> = {};
  for (const key of propertyKeys) {
    (clearUpdate as Record<string, undefined>)[key] = undefined;
  }

  return applyRunPropertiesToSelection(textBody, selection, clearUpdate);
}
