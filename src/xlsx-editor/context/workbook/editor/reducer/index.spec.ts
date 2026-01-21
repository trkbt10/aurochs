/**
 * @file XLSX Editor Reducer tests
 */

import type { CellAddress } from "../../../../../xlsx/domain/cell/address";
import type { XlsxWorkbook, XlsxWorksheet } from "../../../../../xlsx/domain/workbook";
import { createDefaultStyleSheet } from "../../../../../xlsx/domain/style/types";
import { colIdx, rowIdx } from "../../../../../xlsx/domain/types";
import { getCellValue } from "../../../../cell/query";
import { createHistory, pushHistory } from "../../state/history";
import { createEmptyCellSelection, createIdleDragState } from "../types";
import type { XlsxEditorState } from "../types";
import { createInitialState, xlsxEditorReducer } from "./index";

function addr(col: number, row: number): CellAddress {
  return {
    col: colIdx(col),
    row: rowIdx(row),
    colAbsolute: false,
    rowAbsolute: false,
  };
}

function createWorksheet(name: string, sheetId: number): XlsxWorksheet {
  return {
    dateSystem: "1900",
    name,
    sheetId,
    state: "visible",
    xmlPath: `xl/worksheets/sheet${sheetId}.xml`,
    rows: [],
  };
}

function createWorkbook(sheets: readonly XlsxWorksheet[]): XlsxWorkbook {
  return {
    dateSystem: "1900",
    sheets,
    styles: createDefaultStyleSheet(),
    sharedStrings: [],
  };
}

describe("xlsx-editor/context/workbook/editor/reducer/index", () => {
  it("createInitialState builds the initial state", () => {
    const workbook = createWorkbook([createWorksheet("Sheet1", 1)]);
    const state = createInitialState(workbook);

    expect(state.workbookHistory.present).toBe(workbook);
    expect(state.workbookHistory.past).toEqual([]);
    expect(state.workbookHistory.future).toEqual([]);
    expect(state.activeSheetIndex).toBe(0);
    expect(state.cellSelection).toEqual(createEmptyCellSelection());
    expect(state.drag).toEqual(createIdleDragState());
    expect(state.clipboard).toBeUndefined();
    expect(state.editingCell).toBeUndefined();
  });

  it("createInitialState sets activeSheetIndex undefined when workbook has no sheets", () => {
    const workbook = createWorkbook([]);
    const state = createInitialState(workbook);
    expect(state.activeSheetIndex).toBeUndefined();
  });

  it("xlsxEditorReducer dispatches selection and cell actions", () => {
    const workbook = createWorkbook([createWorksheet("Sheet1", 1)]);
    // eslint-disable-next-line no-restricted-syntax -- test requires sequential state updates
    let state = createInitialState(workbook);

    state = xlsxEditorReducer(state, { type: "SELECT_CELL", address: addr(2, 3) });
    expect(state.cellSelection.activeCell).toEqual(addr(2, 3));

    state = xlsxEditorReducer(state, {
      type: "UPDATE_CELL",
      address: addr(2, 3),
      value: { type: "string", value: "B3" },
    });

    expect(state.workbookHistory.past).toHaveLength(1);
    const sheet = state.workbookHistory.present.sheets[0];
    expect(getCellValue(sheet, addr(2, 3))).toEqual({ type: "string", value: "B3" });
  });

  it("COMMIT_CELL_EDIT updates a cell and exits editing mode", () => {
    const workbook = createWorkbook([createWorksheet("Sheet1", 1)]);
    // eslint-disable-next-line no-restricted-syntax -- test requires sequential state updates
    let state = createInitialState(workbook);

    state = xlsxEditorReducer(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1) });
    expect(state.editingCell).toEqual(addr(1, 1));

    state = xlsxEditorReducer(state, {
      type: "COMMIT_CELL_EDIT",
      value: { type: "number", value: 123 },
    });

    expect(state.editingCell).toBeUndefined();
    const sheet = state.workbookHistory.present.sheets[0];
    expect(getCellValue(sheet, addr(1, 1))).toEqual({ type: "number", value: 123 });
  });

  it("UNDO/REDO updates workbook history and normalizes activeSheetIndex", () => {
    const workbook1 = createWorkbook([createWorksheet("Sheet1", 1)]);
    const workbook2 = createWorkbook([
      createWorksheet("Sheet1", 1),
      createWorksheet("Sheet2", 2),
    ]);

    const workbookHistory = pushHistory(createHistory(workbook1), workbook2);
    const stateAfterAdd: XlsxEditorState = {
      workbookHistory,
      activeSheetIndex: 1,
      cellSelection: createEmptyCellSelection(),
      drag: createIdleDragState(),
      clipboard: undefined,
      editingCell: undefined,
    };

    const undone = xlsxEditorReducer(stateAfterAdd, { type: "UNDO" });
    expect(undone.workbookHistory.present).toBe(workbook1);
    expect(undone.activeSheetIndex).toBe(0);

    const redone = xlsxEditorReducer(undone, { type: "REDO" });
    expect(redone.workbookHistory.present).toBe(workbook2);
    expect(redone.activeSheetIndex).toBe(0);
  });
});
