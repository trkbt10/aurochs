/**
 * @file DOCX Paragraph Mutation Utilities
 *
 * Provides immutable mutation functions for paragraph-level operations.
 * All functions return new objects without modifying the originals.
 */

import type {
  DocxParagraph,
  DocxParagraphProperties,
  DocxParagraphContent,
  DocxParagraphSpacing,
  DocxParagraphIndent,
  DocxNumberingProperties,
} from "@oxen/docx/domain/paragraph";
import type { DocxRun, DocxRunProperties } from "@oxen/docx/domain/run";
import type { Twips, DocxNumId, DocxIlvl } from "@oxen/docx/domain/types";
import { createTextRun, getRunText, splitRun, mergeRuns, mergeRunProperties } from "../run/mutation";

// =============================================================================
// Paragraph Creation
// =============================================================================

/**
 * Create an empty paragraph with optional properties.
 */
export function createParagraph(properties?: DocxParagraphProperties): DocxParagraph {
  return {
    type: "paragraph",
    properties,
    content: [],
  };
}

/**
 * Create a paragraph with text content.
 */
export function createTextParagraph(
  text: string,
  paragraphProperties?: DocxParagraphProperties,
  runProperties?: DocxRunProperties,
): DocxParagraph {
  return {
    type: "paragraph",
    properties: paragraphProperties,
    content: [createTextRun(text, runProperties)],
  };
}

// =============================================================================
// Paragraph Content Mutations
// =============================================================================

/**
 * Set paragraph content, replacing all existing content.
 */
export function setParagraphContent(
  paragraph: DocxParagraph,
  content: readonly DocxParagraphContent[],
): DocxParagraph {
  return {
    ...paragraph,
    content,
  };
}

/**
 * Append content to a paragraph.
 */
export function appendParagraphContent(
  paragraph: DocxParagraph,
  content: DocxParagraphContent,
): DocxParagraph {
  return {
    ...paragraph,
    content: [...paragraph.content, content],
  };
}

/**
 * Prepend content to a paragraph.
 */
export function prependParagraphContent(
  paragraph: DocxParagraph,
  content: DocxParagraphContent,
): DocxParagraph {
  return {
    ...paragraph,
    content: [content, ...paragraph.content],
  };
}

/**
 * Insert content at a specific index in a paragraph.
 */
export function insertParagraphContent(
  paragraph: DocxParagraph,
  index: number,
  content: DocxParagraphContent,
): DocxParagraph {
  const newContent = [
    ...paragraph.content.slice(0, index),
    content,
    ...paragraph.content.slice(index),
  ];
  return {
    ...paragraph,
    content: newContent,
  };
}

/**
 * Remove content at a specific index in a paragraph.
 */
export function removeParagraphContent(
  paragraph: DocxParagraph,
  index: number,
): DocxParagraph {
  return {
    ...paragraph,
    content: paragraph.content.filter((_, i) => i !== index),
  };
}

/**
 * Replace content at a specific index in a paragraph.
 */
export function replaceParagraphContent(
  paragraph: DocxParagraph,
  index: number,
  content: DocxParagraphContent,
): DocxParagraph {
  return {
    ...paragraph,
    content: paragraph.content.map((c, i) => (i === index ? content : c)),
  };
}

// =============================================================================
// Text Operations
// =============================================================================

/**
 * Get all runs from a paragraph.
 */
export function getParagraphRuns(paragraph: DocxParagraph): readonly DocxRun[] {
  return paragraph.content.filter((c): c is DocxRun => c.type === "run");
}

/**
 * Get plain text from a paragraph.
 */
export function getParagraphText(paragraph: DocxParagraph): string {
  return getParagraphRuns(paragraph)
    .map(getRunText)
    .join("");
}

/**
 * Get paragraph length in characters.
 */
export function getParagraphLength(paragraph: DocxParagraph): number {
  return getParagraphText(paragraph).length;
}

/**
 * Insert text at a character position in the paragraph.
 */
