/**
 * @file Search Logic Hook
 *
 * Provides incremental search functionality with regex support.
 */

import { useMemo, useEffect } from "react";
import type { SearchMatch, SearchOptions } from "../context/vba-editor/types";

// =============================================================================
// Types
// =============================================================================

export type LineIndex = {
  /** Get line and column from offset */
  getLineAtOffset: (offset: number) => { line: number; column: number };
  /** Get offset from line and column */
  getOffset: (line: number, column: number) => number;
};

export type UseSearchArgs = {
  readonly text: string;
  readonly query: string;
  readonly options: SearchOptions;
};

export type UseSearchResult = {
  readonly matches: readonly SearchMatch[];
};

// =============================================================================
// Line Index Builder
// =============================================================================

/**
 * Build line index from text for O(log n) line/column lookups.
 */
export function buildLineIndex(text: string): LineIndex {
  // Build array of line start offsets
  const lineStarts: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") {
      lineStarts.push(i + 1);
    }
  }

  return {
    getLineAtOffset(offset: number) {
      // Binary search for line
      const low = { value: 0 };
      const high = { value: lineStarts.length - 1 };
      while (low.value < high.value) {
        const mid = Math.ceil((low.value + high.value) / 2);
        if (lineStarts[mid] <= offset) {
          low.value = mid;
        } else {
          high.value = mid - 1;
        }
      }
      const line = low.value + 1; // 1-based
      const column = offset - lineStarts[low.value] + 1; // 1-based
      return { line, column };
    },
    getOffset(line: number, column: number) {
      const lineIndex = Math.max(0, Math.min(line - 1, lineStarts.length - 1));
      return lineStarts[lineIndex] + column - 1;
    },
  };
}

// =============================================================================
// Search Logic
// =============================================================================

/**
 * Escape special regex characters.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Find all matches in text.
 */
export function findMatches(
  text: string,
  query: string,
  options: SearchOptions,
): readonly SearchMatch[] {
  if (!query) {
    return [];
  }

  // Build regex from query
  // Build regex from query - invalid patterns return empty results
  const pattern = options.useRegex ? query : escapeRegExp(query);
  const flags = options.caseSensitive ? "g" : "gi";
  const fullPattern = options.wholeWord ? `\\b${pattern}\\b` : pattern;

  const regex = { value: null as RegExp | null };
  try {
    regex.value = new RegExp(fullPattern, flags);
  } catch (error: unknown) {
    // Invalid regex pattern (e.g., unclosed brackets) - return empty matches
    if (error instanceof SyntaxError) {
      return [];
    }
    return [];
  }

  const lineIndex = buildLineIndex(text);
  const matches: SearchMatch[] = [];
  const match = { value: null as RegExpExecArray | null };

  while ((match.value = regex.value!.exec(text)) !== null) {
    const startOffset = match.value.index;
    const endOffset = startOffset + match.value[0].length;
    const startPos = lineIndex.getLineAtOffset(startOffset);
    const endPos = lineIndex.getLineAtOffset(endOffset);

    matches.push({
      startOffset,
      endOffset,
      line: startPos.line,
      startColumn: startPos.column,
      endColumn: startPos.line === endPos.line ? endPos.column : startPos.column + match.value[0].length,
      text: match.value[0],
    });

    // Prevent infinite loop on zero-width matches
    if (match.value[0].length === 0) {
      regex.value!.lastIndex++;
    }

    // Safety limit
    if (matches.length >= 10000) {
      break;
    }
  }

  return matches;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for incremental search.
 *
 * Memoizes match computation based on text, query, and options.
 */
export function useSearch(args: UseSearchArgs): UseSearchResult {
  const { text, query, options } = args;

  const matches = useMemo(
    () => findMatches(text, query, options),
    [text, query, options.caseSensitive, options.useRegex, options.wholeWord],
  );

  return { matches };
}

// =============================================================================
// Integration Hook
// =============================================================================

export type UseSearchIntegrationArgs = {
  readonly source: string | undefined;
  readonly query: string;
  readonly options: SearchOptions;
  readonly isOpen: boolean;
  readonly onMatchesUpdate: (matches: readonly SearchMatch[]) => void;
};

/**
 * Hook that integrates search with dispatch.
 *
 * Automatically dispatches UPDATE_MATCHES when search results change.
 */
export function useSearchIntegration(args: UseSearchIntegrationArgs): void {
  const { source, query, options, isOpen, onMatchesUpdate } = args;

  const { matches } = useSearch({
    text: source ?? "",
    query: isOpen ? query : "",
    options,
  });

  useEffect(() => {
    if (isOpen) {
      onMatchesUpdate(matches);
    }
  }, [matches, isOpen, onMatchesUpdate]);
}
