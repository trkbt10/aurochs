/**
 * @file Clipboard handlers
 *
 * Handlers for copy, cut, and paste operations.
 */

import type { HandlerMap } from "./handler-types";
import type { XlsxClipboardContent, XlsxEditorState } from "../types";
import type { CellAddress, CellRange } from "@oxen/xlsx/domain/cell/address";
import type { Cell, CellValue } from "@oxen/xlsx/domain/cell/types";
import type { Formula } from "@oxen/xlsx/domain/cell/formula";
import type { XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import { colIdx, rowIdx, type StyleId } from "@oxen/xlsx/domain/types";
import { shiftFormulaReferences } from "@oxen/xlsx/formula/shift";
import { getCellsInRange, getCellValuesInRange } from "../../../../cell/query";
import { deleteCellRange, updateCellById } from "../../../../cell/mutation";
import { pushHistory } from "../../state/history";
import { replaceWorksheetInWorkbook } from "../../utils/worksheet-updater";

type RangeBounds = {
  readonly minRow: number;
  readonly maxRow: number;
  readonly minCol: number;
  readonly maxCol: number;
};

function getRangeBounds(range: CellRange): RangeBounds {
  const startRow = range.start.row as number;
  const endRow = range.end.row as number;
  const startCol = range.start.col as number;
  const endCol = range.end.col as number;

  return {
    minRow: Math.min(startRow, endRow),
    maxRow: Math.max(startRow, endRow),
    minCol: Math.min(startCol, endCol),
    maxCol: Math.max(startCol, endCol),
  };
}

function getActiveWorksheet(state: XlsxEditorState): XlsxWorksheet | undefined {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return undefined;
  }
  return state.workbookHistory.present.sheets[sheetIndex];
}

function getDestinationRange(
  startCol: number,
  startRow: number,
  height: number,
  width: number,
): CellRange {
  return {
    start: {
      col: colIdx(startCol),
      row: rowIdx(startRow),
      colAbsolute: false,
      rowAbsolute: false,
    },
    end: {
      col: colIdx(startCol + width - 1),
      row: rowIdx(startRow + height - 1),
      colAbsolute: false,
      rowAbsolute: false,
    },
  };
}

function buildClipboardContent(
  worksheet: XlsxWorksheet,
  range: CellRange,
  isCut: boolean,
): XlsxClipboardContent {
  const { minRow, maxRow, minCol, maxCol } = getRangeBounds(range);
  const normalizedRange: CellRange = {
    start: { col: colIdx(minCol), row: rowIdx(minRow), colAbsolute: false, rowAbsolute: false },
    end: { col: colIdx(maxCol), row: rowIdx(maxRow), colAbsolute: false, rowAbsolute: false },
  };

  const values = getCellValuesInRange(worksheet, normalizedRange);

  const styleLookup = new Map<number, Map<number, StyleId | undefined>>();
  const formulaLookup = new Map<number, Map<number, string | undefined>>();
  for (const cell of getCellsInRange(worksheet, normalizedRange)) {
    const rowNumber = cell.address.row as number;
    const colNumber = cell.address.col as number;
    const rowStyles = styleLookup.get(rowNumber) ?? new Map<number, StyleId | undefined>();
    rowStyles.set(colNumber, cell.styleId);
    styleLookup.set(rowNumber, rowStyles);

    const rowFormulas = formulaLookup.get(rowNumber) ?? new Map<number, string | undefined>();
    rowFormulas.set(colNumber, cell.formula?.expression);
    formulaLookup.set(rowNumber, rowFormulas);
  }

  const styles: (StyleId | undefined)[][] = [];
  const formulas: (string | undefined)[][] = [];
  for (let row = minRow; row <= maxRow; row++) {
    const rowStyles: (StyleId | undefined)[] = [];
    const lookup = styleLookup.get(row);
    const formulaRow: (string | undefined)[] = [];
    const formulaRowLookup = formulaLookup.get(row);
    for (let col = minCol; col <= maxCol; col++) {
      rowStyles.push(lookup?.get(col));
      formulaRow.push(formulaRowLookup?.get(col));
    }
    styles.push(rowStyles);
    formulas.push(formulaRow);
  }

  return {
    sourceRange: normalizedRange,
    isCut,
    values,
    formulas,
    styles,
  };
}

function clearSourceIfCut(
  worksheet: XlsxWorksheet,
  clipboard: XlsxClipboardContent,
): XlsxWorksheet {
  if (clipboard.isCut) {
    return deleteCellRange(worksheet, clipboard.sourceRange);
  }
  return worksheet;
}

type NonEmptyCellValue = Exclude<CellValue, { readonly type: "empty" }>;

type PasteCellPatch = {
  readonly address: CellAddress;
  readonly value: CellValue;
  readonly formula: string | undefined;
  readonly styleId: StyleId | undefined;
};

function isNonEmptyValue(value: CellValue | undefined): value is NonEmptyCellValue {
  return value !== undefined && value.type !== "empty";
}

function shouldCreateCell(patch: Omit<PasteCellPatch, "address">): boolean {
  if (patch.formula !== undefined) {
    return true;
  }
  if (isNonEmptyValue(patch.value)) {
    return true;
  }
  if (patch.styleId !== undefined && (patch.styleId as number) !== 0) {
    return true;
  }
  return false;
}

