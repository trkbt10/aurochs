/**
 * @file Line Index Hook
 *
 * Maintains a persistent index of line start offsets for O(log n) line lookup.
 * Avoids repeated split("\n") calls by caching the lines array and offset index.
 */

import { useMemo } from "react";

// =============================================================================
// Types
// =============================================================================

/**
 * Line index providing efficient offset-to-line-column conversion.
 */
export type LineIndex = {
  /** Array of lines (cached split result) */
  readonly lines: readonly string[];
  /** Start offset of each line (for binary search) */
  readonly lineOffsets: readonly number[];
  /** Convert flat offset to line/column (1-based) */
  readonly getLineAtOffset: (offset: number) => { line: number; column: number };
  /** Convert line/column (1-based) to flat offset */
  readonly getOffsetAtLineColumn: (line: number, column: number) => number;
};

// =============================================================================
// Pure Functions
// =============================================================================

/**
 * Build line offset index from text.
 * lineOffsets[i] = start offset of line i (0-based).
 */
function buildLineOffsets(lines: readonly string[]): readonly number[] {
  const offsets: number[] = new Array(lines.length);
  // eslint-disable-next-line no-restricted-syntax -- Accumulator pattern requires mutation
  let offset = 0;

  for (const [i, line] of lines.entries()) {
    offsets[i] = offset;
    // +1 for newline character
    offset += line.length + 1;
  }

  return offsets;
}

/**
 * Binary search to find line index containing the given offset.
 * Returns the 0-based line index.
 */
function findLineIndex(lineOffsets: readonly number[], offset: number): number {
  // Handle offset past end of text
  if (lineOffsets.length === 0) {
    return 0;
  }

  // eslint-disable-next-line no-restricted-syntax -- Binary search requires mutable bounds
  let lo = 0;
  // eslint-disable-next-line no-restricted-syntax -- Binary search requires mutable bounds
  let hi = lineOffsets.length - 1;

  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineOffsets[mid] <= offset) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  return lo;
}

/**
 * Convert flat offset to line/column (1-based).
 */
function offsetToLineColumnFromIndex(
  lines: readonly string[],
  lineOffsets: readonly number[],
  offset: number
): { line: number; column: number } {
  if (lines.length === 0) {
    return { line: 1, column: 1 };
  }

  // Clamp offset to valid range
  const clampedOffset = Math.max(0, offset);

  const lineIndex = findLineIndex(lineOffsets, clampedOffset);
  const lineStartOffset = lineOffsets[lineIndex];
  const column = clampedOffset - lineStartOffset + 1;

  return { line: lineIndex + 1, column };
}

type LineColumnToOffsetOptions = {
  readonly lines: readonly string[];
  readonly lineOffsets: readonly number[];
  readonly line: number;
  readonly column: number;
};

/**
 * Convert line/column (1-based) to flat offset.
 */
function lineColumnToOffsetFromIndex(options: LineColumnToOffsetOptions): number {
  const { lines, lineOffsets, line, column } = options;

  if (lines.length === 0) {
    return 0;
  }

  // Clamp line to valid range (1-based)
  const lineIndex = Math.max(0, Math.min(line - 1, lines.length - 1));
  const lineStartOffset = lineOffsets[lineIndex];
  const lineText = lines[lineIndex];

  // Clamp column to line length (1-based)
  const colOffset = Math.max(0, Math.min(column - 1, lineText.length));

  return lineStartOffset + colOffset;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook that provides an efficient line index for text.
 *
 * Caches the split result and line offsets, recalculating only when text changes.
 * Provides O(log n) offset-to-line-column conversion via binary search.
 *
 * @param text - The source text
 * @returns Line index with lines array and conversion functions
 *
 * @example
 * ```tsx
 * const lineIndex = useLineIndex(sourceCode);
 *
 * // Access cached lines (avoids split on every render)
 * const lines = lineIndex.lines;
 *
 * // Convert offset to line/column (O(log n) instead of O(n))
 * const { line, column } = lineIndex.getLineAtOffset(cursorOffset);
 * ```
 */
export function useLineIndex(text: string): LineIndex {
  return useMemo(() => {
    const lines = text.split("\n");
    const lineOffsets = buildLineOffsets(lines);

    const getLineAtOffset = (offset: number): { line: number; column: number } => {
      return offsetToLineColumnFromIndex(lines, lineOffsets, offset);
    };

    const getOffsetAtLineColumn = (line: number, column: number): number => {
      return lineColumnToOffsetFromIndex({ lines, lineOffsets, line, column });
    };

    return {
      lines,
      lineOffsets,
      getLineAtOffset,
      getOffsetAtLineColumn,
    };
  }, [text]);
}

// =============================================================================
// Exports for Testing
// =============================================================================

export { buildLineOffsets, findLineIndex, offsetToLineColumnFromIndex, lineColumnToOffsetFromIndex };
