/**
 * @file XLSX Integration Tests
 *
 * Tests for ChartDataEditor and workbook integration.
 */

import { describe, expect, it } from "vitest";
import type { XlsxWorkbook, XlsxWorksheet, XlsxRow } from "@oxen/xlsx/domain/workbook";
import type { Cell, CellValue } from "@oxen/xlsx/domain/cell/types";
import type { CellAddress } from "@oxen/xlsx/domain/cell/address";
import { colIdx, rowIdx } from "@oxen/xlsx/domain/types";
import { createDefaultStyleSheet } from "@oxen/xlsx/domain/style/types";
import { getCellValue } from "@oxen-ui/xlsx-editor/cell/query";
import { createChartDataEditor, editorToSheetUpdates } from "./xlsx-integration";

// =============================================================================
// Test Helpers
// =============================================================================

function addr(col: number, row: number): CellAddress {
  return {
    col: colIdx(col),
    row: rowIdx(row),
    colAbsolute: false,
    rowAbsolute: false,
  };
}

function cell(col: number, row: number, value: CellValue): Cell {
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
    xmlPath: `xl/worksheets/sheet${sheetId}.xml`,
    rows,
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

/**
 * Create a typical chart data worksheet:
 * - Row 1: Headers (Category, Series1, Series2)
 * - Rows 2-4: Data (Q1, Q2, Q3 with values)
 */
function createChartDataWorksheet(): XlsxWorksheet {
  return createWorksheet("Sheet1", 1, [
    createRow(1, [
      cell(1, 1, { type: "string", value: "Category" }),
      cell(2, 1, { type: "string", value: "Series1" }),
      cell(3, 1, { type: "string", value: "Series2" }),
    ]),
    createRow(2, [
      cell(1, 2, { type: "string", value: "Q1" }),
      cell(2, 2, { type: "number", value: 100 }),
      cell(3, 2, { type: "number", value: 200 }),
    ]),
    createRow(3, [
      cell(1, 3, { type: "string", value: "Q2" }),
      cell(2, 3, { type: "number", value: 150 }),
      cell(3, 3, { type: "number", value: 250 }),
    ]),
    createRow(4, [
      cell(1, 4, { type: "string", value: "Q3" }),
      cell(2, 4, { type: "number", value: 180 }),
      cell(3, 4, { type: "number", value: 280 }),
    ]),
  ]);
}

// =============================================================================
// Tests
// =============================================================================

describe("pptx-editor/editors/chart/data/xlsx-integration", () => {
  describe("createChartDataEditor", () => {
    it("creates an editor with the initial workbook", () => {
      const workbook = createWorkbook([createChartDataWorksheet()]);
      const editor = createChartDataEditor(workbook);

      expect(editor.getWorkbook()).toBe(workbook);
      expect(editor.canUndo()).toBe(false);
      expect(editor.canRedo()).toBe(false);
    });

    it("detects category and series counts", () => {
      const workbook = createWorkbook([createChartDataWorksheet()]);
      const editor = createChartDataEditor(workbook);

      expect(editor.getCategoryCount()).toBe(3);
      expect(editor.getSeriesCount()).toBe(2);
    });
  });

  describe("updateSeriesValues", () => {
    it("updates series values at the correct cells", () => {
      const workbook = createWorkbook([createChartDataWorksheet()]);
      const editor = createChartDataEditor(workbook);

      editor.updateSeriesValues(0, [500, 600, 700]);

      const updatedWorkbook = editor.getWorkbook();
      const sheet = updatedWorkbook.sheets[0];

      expect(getCellValue(sheet, addr(2, 2))).toEqual({ type: "number", value: 500 });
      expect(getCellValue(sheet, addr(2, 3))).toEqual({ type: "number", value: 600 });
      expect(getCellValue(sheet, addr(2, 4))).toEqual({ type: "number", value: 700 });
    });

    it("adds history entry for undo", () => {
      const workbook = createWorkbook([createChartDataWorksheet()]);
      const editor = createChartDataEditor(workbook);

      expect(editor.canUndo()).toBe(false);

      editor.updateSeriesValues(0, [500, 600, 700]);

      expect(editor.canUndo()).toBe(true);
    });
  });

  describe("updateCategories", () => {
    it("updates category values", () => {
      const workbook = createWorkbook([createChartDataWorksheet()]);
      const editor = createChartDataEditor(workbook);

      editor.updateCategories(["Jan", "Feb", "Mar"]);

      const updatedWorkbook = editor.getWorkbook();
      const sheet = updatedWorkbook.sheets[0];

      expect(getCellValue(sheet, addr(1, 2))).toEqual({ type: "string", value: "Jan" });
      expect(getCellValue(sheet, addr(1, 3))).toEqual({ type: "string", value: "Feb" });
      expect(getCellValue(sheet, addr(1, 4))).toEqual({ type: "string", value: "Mar" });
    });
  });

  describe("addSeries", () => {
    it("adds a new series to the worksheet", () => {
      const workbook = createWorkbook([createChartDataWorksheet()]);
      const editor = createChartDataEditor(workbook);

      editor.addSeries("Series3", [300, 350, 380]);

      const updatedWorkbook = editor.getWorkbook();
      const sheet = updatedWorkbook.sheets[0];

      // Check header (column 4, row 1)
      expect(getCellValue(sheet, addr(4, 1))).toEqual({ type: "string", value: "Series3" });
      // Check values (column 4, rows 2-4)
      expect(getCellValue(sheet, addr(4, 2))).toEqual({ type: "number", value: 300 });
      expect(getCellValue(sheet, addr(4, 3))).toEqual({ type: "number", value: 350 });
      expect(getCellValue(sheet, addr(4, 4))).toEqual({ type: "number", value: 380 });
    });

    it("updates seriesCount after adding", () => {
      const workbook = createWorkbook([createChartDataWorksheet()]);
      const editor = createChartDataEditor(workbook);

      expect(editor.getSeriesCount()).toBe(2);

      editor.addSeries("Series3", [300, 350, 380]);

      expect(editor.getSeriesCount()).toBe(3);
    });

    it("supports undo after addSeries", () => {
      const workbook = createWorkbook([createChartDataWorksheet()]);
      const editor = createChartDataEditor(workbook);

      expect(editor.getSeriesCount()).toBe(2);
      expect(editor.canUndo()).toBe(false);

      editor.addSeries("Series3", [300, 350, 380]);
      expect(editor.getSeriesCount()).toBe(3);
      expect(editor.canUndo()).toBe(true);

      editor.undo();
      // Note: undo only reverts the last action (UPDATE_CELLS for values)
      // The header was added via UPDATE_CELL, so we need another undo
      editor.undo();
      expect(editor.getSeriesCount()).toBe(2);
    });
  });

  describe("removeSeries", () => {
    it("removes series at specified index", () => {
      const workbook = createWorkbook([createChartDataWorksheet()]);
      const editor = createChartDataEditor(workbook);

      // Remove Series1 (index 0)
      editor.removeSeries(0);

      const updatedWorkbook = editor.getWorkbook();
      const sheet = updatedWorkbook.sheets[0];

      // Series2 should now be in column 2 (shifted from column 3)
      expect(getCellValue(sheet, addr(2, 1))).toEqual({ type: "string", value: "Series2" });
      expect(getCellValue(sheet, addr(2, 2))).toEqual({ type: "number", value: 200 });
      expect(getCellValue(sheet, addr(2, 3))).toEqual({ type: "number", value: 250 });
      expect(getCellValue(sheet, addr(2, 4))).toEqual({ type: "number", value: 280 });
    });

    it("shifts remaining series correctly", () => {
      const workbook = createWorkbook([createChartDataWorksheet()]);
      const editor = createChartDataEditor(workbook);

      const initialSeriesCount = editor.getSeriesCount();

      // Remove first series
      editor.removeSeries(0);

      // Series count should decrease
      expect(editor.getSeriesCount()).toBe(initialSeriesCount - 1);

      // Categories should remain unchanged
      const sheet = editor.getWorkbook().sheets[0];
      expect(getCellValue(sheet, addr(1, 2))).toEqual({ type: "string", value: "Q1" });
      expect(getCellValue(sheet, addr(1, 3))).toEqual({ type: "string", value: "Q2" });
      expect(getCellValue(sheet, addr(1, 4))).toEqual({ type: "string", value: "Q3" });
    });

    it("supports undo after removeSeries", () => {
      const workbook = createWorkbook([createChartDataWorksheet()]);
      const editor = createChartDataEditor(workbook);

      const originalSeriesCount = editor.getSeriesCount();
      const originalValue = getCellValue(workbook.sheets[0], addr(2, 2));

      editor.removeSeries(0);
      expect(editor.getSeriesCount()).toBe(originalSeriesCount - 1);
      expect(editor.canUndo()).toBe(true);

      editor.undo();
      expect(editor.getSeriesCount()).toBe(originalSeriesCount);
      expect(getCellValue(editor.getWorkbook().sheets[0], addr(2, 2))).toEqual(originalValue);
    });
  });

  describe("undo/redo", () => {
    it("undoes and redoes changes", () => {
      const workbook = createWorkbook([createChartDataWorksheet()]);
      const editor = createChartDataEditor(workbook);

      const originalValue = getCellValue(workbook.sheets[0], addr(2, 2));

      editor.updateSeriesValues(0, [999, 999, 999]);
      expect(getCellValue(editor.getWorkbook().sheets[0], addr(2, 2))).toEqual({
        type: "number",
        value: 999,
      });

      editor.undo();
      expect(getCellValue(editor.getWorkbook().sheets[0], addr(2, 2))).toEqual(originalValue);
      expect(editor.canRedo()).toBe(true);

      editor.redo();
      expect(getCellValue(editor.getWorkbook().sheets[0], addr(2, 2))).toEqual({
        type: "number",
        value: 999,
      });
    });
  });

  describe("editorToSheetUpdates", () => {
    it("converts editor workbook to sheet update format", () => {
      const workbook = createWorkbook([createChartDataWorksheet()]);
      const editor = createChartDataEditor(workbook);

      editor.updateSeriesValues(0, [500, 600, 700]);

      const updates = editorToSheetUpdates(editor, "Sheet1");

      expect(updates.sheetName).toBe("Sheet1");
      expect(updates.cells.length).toBeGreaterThan(0);

      // Check that updated values are included
      const b2Cell = updates.cells.find((c) => c.col === "B" && c.row === 2);
      expect(b2Cell?.value).toBe(500);
    });
  });
});
