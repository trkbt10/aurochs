/**
 * @file Tests for PPTX table mutation utilities
 */

import { insertRow, removeRow, insertColumn, removeColumn, setColumnWidth, setRowHeight, mergeCells, splitCell } from "./mutation";
import type { Table } from "@aurochs-office/pptx/domain/table/types";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { createDefaultTableCellProperties } from "../editors/table/TableCellPropertiesEditor";

function createTestTable(rows: number = 2, cols: number = 3): Table {
  return {
    properties: { firstRow: true },
    grid: {
      columns: Array.from({ length: cols }, (_, i) => ({ width: px(100 + i * 10) })),
    },
    rows: Array.from({ length: rows }, (_, ri) => ({
      height: px(30 + ri * 5),
      cells: Array.from({ length: cols }, () => ({
        properties: createDefaultTableCellProperties(),
      })),
    })),
  };
}

describe("insertRow", () => {
  it("inserts a row at the beginning", () => {
    const table = createTestTable(2, 2);
    const result = insertRow(table, 0);
    expect(result.rows.length).toBe(3);
    expect(result.rows[0].cells.length).toBe(2);
  });

  it("inserts a row at the end", () => {
    const table = createTestTable(2, 3);
    const result = insertRow(table, 2);
    expect(result.rows.length).toBe(3);
    expect(result.rows[2].cells.length).toBe(3);
  });

  it("does not mutate the original", () => {
    const table = createTestTable();
    const result = insertRow(table, 1);
    expect(result).not.toBe(table);
    expect(table.rows.length).toBe(2);
  });
});

describe("removeRow", () => {
  it("removes a row", () => {
    const table = createTestTable(3, 2);
    const result = removeRow(table, 1);
    expect(result.rows.length).toBe(2);
  });

  it("does not remove the last row", () => {
    const table = createTestTable(1, 2);
    const result = removeRow(table, 0);
    expect(result.rows.length).toBe(1);
  });
});

describe("insertColumn", () => {
  it("inserts a column at the beginning", () => {
    const table = createTestTable(2, 2);
    const result = insertColumn(table, 0);
    expect(result.grid.columns.length).toBe(3);
    expect(result.rows[0].cells.length).toBe(3);
    expect(result.rows[1].cells.length).toBe(3);
  });

  it("inserts a column at the end", () => {
    const table = createTestTable(2, 2);
    const result = insertColumn(table, 2);
    expect(result.grid.columns.length).toBe(3);
    expect(result.rows[0].cells.length).toBe(3);
  });
});

describe("removeColumn", () => {
  it("removes a column", () => {
    const table = createTestTable(2, 3);
    const result = removeColumn(table, 1);
    expect(result.grid.columns.length).toBe(2);
    expect(result.rows[0].cells.length).toBe(2);
  });

  it("does not remove the last column", () => {
    const table = createTestTable(2, 1);
    const result = removeColumn(table, 0);
    expect(result.grid.columns.length).toBe(1);
  });
});

describe("setColumnWidth", () => {
  it("sets column width", () => {
    const table = createTestTable(2, 3);
    const result = setColumnWidth(table, 1, 200);
    expect(result.grid.columns[1].width).toBe(px(200));
    // Other columns unchanged
    expect(result.grid.columns[0].width).toBe(table.grid.columns[0].width);
  });

  it("returns same table for out-of-bounds index", () => {
    const table = createTestTable(2, 3);
    expect(setColumnWidth(table, -1, 200)).toBe(table);
    expect(setColumnWidth(table, 5, 200)).toBe(table);
  });
});

describe("setRowHeight", () => {
  it("sets row height", () => {
    const table = createTestTable(2, 2);
    const result = setRowHeight(table, 0, 50);
    expect(result.rows[0].height).toBe(px(50));
    expect(result.rows[1].height).toBe(table.rows[1].height);
  });

  it("returns same table for out-of-bounds index", () => {
    const table = createTestTable(2, 2);
    expect(setRowHeight(table, -1, 50)).toBe(table);
    expect(setRowHeight(table, 5, 50)).toBe(table);
  });
});

describe("mergeCells", () => {
  it("sets rowSpan and colSpan on the anchor cell", () => {
    const table = createTestTable(3, 3);
    const result = mergeCells(table, { startRow: 0, startCol: 0, endRow: 1, endCol: 1 });
    expect(result.rows[0].cells[0].properties.rowSpan).toBe(2);
    expect(result.rows[0].cells[0].properties.colSpan).toBe(2);
  });

  it("marks merged cells", () => {
    const table = createTestTable(3, 3);
    const result = mergeCells(table, { startRow: 0, startCol: 0, endRow: 1, endCol: 1 });
    expect(result.rows[0].cells[1].properties.horizontalMerge).toBe(true);
    expect(result.rows[1].cells[0].properties.verticalMerge).toBe(true);
    expect(result.rows[1].cells[1].properties.horizontalMerge).toBe(true);
    expect(result.rows[1].cells[1].properties.verticalMerge).toBe(true);
  });

  it("returns same table if range is single cell", () => {
    const table = createTestTable(2, 2);
    expect(mergeCells(table, { startRow: 0, startCol: 0, endRow: 0, endCol: 0 })).toBe(table);
  });
});

describe("splitCell", () => {
  it("removes rowSpan and colSpan from a cell", () => {
    const table = createTestTable(2, 2);
    const merged = mergeCells(table, { startRow: 0, startCol: 0, endRow: 1, endCol: 1 });
    const result = splitCell(merged, 0, 0);
    expect(result.rows[0].cells[0].properties.rowSpan).toBeUndefined();
    expect(result.rows[0].cells[0].properties.colSpan).toBeUndefined();
  });
});