function applyStylePatch(cell: Cell, styleIdValue: StyleId | undefined): Cell {
  if (styleIdValue === undefined || (styleIdValue as number) === 0) {
    const { styleId: removed, ...without } = cell;
    void removed;
    return without;
  }
  return { ...cell, styleId: styleIdValue };
}

function applyFormulaPatch(cell: Cell, formula: string | undefined): Cell {
  if (formula === undefined) {
    return cell;
  }
  const nextFormula: Formula = { type: "normal", expression: formula };
  const { formula: removed, ...withoutFormula } = cell;
  void removed;
  return { ...withoutFormula, value: { type: "empty" }, formula: nextFormula };
}

function applyValuePatch(cell: Cell, value: CellValue): Cell {
  const { formula: removed, ...withoutFormula } = cell;
  void removed;
  return { ...withoutFormula, value };
}

function collectPastePatches(
  clipboard: XlsxClipboardContent,
  destinationStartCol: number,
  destinationStartRow: number,
): readonly PasteCellPatch[] {
  const sourceStartCol = clipboard.sourceRange.start.col as number;
  const sourceStartRow = clipboard.sourceRange.start.row as number;
  const deltaCols = destinationStartCol - sourceStartCol;
  const deltaRows = destinationStartRow - sourceStartRow;

  const values = clipboard.values;
  const formulas = clipboard.formulas;
  const styles = clipboard.styles;

  return values.flatMap((rowValues, r) => {
    return rowValues
      .map((value, c): PasteCellPatch | undefined => {
        const address: CellAddress = {
          col: colIdx(destinationStartCol + c),
          row: rowIdx(destinationStartRow + r),
          colAbsolute: false,
          rowAbsolute: false,
        };
        const rawFormula = formulas?.[r]?.[c];
        const formula = rawFormula ? shiftFormulaReferences(rawFormula, deltaCols, deltaRows) : undefined;
        const styleId = styles?.[r]?.[c];

        const patch = { address, value, formula, styleId };
        return shouldCreateCell(patch) ? patch : undefined;
      })
      .filter((patch): patch is PasteCellPatch => patch !== undefined);
  });
}

function pasteClipboardContent(
  worksheet: XlsxWorksheet,
  destinationStartCol: number,
  destinationStartRow: number,
  clipboard: XlsxClipboardContent,
): XlsxWorksheet {
  const height = clipboard.values.length;
  const width = clipboard.values[0]?.length ?? 0;
  if (height === 0 || width === 0) {
    return worksheet;
  }

  const destinationRange = getDestinationRange(
    destinationStartCol,
    destinationStartRow,
    height,
    width,
  );

  const clearedDestination = deleteCellRange(worksheet, destinationRange);
  const patches = collectPastePatches(clipboard, destinationStartCol, destinationStartRow);

  return patches.reduce((acc, patch) => {
    return updateCellById(acc, patch.address, (cell) => {
      const base = cell ?? { address: patch.address, value: { type: "empty" } as const };
      const withStyle = applyStylePatch(base, patch.styleId);
      if (patch.formula !== undefined) {
        return applyFormulaPatch(withStyle, patch.formula);
      }
      return applyValuePatch(withStyle, patch.value);
    });
  }, clearedDestination);
}

export const clipboardHandlers: HandlerMap = {
  COPY: (state) => {
    const range = state.cellSelection.selectedRange;
    const worksheet = getActiveWorksheet(state);
    if (!range || !worksheet) {
      return state;
    }

    return {
      ...state,
      clipboard: buildClipboardContent(worksheet, range, false),
    };
  },
  CUT: (state) => {
    const range = state.cellSelection.selectedRange;
    const worksheet = getActiveWorksheet(state);
    const sheetIndex = state.activeSheetIndex;
    if (!range || !worksheet || sheetIndex === undefined) {
      return state;
    }

    const clipboard = buildClipboardContent(worksheet, range, true);
    const updatedWorksheet = deleteCellRange(worksheet, range);
    const updatedWorkbook = replaceWorksheetInWorkbook(
      state.workbookHistory.present,
      sheetIndex,
      updatedWorksheet,
    );

    return {
      ...state,
      clipboard,
      workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
    };
  },
  PASTE: (state) => {
    const clipboard = state.clipboard;
    const activeCell = state.cellSelection.activeCell;
    const worksheet = getActiveWorksheet(state);
    const sheetIndex = state.activeSheetIndex;
    if (!clipboard || !activeCell || !worksheet || sheetIndex === undefined) {
      return state;
    }

    const startCol = activeCell.col as number;
    const startRow = activeCell.row as number;

    const clearedSource = clearSourceIfCut(worksheet, clipboard);

    const updatedWorksheet = pasteClipboardContent(
      clearedSource,
      startCol,
      startRow,
      clipboard,
    );

    const updatedWorkbook = replaceWorksheetInWorkbook(
      state.workbookHistory.present,
      sheetIndex,
      updatedWorksheet,
    );

    return {
      ...state,
      clipboard: clipboard.isCut ? undefined : clipboard,
      workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
    };
  },
};
