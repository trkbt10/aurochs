/**
 * @file Formula autocomplete
 *
 * Autocomplete logic for formula editing:
 * - Detects when autocomplete should open based on caret position
 * - Filters the function registry by prefix match
 * - Produces replacement text when a candidate is accepted
 */

import { listFormulaFunctions, type FormulaFunctionDefinition } from "@aurochs-office/xlsx/formula/functionRegistry";
import type { FormulaTextToken } from "./types";

/**
 * Autocomplete context: describes whether the caret is at a position
 * where function name completion should be offered.
 */
export type AutocompleteContext = {
  /** Whether autocomplete should be shown */
  readonly shouldOpen: boolean;
  /** The partial text to match against function names */
  readonly query: string;
  /** Start offset of the partial text in the full editing text */
  readonly tokenStartOffset: number;
};

/**
 * Detect whether autocomplete should open at the current caret position.
 *
 * Autocomplete opens when the caret is at the end of (or inside) a function-name
 * token that is NOT already followed by `(`. This handles the mid-typing scenario
 * where the user has typed a partial function name.
 *
 * @param tokens Token list from `analyzeFormula` (offsets relative to full editing text)
 * @param caretOffset Caret position in the full editing text
 */
export function detectAutocompleteContext(
  tokens: readonly FormulaTextToken[],
  caretOffset: number,
): AutocompleteContext | undefined {
  // Find the token that contains or immediately precedes the caret.
  // Check both "function" and "reference" tokens since partial function names
  // like "SU" may be classified as reference (looks like a column name).
  for (const token of tokens) {
    if (token.type !== "function" && token.type !== "reference") {
      continue;
    }

    // Skip references with digits (actual cell refs like A1, B2) — these are not function names
    if (token.type === "reference" && /\d/.test(token.text)) {
      continue;
    }

    // Skip sheet-qualified references (Sheet1!A1)
    if (token.text.includes("!")) {
      continue;
    }

    // Caret must be inside or at the end of the token (but not before it)
    if (caretOffset < token.startOffset || caretOffset > token.endOffset) {
      continue;
    }

    // Check if the next non-whitespace token is `(` — if so, the function name is complete
    const nextTokenIndex = tokens.indexOf(token) + 1;
    const nextSignificant = tokens.slice(nextTokenIndex).find((t) => t.type !== "whitespace");
    if (nextSignificant?.type === "paren" && nextSignificant.text === "(") {
      continue; // Already a complete function call
    }

    // Extract the partial query (from token start to caret position)
    const query = token.text.slice(0, caretOffset - token.startOffset).toUpperCase();

    return {
      shouldOpen: query.length > 0,
      query,
      tokenStartOffset: token.startOffset,
    };
  }

  return undefined;
}

/**
 * Filter registered formula functions by prefix match.
 *
 * @param query Uppercase prefix to match (e.g., "SU")
 * @returns Sorted list of matching functions (exact match first, then alphabetical), max 10
 */
export function filterFunctions(query: string): FormulaFunctionDefinition[] {
  if (query.length === 0) {
    // Return first 10 functions alphabetically
    return listFormulaFunctions()
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 10);
  }

  const upperQuery = query.toUpperCase();
  const matches = listFormulaFunctions().filter((fn) => fn.name.toUpperCase().startsWith(upperQuery));

  // Sort: exact match first, then alphabetical
  matches.sort((a, b) => {
    const aExact = a.name.toUpperCase() === upperQuery;
    const bExact = b.name.toUpperCase() === upperQuery;
    if (aExact && !bExact) {
      return -1;
    }
    if (!aExact && bExact) {
      return 1;
    }
    return a.name.localeCompare(b.name);
  });

  return matches.slice(0, 10);
}

/**
 * Produce the replacement text when a function is accepted from autocomplete.
 *
 * Replaces the partial token text with `FUNCTIONNAME(` and positions the caret
 * after the opening parenthesis.
 *
 * @returns New editing text and caret position
 */
export function acceptAutocomplete(params: {
  /** Full editing text (including "=") */
  readonly editingText: string;
  /** Start of the token being completed */
  readonly tokenStartOffset: number;
  /** Current caret position */
  readonly caretOffset: number;
  /** Selected function name (e.g., "SUM") */
  readonly functionName: string;
}): { text: string; caretOffset: number } {
  const replacement = `${params.functionName}(`;
  const before = params.editingText.slice(0, params.tokenStartOffset);
  const after = params.editingText.slice(params.caretOffset);
  const newText = before + replacement + after;
  const newCaretOffset = params.tokenStartOffset + replacement.length;

  return { text: newText, caretOffset: newCaretOffset };
}