export function insertText(
  paragraph: DocxParagraph,
  charOffset: number,
  text: string,
  properties?: DocxRunProperties,
): DocxParagraph {
  const runs = getParagraphRuns(paragraph);

  if (runs.length === 0) {
    // Empty paragraph, just add a run
    return appendParagraphContent(paragraph, createTextRun(text, properties));
  }

  // Find the run and position within it
  const { runIndex, offsetInRun } = findPositionInRuns(runs, charOffset);

  if (runIndex < 0) {
    // Position is at the end
    return appendParagraphContent(paragraph, createTextRun(text, properties));
  }

  const targetRun = runs[runIndex];

  // If properties match or no properties specified, insert into existing run
  if (!properties || propertiesMatch(targetRun.properties, properties)) {
    const currentText = getRunText(targetRun);
    const newText = currentText.slice(0, offsetInRun) + text + currentText.slice(offsetInRun);
    const newRun: DocxRun = { ...targetRun, content: [{ type: "text", value: newText }] };

    return replaceParagraphContentAtRunIndex(paragraph, runIndex, newRun);
  }

  // Need to split the run
  const [before, after] = splitRun(targetRun, offsetInRun);
  const newRun = createTextRun(text, properties);

  return spliceRunsAtIndex(paragraph, runIndex, before, newRun, after);
}

/**
 * Delete text in a character range.
 */
export function deleteTextRange(
  paragraph: DocxParagraph,
  startOffset: number,
  endOffset: number,
): DocxParagraph {
  if (startOffset >= endOffset) {
    return paragraph;
  }

  const runs = getParagraphRuns(paragraph);
  if (runs.length === 0) {
    return paragraph;
  }

  const start = findPositionInRuns(runs, startOffset);
  const end = findPositionInRuns(runs, endOffset);

  // Handle single run deletion
  if (start.runIndex === end.runIndex && start.runIndex >= 0) {
    const run = runs[start.runIndex];
    const text = getRunText(run);
    const newText = text.slice(0, start.offsetInRun) + text.slice(end.offsetInRun);

    if (newText.length === 0) {
      return removeParagraphContent(paragraph, findContentIndex(paragraph, start.runIndex));
    }

    const newRun: DocxRun = { ...run, content: [{ type: "text", value: newText }] };
    return replaceParagraphContentAtRunIndex(paragraph, start.runIndex, newRun);
  }

  // Multi-run deletion
  const newContent = deleteTextRangeFromContent(paragraph.content, start, end);
  return { ...paragraph, content: newContent };
}

/**
 * Process content for multi-run deletion.
 */
function deleteTextRangeFromContent(
  content: readonly DocxParagraphContent[],
  start: { runIndex: number; offsetInRun: number },
  end: { runIndex: number; offsetInRun: number },
): DocxParagraphContent[] {
  type Accumulator = { result: DocxParagraphContent[]; runIdx: number };

  const initial: Accumulator = { result: [], runIdx: 0 };

  const { result } = content.reduce<Accumulator>((acc, item) => {
    if (item.type !== "run") {
      return { result: [...acc.result, item], runIdx: acc.runIdx };
    }

    const runIdx = acc.runIdx;
    const nextRunIdx = runIdx + 1;

    if (runIdx < start.runIndex || runIdx > end.runIndex) {
      // Keep runs outside the range
      return { result: [...acc.result, item], runIdx: nextRunIdx };
    }

    if (runIdx === start.runIndex) {
      // Trim end of first run
      const text = getRunText(item);
      const newText = text.slice(0, start.offsetInRun);
      if (newText.length > 0) {
        const trimmedRun: DocxRun = { ...item, content: [{ type: "text", value: newText }] };
        return { result: [...acc.result, trimmedRun], runIdx: nextRunIdx };
      }
      return { result: acc.result, runIdx: nextRunIdx };
    }

    if (runIdx === end.runIndex) {
      // Trim start of last run
      const text = getRunText(item);
      const newText = text.slice(end.offsetInRun);
      if (newText.length > 0) {
        const trimmedRun: DocxRun = { ...item, content: [{ type: "text", value: newText }] };
        return { result: [...acc.result, trimmedRun], runIdx: nextRunIdx };
      }
      return { result: acc.result, runIdx: nextRunIdx };
    }

    // Runs in between are deleted
    return { result: acc.result, runIdx: nextRunIdx };
  }, initial);

  return result;
}

// =============================================================================
// Paragraph Properties Mutations
// =============================================================================

/**
 * Set paragraph properties, replacing all existing properties.
 */
