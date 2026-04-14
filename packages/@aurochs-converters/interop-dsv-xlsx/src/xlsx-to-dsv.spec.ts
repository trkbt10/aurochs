/**
 * @file Tests for XLSX → DSV conversion
 */
import { buildDsv } from "@aurochs/dsv";
import type { XlsxWorkbook, XlsxRow } from "@aurochs-office/xlsx/domain/workbook";
import { createWorksheet, createWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import type { Cell } from "@aurochs-office/xlsx/domain/cell/types";
import { createCell } from "@aurochs-office/xlsx/domain/cell/types";
import { createDefaultStyleSheet, createDateStyleSheet } from "@aurochs-office/xlsx/domain/style/types";
import type { XlsxStyleSheet } from "@aurochs-office/xlsx/domain/style/types";
import type { StyleId } from "@aurochs-office/xlsx/domain/types";
import { rowIdx } from "@aurochs-office/xlsx/domain/types";
import { dateToSerial } from "@aurochs-office/xlsx/domain/date-serial";
import { convertXlsxToDsv } from "./xlsx-to-dsv";

// =============================================================================
// Helpers
// =============================================================================

function makeCell(params: {
  readonly col: number;
  readonly row: number;
  readonly value: Cell["value"];
  readonly sid?: StyleId;
}): Cell {
  return createCell(params.col, params.row, params.value, { styleId: params.sid });
}

function makeRow(rowNumber: number, cells: Cell[]): XlsxRow {
  return { rowNumber: rowIdx(rowNumber), cells };
}

function makeWorkbook(rows: XlsxRow[], styles?: XlsxStyleSheet): XlsxWorkbook {
  const sheet = createWorksheet({ name: "Sheet1", rows });
  return createWorkbook({
    sheets: [sheet],
    styles: styles ?? createDefaultStyleSheet(),
  });
}

// =============================================================================
// Basic conversion
// =============================================================================

describe("convertXlsxToDsv", () => {
  it("converts a simple sheet with headers", () => {
    const rows = [
      makeRow(1, [
        makeCell({ col: 1, row: 1, value: { type: "string", value: "name" } }),
        makeCell({ col: 2, row: 1, value: { type: "string", value: "age" } }),
      ]),
      makeRow(2, [
        makeCell({ col: 1, row: 2, value: { type: "string", value: "Alice" } }),
        makeCell({ col: 2, row: 2, value: { type: "number", value: 30 } }),
      ]),
    ];
    const wb = makeWorkbook(rows);
    const result = convertXlsxToDsv(wb);

    expect(result.data.headers).toEqual(["name", "age"]);
    expect(result.data.records).toHaveLength(1);
    expect(result.data.records[0].fields[0].value).toBe("Alice");
    expect(result.data.records[0].fields[1].value).toBe("30");
  });

  it("converts without headers when firstRowAsHeaders is false", () => {
    const rows = [
      makeRow(1, [
        makeCell({ col: 1, row: 1, value: { type: "string", value: "Alice" } }),
        makeCell({ col: 2, row: 1, value: { type: "number", value: 30 } }),
      ]),
    ];
    const wb = makeWorkbook(rows);
    const result = convertXlsxToDsv(wb, { firstRowAsHeaders: false });

    expect(result.data.headers).toBeUndefined();
    expect(result.data.records).toHaveLength(1);
    expect(result.data.records[0].fields[0].value).toBe("Alice");
  });

  it("handles empty worksheet", () => {
    const wb = makeWorkbook([]);
    const result = convertXlsxToDsv(wb);

    expect(result.data.headers).toBeUndefined();
    expect(result.data.records).toHaveLength(0);
  });

  it("warns on invalid sheet index", () => {
    const wb = makeWorkbook([]);
    const result = convertXlsxToDsv(wb, { sheetIndex: 5 });

    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some((w) => w.code === "XLSX_INVALID_SHEET_INDEX")).toBe(true);
  });

  // =============================================================================
  // Cell type serialization
  // =============================================================================

  describe("cell type serialization", () => {
    it("serializes string cells as-is", () => {
      const rows = [
        makeRow(1, [makeCell({ col: 1, row: 1, value: { type: "string", value: "hello world" } })]),
      ];
      const wb = makeWorkbook(rows);
      const result = convertXlsxToDsv(wb, { firstRowAsHeaders: false });

      expect(result.data.records[0].fields[0].value).toBe("hello world");
    });

    it("serializes number cells", () => {
      const rows = [
        makeRow(1, [
          makeCell({ col: 1, row: 1, value: { type: "number", value: 42 } }),
          makeCell({ col: 2, row: 1, value: { type: "number", value: 3.14 } }),
          makeCell({ col: 3, row: 1, value: { type: "number", value: 0 } }),
        ]),
      ];
      const wb = makeWorkbook(rows);
      const result = convertXlsxToDsv(wb, { firstRowAsHeaders: false });

      expect(result.data.records[0].fields[0].value).toBe("42");
      expect(result.data.records[0].fields[1].value).toBe("3.14");
      expect(result.data.records[0].fields[2].value).toBe("0");
    });

    it("serializes boolean cells", () => {
      const rows = [
        makeRow(1, [
          makeCell({ col: 1, row: 1, value: { type: "boolean", value: true } }),
          makeCell({ col: 2, row: 1, value: { type: "boolean", value: false } }),
        ]),
      ];
      const wb = makeWorkbook(rows);
      const result = convertXlsxToDsv(wb, { firstRowAsHeaders: false });

      expect(result.data.records[0].fields[0].value).toBe("true");
      expect(result.data.records[0].fields[1].value).toBe("false");
    });

    it("serializes error cells", () => {
      const rows = [
        makeRow(1, [makeCell({ col: 1, row: 1, value: { type: "error", value: "#DIV/0!" } })]),
      ];
      const wb = makeWorkbook(rows);
      const result = convertXlsxToDsv(wb, { firstRowAsHeaders: false });

      expect(result.data.records[0].fields[0].value).toBe("#DIV/0!");
    });

    it("serializes empty cells", () => {
      const rows = [
        makeRow(1, [makeCell({ col: 1, row: 1, value: { type: "empty" } })]),
      ];
      const wb = makeWorkbook(rows);
      const result = convertXlsxToDsv(wb, { firstRowAsHeaders: false });

      expect(result.data.records[0].fields[0].value).toBe("");
    });

    it("serializes date cells (DateCellValue) as ISO 8601", () => {
      const rows = [
        makeRow(1, [
          makeCell({ col: 1, row: 1, value: { type: "date", value: new Date("2024-01-15T00:00:00Z") } }),
        ]),
      ];
      const wb = makeWorkbook(rows);
      const result = convertXlsxToDsv(wb, { firstRowAsHeaders: false });

      expect(result.data.records[0].fields[0].value).toBe("2024-01-15T00:00:00.000Z");
    });

    it("serializes number cells with date format as ISO 8601 date", () => {
      const { styles, dateStyleId } = createDateStyleSheet();
      const serial = dateToSerial(new Date("2024-01-15T00:00:00Z"), "1900");
      const rows = [
        makeRow(1, [makeCell({ col: 1, row: 1, value: { type: "number", value: serial }, sid: dateStyleId })]),
      ];
      const wb = makeWorkbook(rows, styles);
      const result = convertXlsxToDsv(wb, { firstRowAsHeaders: false });

      expect(result.data.records[0].fields[0].value).toBe("2024-01-15");
    });

    it("serializes number cells with datetime format as ISO 8601 datetime", () => {
      const { styles, datetimeStyleId } = createDateStyleSheet();
      const serial = dateToSerial(new Date("2024-01-15T12:00:00Z"), "1900");
      const rows = [
        makeRow(1, [makeCell({ col: 1, row: 1, value: { type: "number", value: serial }, sid: datetimeStyleId })]),
      ];
      const wb = makeWorkbook(rows, styles);
      const result = convertXlsxToDsv(wb, { firstRowAsHeaders: false });

      // Should contain time component
      expect(result.data.records[0].fields[0].value).toContain("T");
      expect(result.data.records[0].fields[0].value).toContain("2024-01-15");
    });
  });

  // =============================================================================
  // Sparse rows and columns
  // =============================================================================

  describe("sparse data handling", () => {
    it("fills gaps in sparse columns with empty fields", () => {
      // Row has cells at col 1 and col 3 (col 2 is missing)
      const rows = [
        makeRow(1, [
          makeCell({ col: 1, row: 1, value: { type: "string", value: "A" } }),
          makeCell({ col: 3, row: 1, value: { type: "string", value: "C" } }),
        ]),
      ];
      const wb = makeWorkbook(rows);
      const result = convertXlsxToDsv(wb, { firstRowAsHeaders: false });

      expect(result.data.records[0].fields).toHaveLength(3);
      expect(result.data.records[0].fields[0].value).toBe("A");
      expect(result.data.records[0].fields[1].value).toBe(""); // gap filled
      expect(result.data.records[0].fields[2].value).toBe("C");
    });
  });

  // =============================================================================
  // Round-trip compatibility
  // =============================================================================

  describe("round-trip with DSV builder", () => {
    it("produces valid CSV when piped through buildDsv", () => {
      const rows = [
        makeRow(1, [
          makeCell({ col: 1, row: 1, value: { type: "string", value: "name" } }),
          makeCell({ col: 2, row: 1, value: { type: "string", value: "score" } }),
        ]),
        makeRow(2, [
          makeCell({ col: 1, row: 2, value: { type: "string", value: "Alice" } }),
          makeCell({ col: 2, row: 2, value: { type: "number", value: 95.5 } }),
        ]),
        makeRow(3, [
          makeCell({ col: 1, row: 3, value: { type: "string", value: "Bob" } }),
          makeCell({ col: 2, row: 3, value: { type: "number", value: 87 } }),
        ]),
      ];
      const wb = makeWorkbook(rows);
      const result = convertXlsxToDsv(wb);
      const csv = buildDsv(result.data);

      expect(csv).toBe("name,score\r\nAlice,95.5\r\nBob,87\r\n");
    });
  });

  // =============================================================================
  // Multi-sheet support
  // =============================================================================

  describe("sheet selection", () => {
    it("converts a specific sheet by index", () => {
      const sheet1 = createWorksheet({
        name: "Data",
        sheetNumber: 1,
        rows: [
          makeRow(1, [makeCell({ col: 1, row: 1, value: { type: "string", value: "sheet1" } })]),
        ],
      });
      const sheet2 = createWorksheet({
        name: "Summary",
        sheetNumber: 2,
        rows: [
          makeRow(1, [makeCell({ col: 1, row: 1, value: { type: "string", value: "sheet2" } })]),
        ],
      });
      const wb = createWorkbook({ sheets: [sheet1, sheet2] });

      const result = convertXlsxToDsv(wb, { sheetIndex: 1, firstRowAsHeaders: false });

      expect(result.data.records[0].fields[0].value).toBe("sheet2");
    });
  });
});
