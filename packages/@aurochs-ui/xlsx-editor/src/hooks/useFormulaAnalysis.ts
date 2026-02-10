/**
 * @file useFormulaAnalysis
 *
 * Hook that computes formula analysis as derived state from the editing context.
 * Returns `FormulaAnalysis` when editing a formula, or `undefined` otherwise.
 *
 * The analysis is recomputed via `useMemo` whenever the editing text or caret position changes.
 */

import { useMemo } from "react";
import { useXlsxWorkbookEditor } from "../context/workbook/XlsxWorkbookEditorContext";
import { analyzeFormula } from "../formula-edit/formula-analysis";
import type { FormulaAnalysis } from "../formula-edit/types";

/**
 * Compute formula analysis from the current editing state.
 *
 * @returns `FormulaAnalysis` when editing in formula mode, `undefined` otherwise.
 */
export function useFormulaAnalysis(): FormulaAnalysis | undefined {
  const { editing } = useXlsxWorkbookEditor();

  return useMemo(() => {
    if (!editing || !editing.isFormulaMode) {
      return undefined;
    }
    return analyzeFormula(editing.text, editing.caretOffset);
  }, [editing?.text, editing?.caretOffset, editing?.isFormulaMode]);
}