export function setParagraphProperties(
  paragraph: DocxParagraph,
  properties: DocxParagraphProperties | undefined,
): DocxParagraph {
  return {
    ...paragraph,
    properties,
  };
}

/**
 * Merge new properties into existing paragraph properties.
 */
export function mergeParagraphProperties(
  paragraph: DocxParagraph,
  properties: Partial<DocxParagraphProperties>,
): DocxParagraph {
  return {
    ...paragraph,
    properties: {
      ...paragraph.properties,
      ...properties,
    },
  };
}

/**
 * Remove specific properties from a paragraph.
 */
export function removeParagraphProperty<K extends keyof DocxParagraphProperties>(
  paragraph: DocxParagraph,
  ...keys: K[]
): DocxParagraph {
  if (!paragraph.properties) {
    return paragraph;
  }

  const newProperties = { ...paragraph.properties };
  for (const key of keys) {
    delete (newProperties as Record<string, unknown>)[key];
  }

  const hasProperties = Object.keys(newProperties).length > 0;
  return {
    ...paragraph,
    properties: hasProperties ? newProperties : undefined,
  };
}

// =============================================================================
// Alignment Functions
// =============================================================================

/**
 * Set paragraph alignment.
 */
export function setParagraphAlignment(
  paragraph: DocxParagraph,
  alignment: "left" | "center" | "right" | "both",
): DocxParagraph {
  return mergeParagraphProperties(paragraph, { jc: alignment });
}

// =============================================================================
// Spacing Functions
// =============================================================================

/**
 * Set paragraph spacing.
 */
export function setParagraphSpacing(
  paragraph: DocxParagraph,
  spacing: DocxParagraphSpacing,
): DocxParagraph {
  return mergeParagraphProperties(paragraph, { spacing });
}

/**
 * Set line spacing.
 */
export function setLineSpacing(
  paragraph: DocxParagraph,
  line: number,
  lineRule?: "auto" | "exact" | "atLeast",
): DocxParagraph {
  const currentSpacing = paragraph.properties?.spacing ?? {};
  return mergeParagraphProperties(paragraph, {
    spacing: {
      ...currentSpacing,
      line,
      lineRule,
    },
  });
}

/**
 * Set space before paragraph.
 */
export function setSpaceBefore(paragraph: DocxParagraph, before: Twips): DocxParagraph {
  const currentSpacing = paragraph.properties?.spacing ?? {};
  return mergeParagraphProperties(paragraph, {
    spacing: { ...currentSpacing, before },
  });
}

/**
 * Set space after paragraph.
 */
export function setSpaceAfter(paragraph: DocxParagraph, after: Twips): DocxParagraph {
  const currentSpacing = paragraph.properties?.spacing ?? {};
  return mergeParagraphProperties(paragraph, {
    spacing: { ...currentSpacing, after },
  });
}

// =============================================================================
// Indentation Functions
// =============================================================================

/**
 * Set paragraph indentation.
 */
export function setParagraphIndent(
  paragraph: DocxParagraph,
  indent: DocxParagraphIndent,
): DocxParagraph {
  return mergeParagraphProperties(paragraph, { ind: indent });
}

/**
 * Set left indent.
 */
export function setLeftIndent(paragraph: DocxParagraph, left: Twips): DocxParagraph {
  const currentIndent = paragraph.properties?.ind ?? {};
  return mergeParagraphProperties(paragraph, {
    ind: { ...currentIndent, left },
  });
}

/**
 * Set first line indent.
 */
export function setFirstLineIndent(paragraph: DocxParagraph, firstLine: Twips): DocxParagraph {
  const currentIndent = paragraph.properties?.ind ?? {};
  return mergeParagraphProperties(paragraph, {
    ind: { ...currentIndent, firstLine, hanging: undefined },
  });
}

/**
 * Set hanging indent.
 */
export function setHangingIndent(paragraph: DocxParagraph, hanging: Twips): DocxParagraph {
  const currentIndent = paragraph.properties?.ind ?? {};
  return mergeParagraphProperties(paragraph, {
    ind: { ...currentIndent, hanging, firstLine: undefined },
  });
}

// =============================================================================
// List Functions
// =============================================================================

/**
 * Set numbering properties (for lists).
 */
