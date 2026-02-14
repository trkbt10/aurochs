/**
 * @file Keyword Completion Provider
 *
 * Provides VBA keywords for completion.
 */

import type { CompletionProvider, CompletionItem, CompletionContext } from "../types";
import {
  VBA_KEYWORDS_ARRAY,
  VBA_TYPES_ARRAY,
} from "../../components/code-editor/code/syntax-highlight";

// =============================================================================
// Keyword Items
// =============================================================================

const KEYWORD_ITEMS: readonly CompletionItem[] = VBA_KEYWORDS_ARRAY.map(
  (keyword): CompletionItem => ({
    label: keyword,
    kind: "keyword",
    detail: "Keyword",
    insertText: keyword,
  }),
);

const TYPE_ITEMS: readonly CompletionItem[] = VBA_TYPES_ARRAY.map(
  (type): CompletionItem => ({
    label: type,
    kind: "type",
    detail: "Type",
    insertText: type,
  }),
);

const ALL_ITEMS = [...KEYWORD_ITEMS, ...TYPE_ITEMS];

// =============================================================================
// Provider
// =============================================================================

/**
 * Keyword completion provider.
 *
 * Provides VBA keywords and types for completion.
 */
export const keywordProvider: CompletionProvider = {
  id: "keyword",

  provideCompletions(
    context: CompletionContext,
    _source: string,
    _procedures: readonly import("@aurochs-office/vba").VbaProcedure[],
  ): readonly CompletionItem[] {
    // Don't provide keywords after "."
    if (context.trigger === "dot") {
      return [];
    }

    // Filter by prefix
    const prefix = context.prefix.toLowerCase();
    if (!prefix) {
      return ALL_ITEMS;
    }

    return ALL_ITEMS.filter((item) =>
      item.label.toLowerCase().startsWith(prefix),
    );
  },
};
