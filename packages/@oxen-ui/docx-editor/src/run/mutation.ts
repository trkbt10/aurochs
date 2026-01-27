/**
 * @file DOCX Run Mutation Utilities
 *
 * Provides immutable mutation functions for run-level operations.
 * All functions return new objects without modifying the originals.
 */

import type {
  DocxRun,
  DocxRunProperties,
  DocxRunContent,
  DocxText,
  DocxColor,
  DocxUnderline,
  DocxHighlightColor,
} from "@oxen/docx/domain/run";
import type { HalfPoints } from "@oxen/docx/domain/types";

// =============================================================================
// Run Creation
// =============================================================================

/**
 * Create an empty run with optional properties.
 */
export function createRun(properties?: DocxRunProperties): DocxRun {
  return {
    type: "run",
    properties,
    content: [],
  };
}

/**
 * Create a run with text content.
 */
export function createTextRun(text: string, properties?: DocxRunProperties): DocxRun {
  return {
    type: "run",
    properties,
    content: [{ type: "text", value: text }],
  };
}

/**
 * Create a text content element.
 */
export function createText(value: string): DocxText {
  return {
    type: "text",
    value,
  };
}

// =============================================================================
// Run Content Mutations
// =============================================================================

/**
 * Set run content, replacing all existing content.
 */
export function setRunContent(run: DocxRun, content: readonly DocxRunContent[]): DocxRun {
  return {
    ...run,
    content,
  };
}

/**
 * Append content to a run.
 */
export function appendRunContent(run: DocxRun, content: DocxRunContent): DocxRun {
  return {
    ...run,
    content: [...run.content, content],
  };
}

/**
 * Prepend content to a run.
 */
export function prependRunContent(run: DocxRun, content: DocxRunContent): DocxRun {
  return {
    ...run,
    content: [content, ...run.content],
  };
}

/**
 * Insert content at a specific index in a run.
 */
export function insertRunContent(
  run: DocxRun,
  index: number,
  content: DocxRunContent,
): DocxRun {
  const newContent = [
    ...run.content.slice(0, index),
    content,
    ...run.content.slice(index),
  ];
  return {
    ...run,
    content: newContent,
  };
}

/**
 * Remove content at a specific index in a run.
 */
export function removeRunContent(run: DocxRun, index: number): DocxRun {
  return {
    ...run,
    content: run.content.filter((_, i) => i !== index),
  };
}

/**
 * Get plain text from a run.
 */
export function getRunText(run: DocxRun): string {
  return run.content
    .filter((c): c is DocxText => c.type === "text")
    .map((c) => c.value)
    .join("");
}

/**
 * Set run text, replacing all text content.
 */
export function setRunText(run: DocxRun, text: string): DocxRun {
  // Preserve non-text content (tabs, breaks) and replace text
  const nonTextContent = run.content.filter((c) => c.type !== "text");

  if (text.length === 0 && nonTextContent.length > 0) {
    return { ...run, content: nonTextContent };
  }

  return {
    ...run,
    content: [{ type: "text", value: text }, ...nonTextContent],
  };
}

// =============================================================================
// Run Properties Mutations
// =============================================================================

/**
 * Set run properties, replacing all existing properties.
 */
export function setRunProperties(
  run: DocxRun,
  properties: DocxRunProperties | undefined,
): DocxRun {
  return {
    ...run,
    properties,
  };
}

/**
 * Merge new properties into existing run properties.
 */
export function mergeRunProperties(
  run: DocxRun,
  properties: Partial<DocxRunProperties>,
): DocxRun {
  return {
    ...run,
    properties: {
      ...run.properties,
      ...properties,
    },
  };
}

/**
 * Remove specific properties from a run.
 */
export function removeRunProperty<K extends keyof DocxRunProperties>(
  run: DocxRun,
  ...keys: K[]
): DocxRun {
  if (!run.properties) {
    return run;
  }

  const newProperties = { ...run.properties };
  for (const key of keys) {
    delete (newProperties as Record<string, unknown>)[key];
  }

  // Return undefined if no properties left
  const hasProperties = Object.keys(newProperties).length > 0;
  return {
    ...run,
    properties: hasProperties ? newProperties : undefined,
  };
}

// =============================================================================
// Formatting Toggle Functions
// =============================================================================

/**
 * Toggle bold formatting on a run.
 */
export function toggleBold(run: DocxRun): DocxRun {
  const currentBold = run.properties?.b ?? false;
  return mergeRunProperties(run, { b: !currentBold });
}

/**
 * Toggle italic formatting on a run.
 */
export function toggleItalic(run: DocxRun): DocxRun {
  const currentItalic = run.properties?.i ?? false;
  return mergeRunProperties(run, { i: !currentItalic });
}

/**
 * Get new underline value for toggle.
 */
function getToggledUnderline(current: DocxUnderline | undefined): DocxUnderline | undefined {
  if (current) {
    return undefined;
  }
  return { val: "single" };
}

/**
 * Toggle underline formatting on a run.
 */
