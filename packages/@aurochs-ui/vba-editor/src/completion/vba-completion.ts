/**
 * @file VBA Completion Logic
 *
 * Core completion logic for context detection and filtering.
 */

import type {
  CompletionContext,
  CompletionItem,
  CompletionTrigger,
  CompletionProvider,
} from "./types";
import type { VbaProcedure } from "@aurochs-office/vba";
import { keywordProvider } from "./providers/keyword-provider";
import { builtinProvider } from "./providers/builtin-provider";
import { variableProvider } from "./providers/variable-provider";
import { procedureProvider } from "./providers/procedure-provider";

// =============================================================================
// Provider Registry
// =============================================================================

const PROVIDERS: readonly CompletionProvider[] = [
  variableProvider,   // Variables first (most relevant)
  procedureProvider,  // Then procedures
  keywordProvider,    // Then keywords
  builtinProvider,    // Then builtins
];

// =============================================================================
// Context Detection
// =============================================================================

/**
 * Check if offset is inside a string literal or comment.
 */
function isInsideStringOrComment(
  source: string,
  offset: number,
  lineStart: number,
): boolean {
  const line = source.slice(lineStart, offset);

  // Check for comment (starts with ' or after Rem)
  const commentIndex = line.indexOf("'");
  if (commentIndex !== -1 && lineStart + commentIndex < offset) {
    return true;
  }

  // Check for Rem comment
  const remMatch = /\bRem\s/i.exec(line);
  if (remMatch && lineStart + remMatch.index < offset) {
    return true;
  }

  // Check for string literal (count quotes before offset)
  let inString = false;
  for (let i = 0; i < line.length && lineStart + i < offset; i++) {
    if (line[i] === '"') {
      if (i + 1 < line.length && line[i + 1] === '"') {
        // Escaped quote
        i++;
      } else {
        inString = !inString;
      }
    }
  }

  return inString;
}

/**
 * Get line start offset for a given offset.
 */
function getLineStart(source: string, offset: number): number {
  const lastNewline = source.lastIndexOf("\n", offset - 1);
  return lastNewline === -1 ? 0 : lastNewline + 1;
}

/**
 * Get line and column from offset.
 */
function getLineColumn(
  source: string,
  offset: number,
): { line: number; column: number } {
  let line = 1;
  let lastNewline = -1;

  for (let i = 0; i < offset; i++) {
    if (source[i] === "\n") {
      line++;
      lastNewline = i;
    }
  }

  return { line, column: offset - lastNewline };
}

/**
 * Extract prefix (partial identifier) before cursor.
 */
function extractPrefix(
  source: string,
  offset: number,
): { prefix: string; prefixStartOffset: number } {
  let start = offset;

  // Scan backward for identifier characters
  while (start > 0 && /[a-zA-Z0-9_]/.test(source[start - 1])) {
    start--;
  }

  return {
    prefix: source.slice(start, offset),
    prefixStartOffset: start,
  };
}

/**
 * Check if cursor is after a "." (member access).
 */
function checkDotTrigger(
  source: string,
  prefixStartOffset: number,
): { isDot: boolean; objectName?: string } {
  // Check character before prefix
  if (prefixStartOffset === 0) {
    return { isDot: false };
  }

  // Skip whitespace before prefix
  let pos = prefixStartOffset - 1;
  while (pos > 0 && /\s/.test(source[pos])) {
    pos--;
  }

  if (source[pos] !== ".") {
    return { isDot: false };
  }

  // Extract object name before "."
  let objectEnd = pos;
  pos--;

  while (pos > 0 && /\s/.test(source[pos])) {
    pos--;
  }

  let objectStart = pos;
  while (objectStart > 0 && /[a-zA-Z0-9_]/.test(source[objectStart - 1])) {
    objectStart--;
  }

  const objectName = source.slice(objectStart, objectEnd).trim();

  return {
    isDot: true,
    objectName: objectName || undefined,
  };
}

/**
 * Detect completion context from cursor position.
 */
