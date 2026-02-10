/**
 * @file XlsxCellEditorOverlay
 *
 * Inline cell editor overlay positioned over the active cell.
 * Reads and writes text via the unified editing state in the reducer.
 *
 * Supports:
 * - Standard spreadsheet keyboard shortcuts (Enter/Tab commit+move, Escape cancel)
 * - IME composition events (compositionstart/update/end)
 * - IME guard: keyDown events are suppressed during composition
 */

import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from "react";
import type { CellAddress } from "@aurochs-office/xlsx/domain/cell/address";
import type { XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import { colorTokens } from "@aurochs-ui/ui-components";
import { useXlsxWorkbookEditor } from "../../context/workbook/XlsxWorkbookEditorContext";
import { createIdleComposition } from "../../context/workbook/editor/types";
import { getCellEditKeyAction } from "../../hooks/useCellEditKeyboard";
import { useFormulaAutocomplete } from "../../hooks/useFormulaAutocomplete";
import { acceptAutocomplete } from "../../formula-edit/formula-autocomplete";
import { FormulaAutocompleteDropdown } from "./FormulaAutocompleteDropdown";
import { getCell } from "../../cell/query";
import { resolveCellRenderStyle } from "../../selectors/cell-render-style";

export type CellRect = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

export type XlsxCellEditorOverlayProps = {
  readonly sheet: XlsxWorksheet;
  readonly address: CellAddress;
  readonly rect: CellRect;
  /** Called after COMMIT_CELL_EDIT; direction indicates which cell to move to next. */
  readonly onCommitAndMove: (direction: "down" | "up" | "right" | "left") => void;
  readonly onCancel: () => void;
};

const inputStyleBase: CSSProperties = {
  position: "absolute",
  boxSizing: "border-box",
  border: `2px solid var(--accent, ${colorTokens.accent.primary})`,
  outline: "none",
  padding: "0 6px",
  fontSize: 12,
  backgroundColor: `var(--bg-primary, ${colorTokens.background.primary})`,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
};

/**
 * Inline cell editor overlay shown on top of the active cell.
 *
 * Reads text from the unified `editing` state and dispatches `UPDATE_EDIT_TEXT` on input changes.
 * Handles IME composition by dispatching `SET_COMPOSITION` and guarding keyDown during composing.
 */
export function XlsxCellEditorOverlay({ sheet, address, rect, onCommitAndMove, onCancel }: XlsxCellEditorOverlayProps) {
  const { state, dispatch, workbook } = useXlsxWorkbookEditor();
  const editing = state.editing;
  const text = editing?.text ?? "";
  const isComposing = editing?.composition.isComposing ?? false;

  const autocomplete = useFormulaAutocomplete();

  // Inherit cell style (font, color) for non-formula mode editing
  const cellStyle = useMemo<CSSProperties>(() => {
    if (editing?.isFormulaMode) {
      return {};
    }
    const cell = getCell(sheet, address);
    const css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address, cell });
    return {
      fontFamily: css.fontFamily,
      fontSize: css.fontSize,
      fontWeight: css.fontWeight,
      fontStyle: css.fontStyle,
      color: css.color,
    };
  }, [editing?.isFormulaMode, sheet, address, workbook.styles]);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) {
      return;
    }
    el.focus();
    if (editing?.entryMode !== "replace") {
      el.select();
    } else {
      // In replace mode, put caret at end (after the initial character)
      el.setSelectionRange(text.length, text.length);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newText = e.currentTarget.value;
      const caretOffset = e.currentTarget.selectionStart ?? newText.length;
      dispatch({
        type: "UPDATE_EDIT_TEXT",
        text: newText,
        caretOffset,
        selectionEnd: e.currentTarget.selectionEnd ?? caretOffset,
      });
    },
    [dispatch],
  );

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

      const action = getCellEditKeyAction(e.key, e.shiftKey, isComposing);
      if (!action) {
        // IME composing — let the event pass through to the input
        return;
      }

      if (action.type === "commit_and_move") {
        e.preventDefault();
        dispatch({ type: "COMMIT_CELL_EDIT" });
        onCommitAndMove(action.direction);
        return;
      }

      if (action.type === "cancel") {
        e.preventDefault();
        onCancel();
        return;
      }

      // passthrough — let the input handle it natively (arrow keys, characters, etc.)
    },
    [autocomplete, dispatch, isComposing, onCancel, onCommitAndMove],
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

      // After composition ends, the input value is already updated.
      // Sync the final text to the editing state.
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
      const result = acceptAutocomplete(
        editing.text,
        autocomplete.context.tokenStartOffset,
        editing.caretOffset,
        fn.name,
      );
      dispatch({
        type: "UPDATE_EDIT_TEXT",
        text: result.text,
        caretOffset: result.caretOffset,
        selectionEnd: result.caretOffset,
      });
    },
    [editing, autocomplete.context, autocomplete.candidates, dispatch],
  );

  return (
    <div style={{ position: "absolute", left: rect.left, top: rect.top, width: rect.width, height: rect.height }}>
      <input
        ref={inputRef}
        data-testid="xlsx-cell-editor"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionUpdate={handleCompositionUpdate}
        onCompositionEnd={handleCompositionEnd}
        style={{
          ...inputStyleBase,
          ...cellStyle,
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
        }}
      />
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
