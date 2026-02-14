/**
 * @file Mutation Applicator Tests
 */

import { describe, it, expect } from "vitest";
import type { XlsxWorkbook, XlsxWorksheet, XlsxRow } from "@aurochs-office/xlsx/domain/workbook";
import type { Cell, CellValue } from "@aurochs-office/xlsx/domain/cell/types";
import type { CellAddress } from "@aurochs-office/xlsx/domain/cell/address";
import { rowIdx, colIdx } from "@aurochs-office/xlsx/domain/types";
import type { CellMutation } from "./types";
import { applyMutations } from "./mutation-applicator";

// =============================================================================
// Test Helpers
// =============================================================================

function createAddress(row: number, col: number): CellAddress {
  return {
    row: rowIdx(row),
    col: colIdx(col),
    rowAbsolute: false,
    colAbsolute: false,
  };
}

function createCell(row: number, col: number, value: CellValue): Cell {
  return {
    address: createAddress(row, col),
    value,
  };
}

function createRow(rowNumber: number, cells: Cell[]): XlsxRow {
  return {
    rowNumber: rowIdx(rowNumber),
    cells,
  };
}

function createSheet(name: string, rows: XlsxRow[]): XlsxWorksheet {
  return {
    dateSystem: "1900",
    name,
    sheetId: 1,
    state: "visible",
    sheetView: { showGridLines: true, showRowColHeaders: true },
    rows,
    xmlPath: "xl/worksheets/sheet1.xml",
  };
}