export function setNumbering(
  paragraph: DocxParagraph,
  numId: DocxNumId,
  ilvl: DocxIlvl = 0 as DocxIlvl,
): DocxParagraph {
  const numPr: DocxNumberingProperties = { numId, ilvl };
  return mergeParagraphProperties(paragraph, { numPr });
}

/**
 * Remove numbering from paragraph.
 */
export function removeNumbering(paragraph: DocxParagraph): DocxParagraph {
  return removeParagraphProperty(paragraph, "numPr");
}

/**
 * Increase list level.
 */
export function increaseListLevel(paragraph: DocxParagraph): DocxParagraph {
  const currentNumPr = paragraph.properties?.numPr;
  if (!currentNumPr) {
    return paragraph;
  }

  const newIlvl = Math.min((currentNumPr.ilvl ?? 0) + 1, 8) as DocxIlvl;
  return setNumbering(paragraph, currentNumPr.numId!, newIlvl);
}

/**
 * Decrease list level.
 */
export function decreaseListLevel(paragraph: DocxParagraph): DocxParagraph {
  const currentNumPr = paragraph.properties?.numPr;
  if (!currentNumPr) {
    return paragraph;
  }

  const currentIlvl = currentNumPr.ilvl ?? 0;
  if (currentIlvl <= 0) {
    return removeNumbering(paragraph);
  }

  const newIlvl = (currentIlvl - 1) as DocxIlvl;
  return setNumbering(paragraph, currentNumPr.numId!, newIlvl);
}

// =============================================================================
// Paragraph Splitting and Merging
// =============================================================================

/**
 * Split a paragraph at a character position.
 *
 * @returns Tuple of [before, after] paragraphs
 */
export function splitParagraph(
  paragraph: DocxParagraph,
  charOffset: number,
): [DocxParagraph, DocxParagraph] {
  const length = getParagraphLength(paragraph);

  if (charOffset <= 0) {
    return [createParagraph(paragraph.properties), paragraph];
  }

  if (charOffset >= length) {
    return [paragraph, createParagraph(paragraph.properties)];
  }

  const runs = getParagraphRuns(paragraph);
  const { runIndex, offsetInRun } = findPositionInRuns(runs, charOffset);

  const { beforeContent, afterContent } = splitParagraphContent(
    paragraph.content,
    runIndex,
    offsetInRun,
  );

  const beforeParagraph: DocxParagraph = {
    type: "paragraph",
    properties: paragraph.properties,
    content: beforeContent,
  };

  const afterParagraph: DocxParagraph = {
    type: "paragraph",
    properties: paragraph.properties,
    content: afterContent,
  };

  return [beforeParagraph, afterParagraph];
}

/**
 * Append a run to array if it has non-empty text.
 */
function appendRunIfNotEmpty(
  runs: DocxParagraphContent[],
  run: DocxRun,
): DocxParagraphContent[] {
  if (getRunText(run).length > 0) {
    return [...runs, run];
  }
  return runs;
}

/**
 * Split paragraph content at a specific run position.
 */
function splitParagraphContent(
  content: readonly DocxParagraphContent[],
  runIndex: number,
  offsetInRun: number,
): { beforeContent: DocxParagraphContent[]; afterContent: DocxParagraphContent[] } {
  type Accumulator = {
    before: DocxParagraphContent[];
    after: DocxParagraphContent[];
    runIdx: number;
  };

  const initial: Accumulator = { before: [], after: [], runIdx: 0 };

  const { before, after } = content.reduce<Accumulator>((acc, item) => {
    if (item.type !== "run") {
      // Non-run content goes to before paragraph
      return { ...acc, before: [...acc.before, item] };
    }

    const currentRunIdx = acc.runIdx;
    const nextRunIdx = currentRunIdx + 1;

    if (currentRunIdx < runIndex) {
      return { before: [...acc.before, item], after: acc.after, runIdx: nextRunIdx };
    }

    if (currentRunIdx > runIndex) {
      return { before: acc.before, after: [...acc.after, item], runIdx: nextRunIdx };
    }

    // This is the split run
    const [beforeRun, afterRun] = splitRun(item, offsetInRun);
    const newBefore = appendRunIfNotEmpty(acc.before, beforeRun);
    const newAfter = appendRunIfNotEmpty(acc.after, afterRun);

    return { before: newBefore, after: newAfter, runIdx: nextRunIdx };
  }, initial);

  return { beforeContent: before, afterContent: after };
}

