/**
 * @file Clipboard handlers
 *
 * Handlers for copy, cut, and paste operations.
 */

import type { HandlerMap } from "./handler-types";
import type { XlsxClipboardContent, XlsxEditorState } from "../types";
import type { CellAddress, CellRange } from "../../../../../xlsx/domain/cell/address";
import type { CellValue } from "../../../../../xlsx/domain/cell/types";
import type { XlsxWorksheet } from "../../../../../xlsx/domain/workbook";
import { colIdx, rowIdx, type StyleId } from "../../../../../xlsx/domain/types";
import { getCellsInRange, getCellValuesInRange } from "../../../../cell/query";
import { updateCell, deleteCellRange } from "../../../../cell/mutation";
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
  const values = getCellValuesInRange(worksheet, range);

  const { minRow, maxRow, minCol, maxCol } = getRangeBounds(range);
  const styleLookup = new Map<number, Map<number, StyleId | undefined>>();
  for (const cell of getCellsInRange(worksheet, range)) {
    const rowNumber = cell.address.row as number;
    const colNumber = cell.address.col as number;
    const rowStyles = styleLookup.get(rowNumber) ?? new Map<number, StyleId | undefined>();
    rowStyles.set(colNumber, cell.styleId);
    styleLookup.set(rowNumber, rowStyles);
  }

  const styles: (StyleId | undefined)[][] = [];
  for (let row = minRow; row <= maxRow; row++) {
    const rowStyles: (StyleId | undefined)[] = [];
    const lookup = styleLookup.get(row);
    for (let col = minCol; col <= maxCol; col++) {
      rowStyles.push(lookup?.get(col));
    }
    styles.push(rowStyles);
  }

  return {
    sourceRange: range,
    isCut,
    values,
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

type PasteUpdate = {
  readonly address: CellAddress;
  readonly value: NonEmptyCellValue;
};

function isNonEmptyValue(value: CellValue | undefined): value is NonEmptyCellValue {
  return value !== undefined && value.type !== "empty";
}

function collectPasteUpdates(
  clipboard: XlsxClipboardContent,
  destinationStartCol: number,
  destinationStartRow: number,
): readonly PasteUpdate[] {
  return clipboard.values.flatMap((rowValues, r) => {
    if (!rowValues) {
      return [];
    }
    return rowValues
      .map((value, c): PasteUpdate | undefined => {
        if (!isNonEmptyValue(value)) {
          return undefined;
        }
        const address: CellAddress = {
          col: colIdx(destinationStartCol + c),
          row: rowIdx(destinationStartRow + r),
          colAbsolute: false,
          rowAbsolute: false,
        };
        return { address, value };
      })
      .filter((update): update is PasteUpdate => update !== undefined);
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
  const updates = collectPasteUpdates(clipboard, destinationStartCol, destinationStartRow);

  return updates.reduce(
    (acc, { address, value }) => updateCell(acc, address, value),
    clearedDestination,
  );
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
