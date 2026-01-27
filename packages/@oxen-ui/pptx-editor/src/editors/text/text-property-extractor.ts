/**
 * @file Text property extraction utilities
 *
 * Extracts text properties based on cursor position, selection, or entire text body.
 * Handles Mixed property resolution for multi-run/multi-paragraph selections.
 */

import type { TextBody, Paragraph, TextRun, RunProperties, ParagraphProperties } from "@oxen/pptx/domain/text";
import type { CursorPosition, TextSelection } from "../../slide/text-edit";
import { normalizeSelection, isSamePosition } from "../../slide/text-edit";
import {
  extractMixedRunProperties,
  extractMixedParagraphProperties,
  type MixedRunProperties,
  type MixedParagraphProperties,
} from "./mixed-properties";

// =============================================================================
// Types
// =============================================================================

/**
 * Context for text selection state.
 */
export type TextSelectionContext =
  | { readonly type: "none" }
  | { readonly type: "cursor"; readonly position: CursorPosition }
  | { readonly type: "selection"; readonly selection: TextSelection }
  | { readonly type: "shape" };

/**
 * Range within a single run.
 */
export type RunRange = {
  readonly paragraphIndex: number;
  readonly runIndex: number;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly run: TextRun;
};

/**
 * Result of extracting text properties.
 */
