/**
 * @file XlsxWorkbookToolbar
 *
 * Minimal toolbar: Undo/Redo + active address + formula/value bar.
 */

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Button, Input, spacingTokens } from "../../../office-editor-components";
import { indexToColumnLetter, type CellAddress } from "../../../xlsx/domain/cell/address";
import { colIdx, rowIdx, styleId } from "../../../xlsx/domain/types";
import { parseCellUserInput } from "../cell-input/parse-cell-user-input";
import { formatCellEditText } from "../cell-input/format-cell-edit-text";
import { useXlsxWorkbookEditor } from "../../context/workbook/XlsxWorkbookEditorContext";

export type XlsxWorkbookToolbarProps = {
  readonly sheetIndex: number;
};

const barStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
  padding: spacingTokens.sm,
  border: "1px solid var(--border-subtle)",
  borderRadius: 8,
};

const addressInputStyle: CSSProperties = {
  width: 90,
};

const formulaInputStyle: CSSProperties = {
  flex: 1,
  minWidth: 120,
};

function createA1AddressText(address: CellAddress): string {
  const col = indexToColumnLetter(colIdx(address.col as number));
  const row = String(address.row as number);
  return `${col}${row}`;
}

function getDefaultActiveCell(): CellAddress {
  return { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false };
}

function getTargetRange(params: { readonly activeCell: CellAddress | undefined; readonly selectedRange: { readonly start: CellAddress; readonly end: CellAddress } | undefined }) {
  if (params.selectedRange) {
    return params.selectedRange;
  }
  if (params.activeCell) {
    return { start: params.activeCell, end: params.activeCell };
  }
  return undefined;
}

export function XlsxWorkbookToolbar({ sheetIndex }: XlsxWorkbookToolbarProps) {
  const { dispatch, workbook, canUndo, canRedo, selection, state } = useXlsxWorkbookEditor();
  const sheet = workbook.sheets[sheetIndex];
  if (!sheet) {
    throw new Error(`Sheet not found: index=${sheetIndex}`);
  }

  const activeCell = selection.activeCell;
  const activeCellText = useMemo(() => {
    return activeCell ? createA1AddressText(activeCell) : "";
  }, [activeCell]);

  const [input, setInput] = useState("");
  const [styleIdInput, setStyleIdInput] = useState<string>("");

  useEffect(() => {
    if (!activeCell) {
      setInput("");
      return;
    }
    setInput(formatCellEditText(sheet, activeCell));
  }, [activeCell, sheet]);

  const commit = useCallback(() => {
    const address = activeCell ?? getDefaultActiveCell();
    dispatch({ type: "SELECT_CELL", address });

    const result = parseCellUserInput(input);
    if (result.type === "formula") {
      dispatch({ type: "SET_CELL_FORMULA", address, formula: result.formula });
      return;
    }
    dispatch({ type: "UPDATE_CELL", address, value: result.value });
  }, [activeCell, dispatch, input]);

  const disableInputs = state.editingCell !== undefined;
  const targetRange = useMemo(() => getTargetRange({ activeCell, selectedRange: selection.selectedRange }), [activeCell, selection.selectedRange]);
  const parsedStyleId = useMemo(() => {
    if (styleIdInput.trim().length === 0) {
      return undefined;
    }
    const n = Number.parseInt(styleIdInput, 10);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      return undefined;
    }
    return styleId(n);
  }, [styleIdInput]);

  return (
    <div style={barStyle}>
      <Button
        size="sm"
        disabled={!canUndo}
        onClick={() => dispatch({ type: "UNDO" })}
      >
        Undo
      </Button>
      <Button
        size="sm"
        disabled={!canRedo}
        onClick={() => dispatch({ type: "REDO" })}
      >
        Redo
      </Button>

      <Input
        value={activeCellText}
        placeholder="A1"
        readOnly
        onChange={() => undefined}
        style={addressInputStyle}
      />

      <Input
        value={styleIdInput}
        placeholder="styleId"
        disabled={disableInputs}
        style={{ width: 90 }}
        onChange={(value) => setStyleIdInput(String(value))}
      />
      <Button
        size="sm"
        disabled={!targetRange || !parsedStyleId || disableInputs}
        onClick={() => {
          if (!targetRange || !parsedStyleId) {
            return;
          }
          dispatch({ type: "APPLY_STYLE", range: targetRange, styleId: parsedStyleId });
        }}
      >
        Apply style
      </Button>
      <Button
        size="sm"
        disabled={!targetRange || disableInputs}
        onClick={() => {
          if (!targetRange) {
            return;
          }
          dispatch({ type: "MERGE_CELLS", range: targetRange });
        }}
      >
        Merge
      </Button>
      <Button
        size="sm"
        disabled={!targetRange || disableInputs}
        onClick={() => {
          if (!targetRange) {
            return;
          }
          dispatch({ type: "UNMERGE_CELLS", range: targetRange });
        }}
      >
        Unmerge
      </Button>

      <Input
        value={input}
        placeholder={activeCell ? "Value or =Formula" : "Select a cell"}
        disabled={!activeCell || disableInputs}
        style={formulaInputStyle}
        onChange={(value) => setInput(String(value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            if (activeCell) {
              setInput(formatCellEditText(sheet, activeCell));
            } else {
              setInput("");
            }
          }
        }}
      />
    </div>
  );
}
