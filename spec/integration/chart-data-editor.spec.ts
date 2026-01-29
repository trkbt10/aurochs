import type { XlsxWorkbook, XlsxRow, XlsxWorksheet } from "@oxen-office/xlsx/domain/workbook";
import type { Cell, CellValue } from "@oxen-office/xlsx/domain/cell/types";
import type { CellAddress } from "@oxen-office/xlsx/domain/cell/address";
import { colIdx, rowIdx } from "@oxen-office/xlsx/domain/types";
import { createDefaultStyleSheet } from "@oxen-office/xlsx/domain/style/types";
import { getCellValue } from "@oxen-ui/xlsx-editor/cell/query";
import { createChartDataEditor } from "@oxen-ui/pptx-editor/editors/chart/data/xlsx-integration";

function addr(col: number, row: number): CellAddress {
  return {
    col: colIdx(col),
    row: rowIdx(row),
    colAbsolute: false,
    rowAbsolute: false,
  };
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

function createChartWorkbook(): XlsxWorkbook {
  const sheet = createWorksheet("Sheet1", 1, [
    createRow(1, [
      cell(1, 1, { type: "string", value: "Category" }),
      cell(2, 1, { type: "string", value: "Series1" }),
    ]),
    createRow(2, [
      cell(1, 2, { type: "string", value: "Q1" }),
      cell(2, 2, { type: "number", value: 100 }),
    ]),
    createRow(3, [
      cell(1, 3, { type: "string", value: "Q2" }),
      cell(2, 3, { type: "number", value: 200 }),
    ]),
    createRow(4, [
      cell(1, 4, { type: "string", value: "Q3" }),
      cell(2, 4, { type: "number", value: 300 }),
    ]),
  ]);

  return createWorkbook([sheet]);
}

describe("ChartDataEditor integration", () => {
  it("should update series values from pptx-editor", () => {
    const workbook = createChartWorkbook();
    const editor = createChartDataEditor(workbook);

    editor.updateSeriesValues(0, [10, 20, 30]);

    const sheet = editor.getWorkbook().sheets[0];
    expect(getCellValue(sheet, addr(2, 2))).toEqual({ type: "number", value: 10 });
    expect(getCellValue(sheet, addr(2, 3))).toEqual({ type: "number", value: 20 });
    expect(getCellValue(sheet, addr(2, 4))).toEqual({ type: "number", value: 30 });
  });

  it("should support undo/redo", () => {
    const workbook = createChartWorkbook();
    const editor = createChartDataEditor(workbook);

    const original = getCellValue(workbook.sheets[0], addr(2, 2));

    editor.updateSeriesValues(0, [10, 20, 30]);
    expect(editor.canUndo()).toBe(true);
    expect(getCellValue(editor.getWorkbook().sheets[0], addr(2, 2))).toEqual({
      type: "number",
      value: 10,
    });

    editor.undo();
    expect(getCellValue(editor.getWorkbook().sheets[0], addr(2, 2))).toEqual(original);
    expect(editor.canRedo()).toBe(true);

    editor.redo();
    expect(getCellValue(editor.getWorkbook().sheets[0], addr(2, 2))).toEqual({
      type: "number",
      value: 10,
    });
  });
});
