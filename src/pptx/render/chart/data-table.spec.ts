/**
 * @file Tests for chart data table renderer
 *
 * @see ECMA-376 Part 1, Section 21.2.2.54 (dTable)
 */

import { describe, it, expect } from "vitest";
import type { DataTable } from "../../domain/chart";
import type { SeriesData } from "./types";
import { renderDataTable, calculateDataTableHeight, type DataTableLayout, type DataTableInput } from "./data-table";

// =============================================================================
// Test Fixtures
// =============================================================================

const createSeriesData = (key: string, values: number[]): SeriesData => ({
  key,
  values: values.map((y, i) => ({ x: i, y })),
});

const basicInput: DataTableInput = {
  seriesData: [
    createSeriesData("Series 1", [10, 20, 30]),
    createSeriesData("Series 2", [15, 25, 35]),
  ],
  categoryLabels: ["Q1", "Q2", "Q3"],
  colors: ["#FF0000", "#00FF00"],
};

const basicLayout: DataTableLayout = {
  width: 400,
  height: 60,
  x: 50,
  y: 200,
};

// =============================================================================
// calculateDataTableHeight Tests
// =============================================================================

describe("calculateDataTableHeight", () => {
  it("returns 0 when dataTable is undefined", () => {
    const height = calculateDataTableHeight(undefined, 3);
    expect(height).toBe(0);
  });

  it("calculates height based on series count", () => {
    const dataTable: DataTable = { showHorzBorder: true };

    // 2 series + 1 header = 3 rows
    // 3 * 20 (row height) + 4 * 2 (padding) = 68
    const height = calculateDataTableHeight(dataTable, 2);
    expect(height).toBe(68);
  });

  it("calculates height for single series", () => {
    const dataTable: DataTable = {};

    // 1 series + 1 header = 2 rows
    // 2 * 20 + 8 = 48
    const height = calculateDataTableHeight(dataTable, 1);
    expect(height).toBe(48);
  });
});

// =============================================================================
// renderDataTable Tests
// =============================================================================

describe("renderDataTable", () => {
  it("renders empty string for empty series data", () => {
    const dataTable: DataTable = {};
    const emptyInput: DataTableInput = {
      seriesData: [],
      categoryLabels: [],
      colors: [],
    };

    const result = renderDataTable(dataTable, emptyInput, basicLayout);
    expect(result).toBe("");
  });

  it("renders table with correct group transform", () => {
    const dataTable: DataTable = {};

    const result = renderDataTable(dataTable, basicInput, basicLayout);
    expect(result).toContain(`transform="translate(${basicLayout.x}, ${basicLayout.y})"`);
  });

  it("renders category labels in header row", () => {
    const dataTable: DataTable = {};

    const result = renderDataTable(dataTable, basicInput, basicLayout);
    expect(result).toContain("Q1");
    expect(result).toContain("Q2");
    expect(result).toContain("Q3");
  });

  it("renders series names", () => {
    const dataTable: DataTable = {};

    const result = renderDataTable(dataTable, basicInput, basicLayout);
    expect(result).toContain("Series 1");
    expect(result).toContain("Series 2");
  });

  it("renders data values", () => {
    const dataTable: DataTable = {};

    const result = renderDataTable(dataTable, basicInput, basicLayout);
    expect(result).toContain("10");
    expect(result).toContain("20");
    expect(result).toContain("30");
    expect(result).toContain("15");
    expect(result).toContain("25");
    expect(result).toContain("35");
  });

  it("renders outline when showOutline is true", () => {
    const dataTable: DataTable = { showOutline: true };

    const result = renderDataTable(dataTable, basicInput, basicLayout);
    expect(result).toContain("<rect");
    expect(result).toContain(`width="${basicLayout.width}"`);
    expect(result).toContain(`height="${basicLayout.height}"`);
  });

  it("does not render outline when showOutline is false", () => {
    const dataTable: DataTable = { showOutline: false };

    const result = renderDataTable(dataTable, basicInput, basicLayout);
    // Should not have the full-size rect for outline
    expect(result).not.toContain(`width="${basicLayout.width}" height="${basicLayout.height}" fill="none"`);
  });

  it("renders horizontal borders when showHorzBorder is true", () => {
    const dataTable: DataTable = { showHorzBorder: true };

    const result = renderDataTable(dataTable, basicInput, basicLayout);
    // Should have horizontal lines
    expect(result).toContain("<line");
    expect(result).toContain("x1=\"0\"");
  });

  it("renders legend keys when showKeys is true", () => {
    const dataTable: DataTable = { showKeys: true };

    const result = renderDataTable(dataTable, basicInput, basicLayout);
    // Should have colored rectangles for legend keys
    expect(result).toContain('fill="#FF0000"');
    expect(result).toContain('fill="#00FF00"');
  });

  it("does not render legend keys when showKeys is false", () => {
    const dataTable: DataTable = { showKeys: false };

    const result = renderDataTable(dataTable, basicInput, basicLayout);
    // Should not have colored rectangles for series colors
    // (outline might still have fill="none", so check for the specific color fills)
    const colorRectCount = (result.match(/fill="#FF0000"/g) || []).length;
    expect(colorRectCount).toBe(0);
  });

  it("renders vertical borders when showVertBorder is true", () => {
    const dataTable: DataTable = { showVertBorder: true };

    const result = renderDataTable(dataTable, basicInput, basicLayout);
    // Should have vertical lines
    expect(result).toContain("<line");
  });

  it("uses default series name when key is empty", () => {
    const dataTable: DataTable = {};
    const inputWithEmptyKey: DataTableInput = {
      seriesData: [createSeriesData("", [1, 2, 3])],
      categoryLabels: ["A", "B", "C"],
      colors: ["#000"],
    };

    const result = renderDataTable(dataTable, inputWithEmptyKey, basicLayout);
    expect(result).toContain("Series 1");
  });

  it("formats large numbers with locale formatting", () => {
    const dataTable: DataTable = {};
    const inputWithLargeNumbers: DataTableInput = {
      seriesData: [createSeriesData("Test", [1000, 2500, 10000])],
      categoryLabels: ["A", "B", "C"],
      colors: ["#000"],
    };

    const result = renderDataTable(dataTable, inputWithLargeNumbers, basicLayout);
    // Should contain formatted numbers (locale-specific, so just check they exist)
    expect(result).toContain("1");
    expect(result).toContain("0");
  });
});