export function detectCompletionContext(
  source: string,
  cursorOffset: number,
  trigger: CompletionTrigger,
): CompletionContext | undefined {
  // Don't complete at start of file with no input
  if (cursorOffset === 0 && trigger !== "manual") {
    return undefined;
  }

  const lineStart = getLineStart(source, cursorOffset);

  // Don't complete inside strings or comments
  if (isInsideStringOrComment(source, cursorOffset, lineStart)) {
    return undefined;
  }

  const { prefix, prefixStartOffset } = extractPrefix(source, cursorOffset);
  const { line, column } = getLineColumn(source, cursorOffset);
  const dotInfo = checkDotTrigger(source, prefixStartOffset);

  // For typing trigger, require at least 1 character prefix
  if (trigger === "typing" && prefix.length === 0) {
    return undefined;
  }

  // Determine actual trigger
  const actualTrigger: CompletionTrigger = dotInfo.isDot ? "dot" : trigger;

  return {
    trigger: actualTrigger,
    prefix,
    prefixStartOffset,
    line,
    column,
    objectName: dotInfo.objectName,
  };
}

// =============================================================================
// Filtering and Ranking
// =============================================================================

/**
 * Kind priority for sorting (lower = higher priority).
 */
const KIND_PRIORITY: Record<string, number> = {
  variable: 0,
  procedure: 1,
  property: 2,
  keyword: 3,
  type: 4,
  builtin: 5,
  constant: 6,
  module: 7,
};

/**
 * Calculate match score for ranking.
 */
function calculateScore(item: CompletionItem, prefix: string): number {
  const label = item.label.toLowerCase();
  const lowerPrefix = prefix.toLowerCase();

  // Exact match
  if (label === lowerPrefix) {
    return 1000;
  }

  // Prefix match (start of word)
  if (label.startsWith(lowerPrefix)) {
    // Prefer shorter labels for prefix matches
    return 900 - item.label.length;
  }

  // Contains match
  if (label.includes(lowerPrefix)) {
    const index = label.indexOf(lowerPrefix);
    return 500 - index;
  }

  // No match
  return 0;
}

/**
 * Filter and rank completion items.
 */
export function filterAndRankCompletions(
  items: readonly CompletionItem[],
  prefix: string,
): readonly CompletionItem[] {
  if (!prefix) {
    // No prefix - sort by kind priority
    return [...items].sort((a, b) => {
      const priorityA = KIND_PRIORITY[a.kind] ?? 100;
      const priorityB = KIND_PRIORITY[b.kind] ?? 100;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return a.label.localeCompare(b.label);
    });
  }

  // Filter items that match prefix
  const scored = items
    .map((item) => ({
      item,
      score: calculateScore(item, prefix),
    }))
    .filter(({ score }) => score > 0);

  // Sort by score (descending), then by kind priority, then alphabetically
  scored.sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score;
    }
    const priorityA = KIND_PRIORITY[a.item.kind] ?? 100;
    const priorityB = KIND_PRIORITY[b.item.kind] ?? 100;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return a.item.label.localeCompare(b.item.label);
  });

  return scored.map(({ item }) => item);
}

// =============================================================================
// Completion Collection
// =============================================================================

/**
 * Collect completions from all providers.
 */
export function collectCompletions(
  context: CompletionContext,
  source: string,
  procedures: readonly VbaProcedure[],
): readonly CompletionItem[] {
  const items: CompletionItem[] = [];

  for (const provider of PROVIDERS) {
    const providerItems = provider.provideCompletions(context, source, procedures);
    items.push(...providerItems);
  }

  return filterAndRankCompletions(items, context.prefix);
}

// =============================================================================
// Apply Completion
// =============================================================================

/**
 * Apply completion - replace prefix with selected item.
 */
export function applyCompletion(
  source: string,
  context: CompletionContext,
  item: CompletionItem,
): { text: string; cursorOffset: number } {
  const insertText = item.insertText ?? item.label;

  const newSource =
    source.slice(0, context.prefixStartOffset) +
    insertText +
    source.slice(context.prefixStartOffset + context.prefix.length);

  const newCursorOffset = context.prefixStartOffset + insertText.length;

  return { text: newSource, cursorOffset: newCursorOffset };
}