/**
 * Get merged content for two paragraphs.
 * Tries to merge adjacent runs if they have matching properties.
 */
function getMergedParagraphContent(
  first: DocxParagraph,
  second: DocxParagraph,
): DocxParagraphContent[] {
  const firstRuns = getParagraphRuns(first);
  const secondRuns = getParagraphRuns(second);

  if (firstRuns.length === 0 || secondRuns.length === 0) {
    return [...first.content, ...second.content];
  }

  const lastFirstRun = firstRuns[firstRuns.length - 1];
  const firstSecondRun = secondRuns[0];

  if (propertiesMatch(lastFirstRun.properties, firstSecondRun.properties)) {
    // Merge the adjacent runs
    const mergedRun = mergeRuns(lastFirstRun, firstSecondRun);
    return [
      ...first.content.slice(0, -1),
      mergedRun,
      ...second.content.slice(1),
    ];
  }

  return [...first.content, ...second.content];
}

/**
 * Merge two paragraphs into one.
 *
 * Uses properties from the first paragraph.
 */
export function mergeParagraphs(
  first: DocxParagraph,
  second: DocxParagraph,
): DocxParagraph {
  const mergedContent = getMergedParagraphContent(first, second);

  return {
    type: "paragraph",
    properties: first.properties,
    content: mergedContent,
  };
}

// =============================================================================
// Apply Formatting to Range
// =============================================================================

/**
 * Apply run properties to a character range in the paragraph.
 */