function createWorkbook(sheets: XlsxWorksheet[]): XlsxWorkbook {
  return {
    dateSystem: "1900",
    sheets,
    styles: {
      fonts: [],
      fills: [],
      borders: [],
      cellXfs: [],
      cellStyleXfs: [],
      cellStyles: [],
      numberFormats: [],
    },
    sharedStrings: [],
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("applyMutations", () => {
  it("returns same workbook when no mutations", () => {
    const workbook = createWorkbook([
      createSheet("Sheet1", [
        createRow(1, [createCell(1, 1, { type: "number", value: 10 })]),
      ]),
    ]);

    const result = applyMutations(workbook, []);

    expect(result).toBe(workbook);
  });

  it("updates existing cell value", () => {
    const workbook = createWorkbook([
      createSheet("Sheet1", [
        createRow(1, [createCell(1, 1, { type: "number", value: 10 })]),
      ]),
    ]);

    const mutations: CellMutation[] = [
      { sheetIndex: 0, row: 1, col: 1, value: { type: "number", value: 20 } },
    ];

    const result = applyMutations(workbook, mutations);

    expect(result.sheets[0].rows[0].cells[0].value).toEqual({
      type: "number",
      value: 20,
    });
  });

  it("creates new cell in existing row", () => {
    const workbook = createWorkbook([
      createSheet("Sheet1", [
        createRow(1, [createCell(1, 1, { type: "number", value: 10 })]),
      ]),
    ]);

    const mutations: CellMutation[] = [
      { sheetIndex: 0, row: 1, col: 2, value: { type: "number", value: 20 } },
    ];

    const result = applyMutations(workbook, mutations);

    expect(result.sheets[0].rows[0].cells).toHaveLength(2);
    expect(result.sheets[0].rows[0].cells[1].value).toEqual({
      type: "number",
      value: 20,
    });
  });

  it("creates new row with cell", () => {
    const workbook = createWorkbook([
      createSheet("Sheet1", [
        createRow(1, [createCell(1, 1, { type: "number", value: 10 })]),
      ]),
    ]);

    const mutations: CellMutation[] = [
      { sheetIndex: 0, row: 2, col: 1, value: { type: "number", value: 20 } },
    ];

    const result = applyMutations(workbook, mutations);

    expect(result.sheets[0].rows).toHaveLength(2);
    expect(result.sheets[0].rows[1].rowNumber).toBe(2);
    expect(result.sheets[0].rows[1].cells[0].value).toEqual({
      type: "number",
      value: 20,
    });
  });

  it("applies multiple mutations to different sheets", () => {
    const workbook = createWorkbook([
      createSheet("Sheet1", [
        createRow(1, [createCell(1, 1, { type: "number", value: 10 })]),
      ]),
      createSheet("Sheet2", [
        createRow(1, [createCell(1, 1, { type: "number", value: 100 })]),
      ]),
    ]);

    const mutations: CellMutation[] = [
      { sheetIndex: 0, row: 1, col: 1, value: { type: "number", value: 20 } },
      { sheetIndex: 1, row: 1, col: 1, value: { type: "number", value: 200 } },
    ];

    const result = applyMutations(workbook, mutations);

    expect(result.sheets[0].rows[0].cells[0].value).toEqual({
      type: "number",
      value: 20,
    });
    expect(result.sheets[1].rows[0].cells[0].value).toEqual({
      type: "number",
      value: 200,
    });
  });

  it("clears formula when setting value", () => {
    const cellWithFormula: Cell = {
      address: createAddress(1, 1),
      value: { type: "empty" },
      formula: { type: "normal", expression: "A2+1" },
    };
    const workbook = createWorkbook([
      createSheet("Sheet1", [createRow(1, [cellWithFormula])]),
    ]);

    const mutations: CellMutation[] = [
      { sheetIndex: 0, row: 1, col: 1, value: { type: "number", value: 42 } },
    ];

    const result = applyMutations(workbook, mutations);

    expect(result.sheets[0].rows[0].cells[0].value).toEqual({
      type: "number",
      value: 42,
    });
    expect(result.sheets[0].rows[0].cells[0].formula).toBeUndefined();
  });

  it("preserves original workbook (immutable)", () => {
    const workbook = createWorkbook([
      createSheet("Sheet1", [
        createRow(1, [createCell(1, 1, { type: "number", value: 10 })]),
      ]),
    ]);

    const mutations: CellMutation[] = [
      { sheetIndex: 0, row: 1, col: 1, value: { type: "number", value: 20 } },
    ];

    const result = applyMutations(workbook, mutations);

    // Original unchanged
    expect(workbook.sheets[0].rows[0].cells[0].value).toEqual({
      type: "number",
      value: 10,
    });
    // Result changed
    expect(result.sheets[0].rows[0].cells[0].value).toEqual({
      type: "number",
      value: 20,
    });
  });

  it("keeps rows sorted by row number", () => {
    const workbook = createWorkbook([
      createSheet("Sheet1", [
        createRow(1, [createCell(1, 1, { type: "number", value: 10 })]),
        createRow(3, [createCell(3, 1, { type: "number", value: 30 })]),
      ]),
    ]);

    const mutations: CellMutation[] = [
      { sheetIndex: 0, row: 2, col: 1, value: { type: "number", value: 20 } },
    ];

    const result = applyMutations(workbook, mutations);

    expect(result.sheets[0].rows).toHaveLength(3);
    expect(result.sheets[0].rows[0].rowNumber).toBe(1);
    expect(result.sheets[0].rows[1].rowNumber).toBe(2);
    expect(result.sheets[0].rows[2].rowNumber).toBe(3);
  });

  it("keeps cells sorted by column", () => {
    const workbook = createWorkbook([
      createSheet("Sheet1", [
        createRow(1, [
          createCell(1, 1, { type: "number", value: 1 }),
          createCell(1, 3, { type: "number", value: 3 }),
        ]),
      ]),
    ]);

    const mutations: CellMutation[] = [
      { sheetIndex: 0, row: 1, col: 2, value: { type: "number", value: 2 } },
    ];

    const result = applyMutations(workbook, mutations);

    expect(result.sheets[0].rows[0].cells).toHaveLength(3);
    expect(result.sheets[0].rows[0].cells[0].address.col).toBe(1);
    expect(result.sheets[0].rows[0].cells[1].address.col).toBe(2);
    expect(result.sheets[0].rows[0].cells[2].address.col).toBe(3);
  });
});
