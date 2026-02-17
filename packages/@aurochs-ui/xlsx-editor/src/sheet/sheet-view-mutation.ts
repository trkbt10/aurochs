/**
 * @file Sheet View mutation operations
 *
 * Operations for managing sheet view settings (freeze panes, split view).
 */

import type { XlsxWorkbook, XlsxWorksheet, XlsxSheetView, XlsxPane } from "@aurochs-office/xlsx/domain/workbook";

function assertValidSheetIndex(workbook: XlsxWorkbook, sheetIndex: number): void {
  if (!Number.isInteger(sheetIndex)) {
    throw new Error("sheetIndex must be an integer");
  }
  if (sheetIndex < 0 || sheetIndex >= workbook.sheets.length) {
    throw new Error(`sheetIndex out of range: ${sheetIndex}`);
  }
}

function updateSheet(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  update: Partial<XlsxWorksheet>,
): XlsxWorkbook {
  const sheets = workbook.sheets.map((sheet, idx) =>
    idx === sheetIndex ? { ...sheet, ...update } : sheet,
  );
  return { ...workbook, sheets };
}

/**
 * Set the sheet view configuration
 */
export function setSheetView(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  sheetView: XlsxSheetView | undefined,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  return updateSheet(workbook, sheetIndex, { sheetView });
}

/**
 * Set freeze panes configuration
 */
export function setFreezePane(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  pane: XlsxPane | undefined,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  const sheet = workbook.sheets[sheetIndex];
  const currentView = sheet.sheetView ?? {};

  const newView: XlsxSheetView = {
    ...currentView,
    pane,
  };

  return setSheetView(workbook, sheetIndex, newView);
}

/**
 * Freeze rows at a specific position
 */
export function freezeRows(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  rowCount: number,
): XlsxWorkbook {
  if (rowCount <= 0) {
    return setFreezePane(workbook, sheetIndex, undefined);
  }

  const pane: XlsxPane = {
    ySplit: rowCount,
    topLeftCell: `A${rowCount + 1}`,
    activePane: "bottomLeft",
    state: "frozen",
  };

  return setFreezePane(workbook, sheetIndex, pane);
}

/**
 * Freeze columns at a specific position
 */
export function freezeColumns(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  colCount: number,
): XlsxWorkbook {
  if (colCount <= 0) {
    return setFreezePane(workbook, sheetIndex, undefined);
  }

  // Convert column count to letter
  const colLetter = String.fromCharCode(64 + colCount + 1); // A=65, so col 1 frozen means B1

  const pane: XlsxPane = {
    xSplit: colCount,
    topLeftCell: `${colLetter}1`,
    activePane: "topRight",
    state: "frozen",
  };

  return setFreezePane(workbook, sheetIndex, pane);
}

/**
 * Freeze both rows and columns
 */
export function freezeRowsAndColumns(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  rowCount: number,
  colCount: number,
): XlsxWorkbook {
  if (rowCount <= 0 && colCount <= 0) {
    return setFreezePane(workbook, sheetIndex, undefined);
  }

  // Convert column count to letter
  const colLetter = colCount > 0
    ? String.fromCharCode(64 + colCount + 1)
    : "A";
  const row = rowCount > 0 ? rowCount + 1 : 1;

  const pane: XlsxPane = {
    xSplit: colCount > 0 ? colCount : undefined,
    ySplit: rowCount > 0 ? rowCount : undefined,
    topLeftCell: `${colLetter}${row}`,
    activePane: "bottomRight",
    state: "frozen",
  };

  return setFreezePane(workbook, sheetIndex, pane);
}

/**
 * Unfreeze panes
 */
export function unfreezePanes(
  workbook: XlsxWorkbook,
  sheetIndex: number,
): XlsxWorkbook {
  return setFreezePane(workbook, sheetIndex, undefined);
}