export function applyFormattingToRange(
  paragraph: DocxParagraph,
  startOffset: number,
  endOffset: number,
  properties: Partial<DocxRunProperties>,
): DocxParagraph {
  if (startOffset >= endOffset) {
    return paragraph;
  }

  const runs = getParagraphRuns(paragraph);
  if (runs.length === 0) {
    return paragraph;
  }

  const start = findPositionInRuns(runs, startOffset);
  const end = findPositionInRuns(runs, endOffset);

  const newContent: DocxParagraphContent[] = [];
  // eslint-disable-next-line no-restricted-syntax -- Loop counter for complex run processing
  let runIdx = 0;

  for (const content of paragraph.content) {
    if (content.type !== "run") {
      newContent.push(content);
      continue;
    }

    if (runIdx < start.runIndex || runIdx > end.runIndex) {
      // Outside range, keep as-is
      newContent.push(content);
    } else if (runIdx === start.runIndex && runIdx === end.runIndex) {
      // Single run, may need to split
      const text = getRunText(content);

      if (start.offsetInRun === 0 && end.offsetInRun >= text.length) {
        // Entire run is in range
        newContent.push(mergeRunProperties(content, properties));
      } else {
        // Need to split
        if (start.offsetInRun > 0) {
          const beforeText = text.slice(0, start.offsetInRun);
          newContent.push({ ...content, content: [{ type: "text", value: beforeText }] });
        }

        const middleText = text.slice(start.offsetInRun, end.offsetInRun);
        if (middleText.length > 0) {
          newContent.push(mergeRunProperties(
            { ...content, content: [{ type: "text", value: middleText }] },
            properties,
          ));
        }

        if (end.offsetInRun < text.length) {
          const afterText = text.slice(end.offsetInRun);
          newContent.push({ ...content, content: [{ type: "text", value: afterText }] });
        }
      }
    } else if (runIdx === start.runIndex) {
      // First run in range
      const text = getRunText(content);
      if (start.offsetInRun > 0) {
        const beforeText = text.slice(0, start.offsetInRun);
        newContent.push({ ...content, content: [{ type: "text", value: beforeText }] });
      }
      const afterText = text.slice(start.offsetInRun);
      if (afterText.length > 0) {
        newContent.push(mergeRunProperties(
          { ...content, content: [{ type: "text", value: afterText }] },
          properties,
        ));
      }
    } else if (runIdx === end.runIndex) {
      // Last run in range
      const text = getRunText(content);
      const beforeText = text.slice(0, end.offsetInRun);
      if (beforeText.length > 0) {
        newContent.push(mergeRunProperties(
          { ...content, content: [{ type: "text", value: beforeText }] },
          properties,
        ));
      }
      if (end.offsetInRun < text.length) {
        const afterText = text.slice(end.offsetInRun);
        newContent.push({ ...content, content: [{ type: "text", value: afterText }] });
      }
    } else {
      // Middle run, apply formatting to entire run
      newContent.push(mergeRunProperties(content, properties));
    }

    runIdx++;
  }

  return { ...paragraph, content: newContent };
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Check if paragraph is empty.
 */
export function isParagraphEmpty(paragraph: DocxParagraph): boolean {
  return getParagraphLength(paragraph) === 0;
}

/**
 * Check if paragraph is a list item.
 */
export function isListItem(paragraph: DocxParagraph): boolean {
  return paragraph.properties?.numPr !== undefined;
}

/**
 * Get list level (0-8, or -1 if not a list).
 */
export function getListLevel(paragraph: DocxParagraph): number {
  return paragraph.properties?.numPr?.ilvl ?? -1;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Find the run index and offset for a character position.
 */
function findPositionInRuns(
  runs: readonly DocxRun[],
  charOffset: number,
): { runIndex: number; offsetInRun: number } {
  type Result = { found: { runIndex: number; offsetInRun: number } | undefined; offset: number };
  const initial: Result = { found: undefined, offset: 0 };

  const { found } = runs.reduce<Result>((acc, run, index) => {
    if (acc.found !== undefined) {
      return acc;
    }

    const runLength = getRunText(run).length;

    if (charOffset <= acc.offset + runLength) {
      return {
        found: { runIndex: index, offsetInRun: charOffset - acc.offset },
        offset: acc.offset + runLength,
      };
    }

    return { found: undefined, offset: acc.offset + runLength };
  }, initial);

  // Position is at the end if not found
  return found ?? { runIndex: -1, offsetInRun: 0 };
}

/**
 * Check if two run properties are equal (shallow comparison).
 */
function propertiesMatch(
  a: DocxRunProperties | undefined,
  b: DocxRunProperties | undefined,
): boolean {
  if (a === b) {return true;}
  if (!a || !b) {return false;}

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) {return false;}

  return aKeys.every((key) => {
    const aVal = (a as Record<string, unknown>)[key];
    const bVal = (b as Record<string, unknown>)[key];
    return aVal === bVal;
  });
}

/**
 * Find the content index for a run index.
 */
function findContentIndex(paragraph: DocxParagraph, runIndex: number): number {
  type Result = { foundIndex: number; runCount: number };
  const initial: Result = { foundIndex: -1, runCount: 0 };

  const { foundIndex } = paragraph.content.reduce<Result>((acc, item, contentIndex) => {
    if (acc.foundIndex >= 0) {
      return acc;
    }
    if (item.type !== "run") {
      return acc;
    }
    if (acc.runCount === runIndex) {
      return { foundIndex: contentIndex, runCount: acc.runCount + 1 };
    }
    return { foundIndex: -1, runCount: acc.runCount + 1 };
  }, initial);

  return foundIndex;
}

/**
 * Replace a run at a specific run index.
 */
function replaceParagraphContentAtRunIndex(
  paragraph: DocxParagraph,
  runIndex: number,
  newRun: DocxRun,
): DocxParagraph {
  const contentIndex = findContentIndex(paragraph, runIndex);
  if (contentIndex < 0) {
    return paragraph;
  }
  return replaceParagraphContent(paragraph, contentIndex, newRun);
}

/**
 * Splice runs at a specific index.
 */
function spliceRunsAtIndex(
  paragraph: DocxParagraph,
  runIndex: number,
  ...newRuns: DocxRun[]
): DocxParagraph {
  const contentIndex = findContentIndex(paragraph, runIndex);
  if (contentIndex < 0) {
    return paragraph;
  }

  // Filter out empty runs
  const nonEmptyRuns = newRuns.filter((r) => getRunText(r).length > 0);

  const newContent = [
    ...paragraph.content.slice(0, contentIndex),
    ...nonEmptyRuns,
    ...paragraph.content.slice(contentIndex + 1),
  ];

  return { ...paragraph, content: newContent };
}
