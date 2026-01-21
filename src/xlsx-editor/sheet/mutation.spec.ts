/**
 * @file Sheet mutation tests
 */

import type { XlsxWorkbook, XlsxWorksheet, XlsxRow } from "../../xlsx/domain/workbook";
import type { Cell, CellValue } from "../../xlsx/domain/cell/types";
import { colIdx, rowIdx } from "../../xlsx/domain/types";
import { createDefaultStyleSheet } from "../../xlsx/domain/style/types";
import { addSheet, deleteSheet, duplicateSheet, moveSheet, renameSheet } from "./mutation";

function addr(col: number, row: number) {
  return {
    col: colIdx(col),
    row: rowIdx(row),
    colAbsolute: false,
    rowAbsolute: false,
  };
}

function cellAt(col: number, row: number, value: CellValue): Cell {
  return {
    address: addr(col, row),
    value,
  };
}

function createRow(rowNumber: number, cells: readonly Cell[]): XlsxRow {
  return {
    rowNumber: rowIdx(rowNumber),
    cells,
  };
}

function createWorksheet(
  name: string,
  sheetId: number,
  rows: readonly XlsxRow[] = [],
): XlsxWorksheet {
  return {
    dateSystem: "1900",
    name,
    sheetId,
    state: "visible",
    rows,
    xmlPath: `xl/worksheets/sheet${sheetId}.xml`,
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

describe("sheet/mutation", () => {
  describe("addSheet", () => {
    it("adds a sheet with the next sheetId and xmlPath", () => {
      const workbook = createWorkbook([createWorksheet("Sheet1", 5)]);
      const next = addSheet(workbook, "NewSheet");

      expect(next.sheets.length).toBe(2);
      expect(next.sheets[1]).toEqual({
        dateSystem: "1900",
        name: "NewSheet",
        sheetId: 6,
        state: "visible",
        rows: [],
        xmlPath: "xl/worksheets/sheet6.xml",
      });
      expect(workbook.sheets).toHaveLength(1);
    });

    it("inserts after a specific index", () => {
      const workbook = createWorkbook([
        createWorksheet("A", 1),
        createWorksheet("B", 2),
        createWorksheet("C", 3),
      ]);

      const next = addSheet(workbook, "X", 0);
      expect(next.sheets.map((s) => s.name)).toEqual(["A", "X", "B", "C"]);
      expect(workbook.sheets.map((s) => s.name)).toEqual(["A", "B", "C"]);
    });

    it("throws on duplicate name", () => {
      const workbook = createWorkbook([createWorksheet("Sheet1", 1)]);
      expect(() => addSheet(workbook, "Sheet1")).toThrow("Sheet name already exists");
    });

    it("throws on blank name", () => {
      const workbook = createWorkbook([createWorksheet("Sheet1", 1)]);
      expect(() => addSheet(workbook, "   ")).toThrow("name is required");
    });

    it("throws on invalid afterIndex", () => {
      const workbook = createWorkbook([createWorksheet("Sheet1", 1)]);
      expect(() => addSheet(workbook, "NewSheet", -2)).toThrow("afterIndex out of range");
      expect(() => addSheet(workbook, "NewSheet", 1)).toThrow("afterIndex out of range");
    });
  });

  describe("deleteSheet", () => {
    it("deletes a sheet by index", () => {
      const workbook = createWorkbook([createWorksheet("A", 1), createWorksheet("B", 2)]);
      const next = deleteSheet(workbook, 0);

      expect(next.sheets.map((s) => s.name)).toEqual(["B"]);
      expect(workbook.sheets.map((s) => s.name)).toEqual(["A", "B"]);
    });

    it("throws if deleting the last remaining sheet", () => {
      const workbook = createWorkbook([createWorksheet("Only", 1)]);
      expect(() => deleteSheet(workbook, 0)).toThrow("Cannot delete the last remaining sheet");
    });

    it("throws on invalid sheet index", () => {
      const workbook = createWorkbook([createWorksheet("A", 1), createWorksheet("B", 2)]);
      expect(() => deleteSheet(workbook, -1)).toThrow("sheetIndex out of range");
      expect(() => deleteSheet(workbook, 2)).toThrow("sheetIndex out of range");
    });
  });

  describe("renameSheet", () => {
    it("renames a sheet and keeps other sheets untouched", () => {
      const workbook = createWorkbook([createWorksheet("A", 1), createWorksheet("B", 2)]);
      const next = renameSheet(workbook, 0, "Renamed");

      expect(next.sheets.map((s) => s.name)).toEqual(["Renamed", "B"]);
      expect(workbook.sheets.map((s) => s.name)).toEqual(["A", "B"]);
    });

    it("throws on duplicate name", () => {
      const workbook = createWorkbook([createWorksheet("A", 1), createWorksheet("B", 2)]);
      expect(() => renameSheet(workbook, 0, "B")).toThrow("Sheet name already exists");
    });
  });

  describe("moveSheet", () => {
    it("moves a sheet to a new position", () => {
      const workbook = createWorkbook([
        createWorksheet("A", 1),
        createWorksheet("B", 2),
        createWorksheet("C", 3),
      ]);
      const next = moveSheet(workbook, 0, 2);

      expect(next.sheets.map((s) => s.name)).toEqual(["B", "C", "A"]);
      expect(workbook.sheets.map((s) => s.name)).toEqual(["A", "B", "C"]);
    });

    it("returns the same workbook when fromIndex === toIndex", () => {
      const workbook = createWorkbook([createWorksheet("A", 1), createWorksheet("B", 2)]);
      expect(moveSheet(workbook, 1, 1)).toBe(workbook);
    });
  });

  describe("duplicateSheet", () => {
    it("duplicates a sheet, assigns a new sheetId, and generates a unique name", () => {
      const sourceRows = [
        createRow(1, [cellAt(1, 1, { type: "string", value: "A1" })]),
      ];
      const workbook = createWorkbook([createWorksheet("Budget", 2, sourceRows)]);
      const next = duplicateSheet(workbook, 0);

      expect(next.sheets.length).toBe(2);
      expect(next.sheets.map((s) => s.name)).toEqual(["Budget", "Budget1"]);
      expect(next.sheets[1].sheetId).toBe(3);
      expect(next.sheets[1].xmlPath).toBe("xl/worksheets/sheet3.xml");
      expect(next.sheets[1].rows).toEqual(sourceRows);
      expect(next.sheets[1]).not.toBe(workbook.sheets[0]);
      expect(next.sheets[1].rows).not.toBe(workbook.sheets[0].rows);
    });
  });
});