export type ExtractedTextProperties = {
  readonly paragraphProperties: MixedParagraphProperties;
  readonly runProperties: MixedRunProperties;
  readonly paragraphIndices: readonly number[];
  readonly runRanges: readonly RunRange[];
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
// Run Finding
// =============================================================================

/**
 * Find the run at a specific character offset within a paragraph.
 * Returns the run and the offset within that run.
 */
function findRunAtOffset(
  paragraph: Paragraph,
  offset: number
): { runIndex: number; offsetInRun: number } | undefined {
  // eslint-disable-next-line no-restricted-syntax -- performance-critical iteration
  let currentOffset = 0;

  for (const [runIndex, run] of paragraph.runs.entries()) {
    const runLength = getRunLength(run);

    if (offset < currentOffset + runLength) {
      return { runIndex, offsetInRun: offset - currentOffset };
    }

    // Handle cursor at end of run
    if (offset === currentOffset + runLength && runIndex === paragraph.runs.length - 1) {
      return { runIndex, offsetInRun: runLength };
    }

    currentOffset += runLength;
  }

  // Offset beyond paragraph - return last run
  if (paragraph.runs.length > 0) {
    const lastRunIndex = paragraph.runs.length - 1;
    return { runIndex: lastRunIndex, offsetInRun: getRunLength(paragraph.runs[lastRunIndex]) };
  }

  return undefined;
}

/**
 * Get all runs that intersect with a selection range within a paragraph.
 */
function getRunRangesInParagraph(
  paragraph: Paragraph,
  paragraphIndex: number,
  startOffset: number,
  endOffset: number
): RunRange[] {
  const ranges: RunRange[] = [];
  // eslint-disable-next-line no-restricted-syntax -- performance-critical iteration
  let currentOffset = 0;

  for (const [runIndex, run] of paragraph.runs.entries()) {
    const runLength = getRunLength(run);
    const runStart = currentOffset;
    const runEnd = currentOffset + runLength;

    // Check if run intersects with selection
    if (startOffset < runEnd && endOffset > runStart) {
      const rangeStart = Math.max(startOffset - runStart, 0);
      const rangeEnd = Math.min(endOffset - runStart, runLength);

      ranges.push({
        paragraphIndex,
        runIndex,
        startOffset: rangeStart,
        endOffset: rangeEnd,
        run,
      });
    }

    currentOffset += runLength;
  }

  return ranges;
}

// =============================================================================
// Property Extraction
// =============================================================================

/**
 * Get runs that fall within a text selection.
 */
export function getRunsInSelection(
  textBody: TextBody,
  selection: TextSelection
): readonly RunRange[] {
  const normalized = normalizeSelection(selection);
  const { start, end } = normalized;
  const ranges: RunRange[] = [];

  for (let pIdx = start.paragraphIndex; pIdx <= end.paragraphIndex; pIdx++) {
    const paragraph = textBody.paragraphs[pIdx];
    if (!paragraph) {
      continue;
    }

    const paragraphLength = getParagraphLength(paragraph);

    // Determine start/end offsets within this paragraph
    const localStart = pIdx === start.paragraphIndex ? start.charOffset : 0;
    const localEnd = pIdx === end.paragraphIndex ? end.charOffset : paragraphLength;

    // Skip empty selections in paragraph
    if (localStart >= localEnd) {
      continue;
    }

    const paragraphRanges = getRunRangesInParagraph(paragraph, pIdx, localStart, localEnd);
    ranges.push(...paragraphRanges);
  }

  return ranges;
}

/**
 * Get paragraph indices that fall within a text selection.
 */
export function getParagraphsInSelection(
  textBody: TextBody,
  selection: TextSelection
): readonly number[] {
  const normalized = normalizeSelection(selection);
  const { start, end } = normalized;
  const indices: number[] = [];

  for (let pIdx = start.paragraphIndex; pIdx <= end.paragraphIndex; pIdx++) {
    if (pIdx < textBody.paragraphs.length) {
      indices.push(pIdx);
    }
  }

  return indices;
}

/**
 * Get a selection range that covers the run at the cursor position.
 */
export function getSelectionForCursor(
  textBody: TextBody,
  position: CursorPosition
): TextSelection | undefined {
  const paragraph = textBody.paragraphs[position.paragraphIndex];
  if (!paragraph) {
    return undefined;
  }

  const result = paragraph.runs.reduce<{
    readonly offset: number;
    readonly selection: TextSelection | undefined;
  }>((acc, run, runIndex) => {
    if (acc.selection) {
      return acc;
    }
    const runLength = getRunLength(run);
    const runStart = acc.offset;
    const runEnd = acc.offset + runLength;
    const isLastRun = runIndex === paragraph.runs.length - 1;

    if (position.charOffset < runEnd || (position.charOffset === runEnd && isLastRun)) {
      return {
        offset: runEnd,
        selection: {
          start: { paragraphIndex: position.paragraphIndex, charOffset: runStart },
          end: { paragraphIndex: position.paragraphIndex, charOffset: runEnd },
        },
      };
    }

    return { offset: runEnd, selection: undefined };
  }, { offset: 0, selection: undefined });

  return result.selection;
}

/**
 * Extract properties at a specific cursor position.
 * Returns properties of the run at the cursor.
 */
export function extractPropertiesAtCursor(
  textBody: TextBody,
  position: CursorPosition
): ExtractedTextProperties {
  const { paragraphIndex, charOffset } = position;

  // Bounds check
  if (paragraphIndex >= textBody.paragraphs.length) {
    return createEmptyExtraction();
  }

  const paragraph = textBody.paragraphs[paragraphIndex];
  const runInfo = findRunAtOffset(paragraph, charOffset);

  if (!runInfo) {
    // Empty paragraph - use paragraph's default run properties
    return {
      paragraphProperties: extractMixedParagraphProperties([paragraph.properties]),
      runProperties: extractMixedRunProperties([paragraph.properties.defaultRunProperties]),
      paragraphIndices: [paragraphIndex],
      runRanges: [],
    };
  }

  const run = paragraph.runs[runInfo.runIndex];
  const runRange: RunRange = {
    paragraphIndex,
    runIndex: runInfo.runIndex,
    startOffset: runInfo.offsetInRun,
    endOffset: runInfo.offsetInRun,
    run,
  };

  return {
    paragraphProperties: extractMixedParagraphProperties([paragraph.properties]),
    runProperties: extractMixedRunProperties([run.properties]),
    paragraphIndices: [paragraphIndex],
    runRanges: [runRange],
  };
}

/**
 * Extract properties from a text selection range.
 * Returns Mixed for properties that differ across the selection.
 */
export function extractPropertiesFromSelection(
  textBody: TextBody,
  selection: TextSelection
): ExtractedTextProperties {
  // Handle empty selection (cursor only)
  if (isSamePosition(selection.start, selection.end)) {
    return extractPropertiesAtCursor(textBody, selection.start);
  }

  const runRanges = getRunsInSelection(textBody, selection);
  const paragraphIndices = getParagraphsInSelection(textBody, selection);

  // Collect all run properties
  const runPropertiesList: (RunProperties | undefined)[] = runRanges.map((r) => r.run.properties);

  // Collect all paragraph properties
  const paragraphPropertiesList: ParagraphProperties[] = paragraphIndices
    .map((idx) => textBody.paragraphs[idx]?.properties)
    .filter((p): p is ParagraphProperties => p !== undefined);

  return {
    paragraphProperties: extractMixedParagraphProperties(paragraphPropertiesList),
    runProperties: extractMixedRunProperties(runPropertiesList),
    paragraphIndices,
    runRanges,
  };
}

/**
 * Extract properties from entire text body.
 * Used when shape is selected but not in text edit mode.
 */
export function extractPropertiesFromTextBody(
  textBody: TextBody
): ExtractedTextProperties {
  // Collect all runs
  const allRanges: RunRange[] = [];
  const allParagraphProperties: ParagraphProperties[] = [];

  for (const [pIdx, paragraph] of textBody.paragraphs.entries()) {
    allParagraphProperties.push(paragraph.properties);

    for (const [rIdx, run] of paragraph.runs.entries()) {
      const runLength = getRunLength(run);
      allRanges.push({
        paragraphIndex: pIdx,
        runIndex: rIdx,
        startOffset: 0,
        endOffset: runLength,
        run,
      });
    }
  }

  const runPropertiesList = allRanges.map((r) => r.run.properties);
  const paragraphIndices = textBody.paragraphs.map((_, idx) => idx);

  return {
    paragraphProperties: extractMixedParagraphProperties(allParagraphProperties),
    runProperties: extractMixedRunProperties(runPropertiesList),
    paragraphIndices,
    runRanges: allRanges,
  };
}

/**
 * Main entry point: extract properties based on selection context.
 */
export function extractTextProperties(
  textBody: TextBody,
  context: TextSelectionContext
): ExtractedTextProperties {
  switch (context.type) {
    case "none":
      return createEmptyExtraction();

    case "cursor":
      return extractPropertiesAtCursor(textBody, context.position);

    case "selection":
      return extractPropertiesFromSelection(textBody, context.selection);

    case "shape":
      return extractPropertiesFromTextBody(textBody);
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create empty extraction result.
 */
function createEmptyExtraction(): ExtractedTextProperties {
  return {
    paragraphProperties: extractMixedParagraphProperties([]),
    runProperties: extractMixedRunProperties([]),
    paragraphIndices: [],
    runRanges: [],
  };
}

/**
 * Get the effective run properties at a cursor position.
 * Resolves inherited properties from paragraph defaults.
 */
export function getEffectiveRunPropertiesAtCursor(
  textBody: TextBody,
  position: CursorPosition
): RunProperties | undefined {
  const { paragraphIndex, charOffset } = position;

  if (paragraphIndex >= textBody.paragraphs.length) {
    return undefined;
  }

  const paragraph = textBody.paragraphs[paragraphIndex];
  const runInfo = findRunAtOffset(paragraph, charOffset);

  if (!runInfo) {
    // Empty paragraph - use default run properties
    return paragraph.properties.defaultRunProperties;
  }

  const run = paragraph.runs[runInfo.runIndex];
  const runProps = run.properties;
  const defaultProps = paragraph.properties.defaultRunProperties;

  // Merge: run properties override paragraph defaults
  if (!runProps && !defaultProps) {
    return undefined;
  }

  if (!runProps) {
    return defaultProps;
  }

  if (!defaultProps) {
    return runProps;
  }

  // Merge with run taking precedence
  return { ...defaultProps, ...runProps };
}
