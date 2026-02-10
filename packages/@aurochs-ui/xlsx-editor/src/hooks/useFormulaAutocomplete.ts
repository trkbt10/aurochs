/**
 * @file useFormulaAutocomplete
 *
 * Hook that derives autocomplete state from the current formula analysis.
 * Returns candidates, highlighted index, and action callbacks.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import type { FormulaFunctionDefinition } from "@aurochs-office/xlsx/formula/functionRegistry";
import { useXlsxWorkbookEditor } from "../context/workbook/XlsxWorkbookEditorContext";
import { useFormulaAnalysis } from "./useFormulaAnalysis";
import {
  detectAutocompleteContext,
  filterFunctions,
  acceptAutocomplete,
  type AutocompleteContext,
} from "../formula-edit/formula-autocomplete";

export type FormulaAutocompleteState = {
  readonly isOpen: boolean;
  readonly candidates: readonly FormulaFunctionDefinition[];
  readonly highlightedIndex: number;
  readonly context: AutocompleteContext | undefined;
  readonly accept: () => void;
  readonly dismiss: () => void;
  readonly moveHighlight: (delta: number) => void;
};

/**
 * Hook that derives autocomplete state from the current formula editing context.
 */
export function useFormulaAutocomplete(): FormulaAutocompleteState {
  const { editing, dispatch } = useXlsxWorkbookEditor();
  const analysis = useFormulaAnalysis();

  const [forceClosed, setForceClosed] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const lastQueryRef = useRef<string>("");

  const context = useMemo(() => {
    if (!analysis || !editing) {
      return undefined;
    }
    return detectAutocompleteContext(analysis.tokens, editing.caretOffset);
  }, [analysis, editing?.caretOffset]);

  const candidates = useMemo(() => {
    if (!context?.shouldOpen) {
      return [];
    }
    return filterFunctions(context.query);
  }, [context?.shouldOpen, context?.query]);

  // Reset forceClosed and highlight when the query changes
  if (context?.query !== lastQueryRef.current) {
    lastQueryRef.current = context?.query ?? "";
    if (forceClosed) {
      setForceClosed(false);
    }
    if (highlightedIndex !== 0) {
      setHighlightedIndex(0);
    }
  }

  const isOpen = !forceClosed && context?.shouldOpen === true && candidates.length > 0;

  const accept = useCallback(() => {
    if (!editing || !context || candidates.length === 0) {
      return;
    }
    const idx = Math.min(highlightedIndex, candidates.length - 1);
    const fn = candidates[idx];
    const result = acceptAutocomplete({
      editingText: editing.text,
      tokenStartOffset: context.tokenStartOffset,
      caretOffset: editing.caretOffset,
      functionName: fn.name,
    });
    dispatch({
      type: "UPDATE_EDIT_TEXT",
      text: result.text,
      caretOffset: result.caretOffset,
      selectionEnd: result.caretOffset,
    });
    setForceClosed(false);
  }, [editing, context, candidates, highlightedIndex, dispatch]);

  const dismiss = useCallback(() => {
    setForceClosed(true);
  }, []);

  const moveHighlight = useCallback(
    (delta: number) => {
      if (candidates.length === 0) {
        return;
      }
      setHighlightedIndex((prev) => {
        const next = prev + delta;
        if (next < 0) {
          return candidates.length - 1;
        }
        if (next >= candidates.length) {
          return 0;
        }
        return next;
      });
    },
    [candidates.length],
  );

  return {
    isOpen,
    candidates,
    highlightedIndex,
    context,
    accept,
    dismiss,
    moveHighlight,
  };
}
