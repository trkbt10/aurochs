/**
 * @file XlsxWorkbookToolbar
 *
 * Minimal toolbar: Undo/Redo + active address + formula/value bar.
 */

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon, Button, Input, ToggleButton, spacingTokens, MergeCellsIcon, UnmergeCellsIcon } from "../../../office-editor-components";
import { indexToColumnLetter, type CellAddress, type CellRange } from "../../../xlsx/domain/cell/address";
import { colIdx, rowIdx, styleId } from "../../../xlsx/domain/types";
import { StylePicker } from "./StylePicker";
import { parseCellUserInput } from "../cell-input/parse-cell-user-input";
import { formatCellEditText } from "../cell-input/format-cell-edit-text";
import { useXlsxWorkbookEditor } from "../../context/workbook/XlsxWorkbookEditorContext";
import { getCell } from "../../cell/query";
import { resolveCellStyleDetails } from "../../selectors/cell-style-details";
import { resolveSelectionFormatFlags } from "../../selectors/selection-format-flags";
import type { XlsxFont } from "../../../xlsx/domain/style/font";
import type { XlsxAlignment } from "../../../xlsx/domain/style/types";

export type XlsxWorkbookToolbarProps = {
  readonly sheetIndex: number;
  readonly isFormatPanelOpen: boolean;
  readonly onToggleFormatPanel: () => void;
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

function getTargetRange(params: { readonly activeCell: CellAddress | undefined; readonly selectedRange: CellRange | undefined }): CellRange | undefined {
  if (params.selectedRange) {
    return params.selectedRange;
  }
  if (params.activeCell) {
    return { start: params.activeCell, end: params.activeCell };
  }
  return undefined;
}

function toggleFontFlag(font: XlsxFont, flag: "bold" | "italic", pressed: boolean): XlsxFont {
  if (flag === "bold") {
    return { ...font, bold: pressed ? true : undefined };
  }
  return { ...font, italic: pressed ? true : undefined };
}

function setUnderline(font: XlsxFont, pressed: boolean): XlsxFont {
  return { ...font, underline: pressed ? "single" : undefined };
}

function setHorizontalAlignment(baseAlignment: XlsxAlignment | undefined, horizontal: XlsxAlignment["horizontal"]): XlsxAlignment {
  return { ...(baseAlignment ?? {}), horizontal };
}

function clearHorizontalAlignment(baseAlignment: XlsxAlignment | undefined): XlsxAlignment | null {
  if (!baseAlignment) {
    return null;
  }
  const { horizontal: removed, ...rest } = baseAlignment;
  void removed;
  return Object.keys(rest).length === 0 ? null : rest;
}

/**
 * Workbook toolbar for a single sheet.
 *
 * Provides undo/redo and a simple formula/value bar bound to the current selection.
 */
export function XlsxWorkbookToolbar({ sheetIndex, isFormatPanelOpen, onToggleFormatPanel }: XlsxWorkbookToolbarProps) {
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

  const styleDetails = useMemo(() => {
    if (!activeCell) {
      return undefined;
    }
    const cell = getCell(sheet, activeCell);
    return resolveCellStyleDetails({ styles: workbook.styles, sheet, address: activeCell, cell });
  }, [activeCell, sheet, workbook.styles]);

  const font = styleDetails?.font;
  const baseAlignment = styleDetails?.xf.alignment;
  const toolbarCanFormat = Boolean(targetRange && font && !disableInputs);
  const selectionFormatFlags = useMemo(() => {
    if (!targetRange) {
      return undefined;
    }
    return resolveSelectionFormatFlags({ sheet, styles: workbook.styles, range: targetRange });
  }, [sheet, targetRange, workbook.styles]);

  const selectedHorizontalAlignment = selectionFormatFlags?.horizontal;
  const horizontalMixed = selectedHorizontalAlignment?.mixed ?? false;
  const horizontalValue = selectedHorizontalAlignment && !selectedHorizontalAlignment.mixed ? selectedHorizontalAlignment.value : undefined;
  const alignLeftPressed = !horizontalMixed && horizontalValue === "left";
  const alignCenterPressed = !horizontalMixed && horizontalValue === "center";
  const alignRightPressed = !horizontalMixed && horizontalValue === "right";

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

      <Button size="sm" onClick={onToggleFormatPanel} disabled={disableInputs}>
        {isFormatPanelOpen ? "Hide format" : "Show format"}
      </Button>

      <ToggleButton
        label="B"
        pressed={font?.bold === true}
        mixed={selectionFormatFlags?.bold.mixed ?? false}
        disabled={!toolbarCanFormat}
        onChange={(pressed) => {
          if (!targetRange || !font) {
            return;
          }
          dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { font: toggleFontFlag(font, "bold", pressed) } });
        }}
      />
      <ToggleButton
        label="I"
        pressed={font?.italic === true}
        mixed={selectionFormatFlags?.italic.mixed ?? false}
        disabled={!toolbarCanFormat}
        onChange={(pressed) => {
          if (!targetRange || !font) {
            return;
          }
          dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { font: toggleFontFlag(font, "italic", pressed) } });
        }}
      />
      <ToggleButton
        label="U"
        pressed={font?.underline !== undefined && font.underline !== "none"}
        mixed={selectionFormatFlags?.underline.mixed ?? false}
        disabled={!toolbarCanFormat}
        onChange={(pressed) => {
          if (!targetRange || !font) {
            return;
          }
          dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { font: setUnderline(font, pressed) } });
        }}
      />

      <ToggleButton
        label="Align left"
        ariaLabel="Align left"
        pressed={alignLeftPressed}
        mixed={horizontalMixed}
        disabled={!targetRange || disableInputs}
        onChange={(pressed) => {
          if (!targetRange) {
            return;
          }
          if (pressed) {
            dispatch({
              type: "SET_SELECTION_FORMAT",
              range: targetRange,
              format: { alignment: setHorizontalAlignment(baseAlignment, "left") },
            });
            return;
          }
          dispatch({
            type: "SET_SELECTION_FORMAT",
            range: targetRange,
            format: { alignment: clearHorizontalAlignment(baseAlignment) },
          });
        }}
      >
        <AlignLeftIcon size={14} />
      </ToggleButton>

      <ToggleButton
        label="Align center"
        ariaLabel="Align center"
        pressed={alignCenterPressed}
        mixed={horizontalMixed}
        disabled={!targetRange || disableInputs}
        onChange={(pressed) => {
          if (!targetRange) {
            return;
          }
          if (pressed) {
            dispatch({
              type: "SET_SELECTION_FORMAT",
              range: targetRange,
              format: { alignment: setHorizontalAlignment(baseAlignment, "center") },
            });
            return;
          }
          dispatch({
            type: "SET_SELECTION_FORMAT",
            range: targetRange,
            format: { alignment: clearHorizontalAlignment(baseAlignment) },
          });
        }}
      >
        <AlignCenterIcon size={14} />
      </ToggleButton>

      <ToggleButton
        label="Align right"
        ariaLabel="Align right"
        pressed={alignRightPressed}
        mixed={horizontalMixed}
        disabled={!targetRange || disableInputs}
        onChange={(pressed) => {
          if (!targetRange) {
            return;
          }
          if (pressed) {
            dispatch({
              type: "SET_SELECTION_FORMAT",
              range: targetRange,
              format: { alignment: setHorizontalAlignment(baseAlignment, "right") },
            });
            return;
          }
          dispatch({
            type: "SET_SELECTION_FORMAT",
            range: targetRange,
            format: { alignment: clearHorizontalAlignment(baseAlignment) },
          });
        }}
      >
        <AlignRightIcon size={14} />
      </ToggleButton>

      <Input
        value={activeCellText}
        placeholder="A1"
        readOnly
        onChange={() => undefined}
        style={addressInputStyle}
      />

      <StylePicker
        styles={workbook.styles}
        currentStyleId={styleDetails?.styleId}
        disabled={!targetRange || disableInputs}
        onStyleSelect={(id) => {
          if (!targetRange) {
            return;
          }
          dispatch({ type: "APPLY_STYLE", range: targetRange, styleId: styleId(id) });
        }}
      />

      <Button
        size="sm"
        disabled={!targetRange || disableInputs}
        onClick={() => {
          if (!targetRange) {
            return;
          }
          dispatch({ type: "MERGE_CELLS", range: targetRange });
        }}
        title="Merge cells"
      >
        <MergeCellsIcon size={14} />
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
        title="Unmerge cells"
      >
        <UnmergeCellsIcon size={14} />
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
