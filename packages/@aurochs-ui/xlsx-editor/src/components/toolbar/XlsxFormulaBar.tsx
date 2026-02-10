/**
 * @file XlsxFormulaBar
 *
 * Formula bar component that synchronizes with the unified cell editing state.
 * When editing is active, it reads/writes from `editing.text`.
 * When not editing, it displays the active cell's value as read-only.
 * Clicking into the bar when not editing starts formula-bar-mode editing.
 *
 * Supports standard spreadsheet keyboard shortcuts:
 * - Enter: commit + move down (Shift+Enter: up)
 * - Tab: commit + move right (Shift+Tab: left)
 * - Escape: cancel edit
 * - IME guard: keyDown is suppressed during composition
 */

import { useCallback, useMemo, type ChangeEvent, type CSSProperties } from "react";
import type { XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import { Input } from "@aurochs-ui/ui-components";
import { useXlsxWorkbookEditor } from "../../context/workbook/XlsxWorkbookEditorContext";
import { formatCellEditText } from "../cell-input/format-cell-edit-text";
import { createIdleComposition } from "../../context/workbook/editor/types";
import { getCellEditKeyAction } from "../../hooks/useCellEditKeyboard";
import { useFormulaAutocomplete } from "../../hooks/useFormulaAutocomplete";
import { useFormulaAnalysis } from "../../hooks/useFormulaAnalysis";
import { acceptAutocomplete } from "../../formula-edit/formula-autocomplete";
import { FormulaAutocompleteDropdown } from "../cell-input/FormulaAutocompleteDropdown";
import { FormulaBarSyntaxOverlay } from "./FormulaBarSyntaxOverlay";

export type XlsxFormulaBarProps = {
  readonly sheet: XlsxWorksheet;
  readonly style?: CSSProperties;
  /** Called after COMMIT_CELL_EDIT from the formula bar; direction indicates next cell. */
  readonly onCommitAndMove?: (direction: "down" | "up" | "right" | "left") => void;
};

/**
 * Formula bar input synchronized with the unified cell editing state.
 *
 * - Non-editing: displays active cell's value/formula, read-only style.
 *   Clicking starts editing in "formulaBar" mode.
 * - Editing: reads `editing.text`, writes via `UPDATE_EDIT_TEXT`.
 *   Enter/Tab commits, Escape cancels.
 */
export function XlsxFormulaBar({ sheet, style, onCommitAndMove }: XlsxFormulaBarProps) {
  const { dispatch, selection, editing } = useXlsxWorkbookEditor();
  const activeCell = selection.activeCell;
  const autocomplete = useFormulaAutocomplete();
  const analysis = useFormulaAnalysis();

  const displayText = useMemo(() => {
    if (editing) {
      return editing.text;
    }
    if (!activeCell) {
      return "";
    }
    return formatCellEditText(sheet, activeCell);
  }, [editing, activeCell, sheet]);

  const handleChange = useCallback(
    (_value: string | number) => {
      // no-op: actual handling is in handleInputChange which has access to the DOM event
    },
    [],
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const text = e.currentTarget.value;
      const caretOffset = e.currentTarget.selectionStart ?? text.length;
      const selectionEnd = e.currentTarget.selectionEnd ?? caretOffset;
      if (!editing) {
        // Start editing from formula bar on first change
        if (!activeCell) {
          return;
        }
        dispatch({ type: "ENTER_CELL_EDIT", address: activeCell, entryMode: "formulaBar" });
        dispatch({ type: "UPDATE_EDIT_TEXT", text, caretOffset, selectionEnd });
        return;
      }
      dispatch({ type: "UPDATE_EDIT_TEXT", text, caretOffset, selectionEnd });
    },
    [activeCell, dispatch, editing],
  );

  const handleSelect = useCallback(
    (e: React.SyntheticEvent<HTMLInputElement>) => {
      if (!editing) {
        return;
      }
      const el = e.currentTarget;
      const caretOffset = el.selectionStart ?? editing.caretOffset;
      const selectionEnd = el.selectionEnd ?? caretOffset;
      if (caretOffset !== editing.caretOffset || selectionEnd !== editing.selectionEnd) {
        dispatch({ type: "UPDATE_EDIT_TEXT", text: editing.text, caretOffset, selectionEnd });
      }
    },
    [dispatch, editing],
  );

  const handleFocus = useCallback(() => {
    if (!editing && activeCell) {
      dispatch({ type: "ENTER_CELL_EDIT", address: activeCell, entryMode: "formulaBar" });
    } else if (editing && editing.origin !== "formulaBar") {
      dispatch({ type: "SET_EDIT_ORIGIN", origin: "formulaBar" });
    }
  }, [activeCell, dispatch, editing]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Autocomplete key interception
      if (autocomplete.isOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          autocomplete.moveHighlight(1);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          autocomplete.moveHighlight(-1);
          return;
        }
        if (e.key === "Tab" || e.key === "Enter") {
          e.preventDefault();
          autocomplete.accept();
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          autocomplete.dismiss();
          return;
        }
      }

      // IME guard: use nativeEvent.isComposing since Input doesn't forward composition events
      const isComposing = e.nativeEvent.isComposing;
      const action = getCellEditKeyAction(e.key, e.shiftKey, isComposing);

      if (!action) {
        // IME composing — let the event pass through
        return;
      }

      if (action.type === "commit_and_move") {
        e.preventDefault();
        if (editing) {
          dispatch({ type: "COMMIT_CELL_EDIT" });
          onCommitAndMove?.(action.direction);
        }
        return;
      }

      if (action.type === "cancel") {
        e.preventDefault();
        if (editing) {
          dispatch({ type: "EXIT_CELL_EDIT" });
        }
        return;
      }

      // passthrough
    },
    [autocomplete, dispatch, editing, onCommitAndMove],
  );

  const handleCompositionStart = useCallback(
    (e: React.CompositionEvent<HTMLInputElement>) => {
      dispatch({
        type: "SET_COMPOSITION",
        composition: {
          isComposing: true,
          text: "",
          startOffset: e.currentTarget.selectionStart ?? 0,
        },
      });
    },
    [dispatch],
  );

  const handleCompositionUpdate = useCallback(
    (e: React.CompositionEvent<HTMLInputElement>) => {
      dispatch({
        type: "SET_COMPOSITION",
        composition: {
          isComposing: true,
          text: e.data,
          startOffset: editing?.composition.startOffset ?? 0,
        },
      });
    },
    [dispatch, editing?.composition.startOffset],
  );

  const handleCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLInputElement>) => {
      dispatch({ type: "SET_COMPOSITION", composition: createIdleComposition() });
      const el = e.currentTarget;
      const newText = el.value;
      const caretOffset = el.selectionStart ?? newText.length;
      dispatch({
        type: "UPDATE_EDIT_TEXT",
        text: newText,
        caretOffset,
        selectionEnd: el.selectionEnd ?? caretOffset,
      });
    },
    [dispatch],
  );

  const handleAutocompleteSelect = useCallback(
    (index: number) => {
      if (!editing || !autocomplete.context) {
        return;
      }
      const fn = autocomplete.candidates[index];
      if (!fn) {
        return;
      }
      const result = acceptAutocomplete({
        editingText: editing.text,
        tokenStartOffset: autocomplete.context.tokenStartOffset,
        caretOffset: editing.caretOffset,
        functionName: fn.name,
      });
      dispatch({
        type: "UPDATE_EDIT_TEXT",
        text: result.text,
        caretOffset: result.caretOffset,
        selectionEnd: result.caretOffset,
      });
    },
    [editing, autocomplete.context, autocomplete.candidates, dispatch],
  );

  const isFormulaMode = editing?.isFormulaMode === true;
  // eslint-disable-next-line no-restricted-syntax -- assigned conditionally via if/else
  let inputStyle: CSSProperties;
  if (isFormulaMode) {
    inputStyle = { ...style, color: "transparent", caretColor: "var(--text-primary, #222)" };
  } else {
    inputStyle = { ...style };
  }

  return (
    <div style={{ position: "relative", flex: 1 }}>
      <Input
        value={displayText}
        placeholder={activeCell ? "Value or =Formula" : "Select a cell"}
        disabled={!activeCell}
        style={inputStyle}
        onChange={handleChange}
        onInputChange={handleInputChange}
        onFocus={handleFocus}
        onSelect={handleSelect}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionUpdate={handleCompositionUpdate}
        onCompositionEnd={handleCompositionEnd}
      />
      {isFormulaMode && analysis && (
        <FormulaBarSyntaxOverlay
          text={displayText}
          tokens={analysis.tokens}
          references={analysis.references}
        />
      )}
      {autocomplete.isOpen && (
        <FormulaAutocompleteDropdown
          candidates={autocomplete.candidates}
          highlightedIndex={autocomplete.highlightedIndex}
          onSelect={handleAutocompleteSelect}
        />
      )}
    </div>
  );
}
