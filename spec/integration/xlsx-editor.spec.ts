import type { Cell, CellValue } from "@aurochs-office/xlsx/domain/cell/types";
import type { CellAddress, CellRange } from "@aurochs-office/xlsx/domain/cell/address";
import type { XlsxWorkbook, XlsxRow, XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import { createDefaultStyleSheet } from "@aurochs-office/xlsx/domain/style/types";
import { colIdx, rowIdx } from "@aurochs-office/xlsx/domain/types";
import { getCellValue } from "@aurochs-ui/xlsx-editor/cell/query";
import { createInitialState, xlsxEditorReducer } from "@aurochs-ui/xlsx-editor";

function addr(col: number, row: number): CellAddress {
  return {
    col: colIdx(col),
    row: rowIdx(row),
    colAbsolute: false,
    rowAbsolute: false,
  };
}

function range({
  startCol,
  startRow,
  endCol,
  endRow,
}: {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
}): CellRange {
  return { start: addr(startCol, startRow), end: addr(endCol, endRow) };
}

function cell(col: number, row: number, value: CellValue): Cell {
  return { address: addr(col, row), value };
}

function createRow(rowNumber: number, cells: readonly Cell[]): XlsxRow {
  return { rowNumber: rowIdx(rowNumber), cells };
}

function createWorksheet(name: string, sheetId: number, rows: readonly XlsxRow[]): XlsxWorksheet {
  return {
    dateSystem: "1900",
    name,
    sheetId,
    state: "visible",
    xmlPath: `xl/worksheets/sheet${sheetId}.xml`,
    rows,
  };
}

function createWorkbook(sheets: readonly XlsxWorksheet[]): XlsxWorkbook {
  return { dateSystem: "1900", sheets, styles: createDefaultStyleSheet(), sharedStrings: [] };
}

describe("xlsx-editor integration", () => {
  describe("Cell editing with Undo/Redo", () => {
    it("should support edit -> undo -> redo workflow", () => {
      const workbook = createWorkbook([createWorksheet("Sheet1", 1, [])]);
      let state = createInitialState(workbook);

      state = xlsxEditorReducer(state, {
        type: "UPDATE_CELL",
        address: addr(1, 1),
        value: { type: "number", value: 100 },
      });
      expect(getCellValue(state.workbookHistory.present.sheets[0], addr(1, 1))).toEqual({
        type: "number",
        value: 100,
      });

      state = xlsxEditorReducer(state, { type: "UNDO" });
      expect(getCellValue(state.workbookHistory.present.sheets[0], addr(1, 1))).toBeUndefined();

      state = xlsxEditorReducer(state, { type: "REDO" });
      expect(getCellValue(state.workbookHistory.present.sheets[0], addr(1, 1))).toEqual({
        type: "number",
        value: 100,
      });
    });
  });

  describe("Row insertion with cell reference update", () => {
    it("should update cell references after row insertion", () => {
      const workbook = createWorkbook([
        createWorksheet("Sheet1", 1, [createRow(3, [cell(1, 3, { type: "string", value: "A3" })])]),
      ]);
      let state = createInitialState(workbook);

      state = xlsxEditorReducer(state, { type: "INSERT_ROWS", startRow: rowIdx(2), count: 2 });

      const sheet = state.workbookHistory.present.sheets[0];
      expect(getCellValue(sheet, addr(1, 3))).toBeUndefined();
      expect(getCellValue(sheet, addr(1, 5))).toEqual({ type: "string", value: "A3" });
    });
  });

  describe("Copy/Paste workflow", () => {
    it("should copy and paste cells correctly", () => {
      const workbook = createWorkbook([
        createWorksheet("Sheet1", 1, [
          createRow(1, [cell(1, 1, { type: "string", value: "A1" }), cell(2, 1, { type: "string", value: "B1" })]),
          createRow(2, [cell(1, 2, { type: "string", value: "A2" }), cell(2, 2, { type: "string", value: "B2" })]),
        ]),
      ]);
      let state = createInitialState(workbook);

      state = xlsxEditorReducer(state, {
        type: "SELECT_RANGE",
        range: range({ startCol: 1, startRow: 1, endCol: 2, endRow: 2 }),
      });
      state = xlsxEditorReducer(state, { type: "COPY" });
      expect(state.clipboard?.isCut).toBe(false);

      state = xlsxEditorReducer(state, { type: "SELECT_CELL", address: addr(4, 4) });
      state = xlsxEditorReducer(state, { type: "PASTE" });

      const sheet = state.workbookHistory.present.sheets[0];
      expect(getCellValue(sheet, addr(4, 4))).toEqual({ type: "string", value: "A1" });
      expect(getCellValue(sheet, addr(5, 4))).toEqual({ type: "string", value: "B1" });
      expect(getCellValue(sheet, addr(4, 5))).toEqual({ type: "string", value: "A2" });
      expect(getCellValue(sheet, addr(5, 5))).toEqual({ type: "string", value: "B2" });
    });
  });
});