export function toggleUnderline(run: DocxRun): DocxRun {
  const newUnderline = getToggledUnderline(run.properties?.u);

  if (newUnderline) {
    return mergeRunProperties(run, { u: newUnderline });
  }
  return removeRunProperty(run, "u");
}

/**
 * Toggle strikethrough formatting on a run.
 */
export function toggleStrikethrough(run: DocxRun): DocxRun {
  const currentStrike = run.properties?.strike ?? false;
  return mergeRunProperties(run, { strike: !currentStrike });
}

/**
 * Toggle subscript formatting on a run.
 */
export function toggleSubscript(run: DocxRun): DocxRun {
  const current = run.properties?.vertAlign;
  const newValue = current === "subscript" ? "baseline" : "subscript";
  return mergeRunProperties(run, { vertAlign: newValue });
}

/**
 * Toggle superscript formatting on a run.
 */
export function toggleSuperscript(run: DocxRun): DocxRun {
  const current = run.properties?.vertAlign;
  const newValue = current === "superscript" ? "baseline" : "superscript";
  return mergeRunProperties(run, { vertAlign: newValue });
}

// =============================================================================
// Formatting Set Functions
// =============================================================================

/**
 * Set font size on a run (in half-points).
 */
export function setFontSize(run: DocxRun, size: HalfPoints): DocxRun {
  return mergeRunProperties(run, { sz: size, szCs: size });
}

/**
 * Set font family on a run.
 */
export function setFontFamily(run: DocxRun, family: string): DocxRun {
  return mergeRunProperties(run, {
    rFonts: {
      ...run.properties?.rFonts,
      ascii: family,
      hAnsi: family,
      eastAsia: family,
      cs: family,
    },
  });
}

/**
 * Set text color on a run.
 */
export function setTextColor(run: DocxRun, color: string): DocxRun {
  const colorValue: DocxColor = { val: color };
  return mergeRunProperties(run, { color: colorValue });
}

/**
 * Set highlight color on a run.
 */
export function setHighlightColor(
  run: DocxRun,
  color: DocxHighlightColor | undefined,
): DocxRun {
  if (color === undefined || color === "none") {
    return removeRunProperty(run, "highlight");
  }
  return mergeRunProperties(run, { highlight: color });
}

/**
 * Clear all direct formatting from a run.
 */
export function clearFormatting(run: DocxRun): DocxRun {
  return {
    ...run,
    properties: undefined,
  };
}

// =============================================================================
// Run Splitting
// =============================================================================

/**
 * Split a run at a character position.
 *
 * @returns Tuple of [before, after] runs
 */
export function splitRun(run: DocxRun, charOffset: number): [DocxRun, DocxRun] {
  const text = getRunText(run);

  if (charOffset <= 0) {
    return [createRun(run.properties), run];
  }

  if (charOffset >= text.length) {
    return [run, createRun(run.properties)];
  }

  const beforeText = text.slice(0, charOffset);
  const afterText = text.slice(charOffset);

  // Preserve non-text content in the second run
  const nonTextContent = run.content.filter((c) => c.type !== "text");

  const beforeRun: DocxRun = {
    type: "run",
    properties: run.properties,
    content: [{ type: "text", value: beforeText }],
  };

  const afterRun: DocxRun = {
    type: "run",
    properties: run.properties,
    content: [{ type: "text", value: afterText }, ...nonTextContent],
  };

  return [beforeRun, afterRun];
}

/**
 * Merge two runs into one.
 *
 * Uses properties from the first run.
 */
export function mergeRuns(first: DocxRun, second: DocxRun): DocxRun {
  const firstText = getRunText(first);
  const secondText = getRunText(second);

  // Combine non-text content from both runs
  const firstNonText = first.content.filter((c) => c.type !== "text");
  const secondNonText = second.content.filter((c) => c.type !== "text");

  const content: DocxRunContent[] = [];
  if (firstText.length > 0 || secondText.length > 0) {
    content.push({ type: "text", value: firstText + secondText });
  }
  content.push(...firstNonText, ...secondNonText);

  return {
    type: "run",
    properties: first.properties,
    content,
  };
}

// =============================================================================
// Run Query Functions
// =============================================================================

/**
 * Check if a run has specific formatting.
 */
export function hasFormatting(run: DocxRun, key: keyof DocxRunProperties): boolean {
  return run.properties?.[key] !== undefined;
}

/**
 * Check if a run is bold.
 */
export function isBold(run: DocxRun): boolean {
  return run.properties?.b === true;
}

/**
 * Check if a run is italic.
 */
export function isItalic(run: DocxRun): boolean {
  return run.properties?.i === true;
}

/**
 * Check if a run has underline.
 */
export function isUnderlined(run: DocxRun): boolean {
  return run.properties?.u !== undefined;
}

/**
 * Check if a run has strikethrough.
 */
export function isStrikethrough(run: DocxRun): boolean {
  return run.properties?.strike === true;
}

/**
 * Check if a run is empty (no content).
 */
export function isRunEmpty(run: DocxRun): boolean {
  return run.content.length === 0 || getRunText(run).length === 0;
}

/**
 * Get run length in characters.
 */
export function getRunLength(run: DocxRun): number {
  return getRunText(run).length;
}
