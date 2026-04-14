/**
 * @file Tests for DSV → XLSX conversion
 */
import { parseDsv } from "@aurochs/dsv";
import type { DsvDocument } from "@aurochs/dsv";
import { convertDsvToXlsx } from "./dsv-to-xlsx";

// =============================================================================
// Helpers
// =============================================================================

function makeDsv(csv: string): DsvDocument {
  return parseDsv(csv);
}

function makeDsvNoHeaders(csv: string): DsvDocument {
  return parseDsv(csv, { dialect: { hasHeader: false } });
}

// =============================================================================
// Basic conversion
// =============================================================================

describe("convertDsvToXlsx", () => {
  it("converts a simple CSV with headers to a workbook", () => {
    const doc = makeDsv("name,age\nAlice,30\nBob,25\n");
    const result = convertDsvToXlsx(doc);

    expect(result.data.sheets).toHaveLength(1);
    expect(result.data.sheets[0].name).toBe("Sheet1");

    const rows = result.data.sheets[0].rows;
    // Header row + 2 data rows
    expect(rows).toHaveLength(3);

    // Header row: string cells
    expect(rows[0].cells).toHaveLength(2);
    expect(rows[0].cells[0].value).toEqual({ type: "string", value: "name" });
    expect(rows[0].cells[1].value).toEqual({ type: "string", value: "age" });

    // Data rows: "name" column is string, "age" column is number (integer inferred)
    expect(rows[1].cells[0].value).toEqual({ type: "string", value: "Alice" });
    expect(rows[1].cells[1].value).toEqual({ type: "number", value: 30 });

    expect(rows[2].cells[0].value).toEqual({ type: "string", value: "Bob" });
    expect(rows[2].cells[1].value).toEqual({ type: "number", value: 25 });
  });

  it("uses custom sheet name", () => {
    const doc = makeDsv("x\n1\n");
    const result = convertDsvToXlsx(doc, { sheetName: "MyData" });

    expect(result.data.sheets[0].name).toBe("MyData");
  });

  it("handles CSV without headers", () => {
    const doc = makeDsvNoHeaders("Alice,30\nBob,25\n");
    const result = convertDsvToXlsx(doc);

    const rows = result.data.sheets[0].rows;
    // No header row, just 2 data rows
    expect(rows).toHaveLength(2);
    expect(rows[0].rowNumber).toBe(1);
    expect(rows[0].cells[0].value).toEqual({ type: "string", value: "Alice" });
  });

  it("handles empty document", () => {
    const doc: DsvDocument = {
      type: "document",
      headers: undefined,
      records: [],
    };
    const result = convertDsvToXlsx(doc);

    expect(result.data.sheets[0].rows).toHaveLength(0);
  });

  // =============================================================================
  // Type inference
  // =============================================================================

  describe("type inference", () => {
    it("converts integer fields to number cells", () => {
      const doc = makeDsv("val\n42\n-7\n0\n");
      const result = convertDsvToXlsx(doc);
      const rows = result.data.sheets[0].rows;

      expect(rows[1].cells[0].value).toEqual({ type: "number", value: 42 });
      expect(rows[2].cells[0].value).toEqual({ type: "number", value: -7 });
      expect(rows[3].cells[0].value).toEqual({ type: "number", value: 0 });
    });

    it("converts decimal fields to number cells", () => {
      const doc = makeDsv("val\n3.14\n0.5\n");
      const result = convertDsvToXlsx(doc);
      const rows = result.data.sheets[0].rows;

      expect(rows[1].cells[0].value).toEqual({ type: "number", value: 3.14 });
      expect(rows[2].cells[0].value).toEqual({ type: "number", value: 0.5 });
    });

    it("converts boolean fields to boolean cells", () => {
      const doc = makeDsv("val\ntrue\nfalse\nTRUE\n");
      const result = convertDsvToXlsx(doc);
      const rows = result.data.sheets[0].rows;

      expect(rows[1].cells[0].value).toEqual({ type: "boolean", value: true });
      expect(rows[2].cells[0].value).toEqual({ type: "boolean", value: false });
      expect(rows[3].cells[0].value).toEqual({ type: "boolean", value: true });
    });

    it("converts empty fields to empty cells", () => {
      const doc = makeDsv("a,b\n1,\n");
      const result = convertDsvToXlsx(doc);
      const rows = result.data.sheets[0].rows;

      expect(rows[1].cells[1].value).toEqual({ type: "empty" });
    });

    it("converts date fields to number cells with date style", () => {
      const doc = makeDsv("date\n2024-01-15\n");
      const result = convertDsvToXlsx(doc);
      const rows = result.data.sheets[0].rows;

      // Date cells are stored as serial numbers
      const cell = rows[1].cells[0];
      expect(cell.value.type).toBe("number");
      expect(cell.styleId).toBeDefined();
      // Serial for 2024-01-15 in 1900 date system
      expect((cell.value as { value: number }).value).toBeCloseTo(45306, 0);
    });

    it("converts datetime fields to number cells with datetime style", () => {
      const doc = makeDsv("dt\n2024-01-15T12:00:00Z\n");
      const result = convertDsvToXlsx(doc);
      const rows = result.data.sheets[0].rows;

      const cell = rows[1].cells[0];
      expect(cell.value.type).toBe("number");
      expect(cell.styleId).toBeDefined();
      // Should have a fractional part for the time component
      const serial = (cell.value as { value: number }).value;
      expect(serial % 1).not.toBe(0);
    });
  });

  // =============================================================================
  // Quoting behavior
  // =============================================================================

  describe("quoting", () => {
    it("treats quoted numeric fields as strings by default", () => {
      const doc = makeDsv('zip\n"00501"\n');
      const result = convertDsvToXlsx(doc);
      const rows = result.data.sheets[0].rows;

      // "00501" is quoted → should be string, not number
      expect(rows[1].cells[0].value).toEqual({ type: "string", value: "00501" });
    });

    it("type-infers quoted fields when respectQuoting is false", () => {
      const doc = makeDsv('val\n"42"\n');
      const result = convertDsvToXlsx(doc, { respectQuoting: false });
      const rows = result.data.sheets[0].rows;

      // With respectQuoting=false, "42" is inferred as integer
      expect(rows[1].cells[0].value).toEqual({ type: "number", value: 42 });
    });
  });

  // =============================================================================
  // Shared strings
  // =============================================================================

  describe("shared strings", () => {
    it("collects unique string values", () => {
      const doc = makeDsv("a\nhello\nworld\nhello\n");
      const result = convertDsvToXlsx(doc);

      // "a" (header), "hello", "world" — deduplicated
      expect(result.data.sharedStrings).toContain("a");
      expect(result.data.sharedStrings).toContain("hello");
      expect(result.data.sharedStrings).toContain("world");
      expect(result.data.sharedStrings).toHaveLength(3);
    });
  });

  // =============================================================================
  // Styles
  // =============================================================================

  describe("styles", () => {
    it("produces a valid stylesheet with default + date formats", () => {
      const doc = makeDsv("date\n2024-01-15\n");
      const result = convertDsvToXlsx(doc);

      const styles = result.data.styles;
      expect(styles.fonts.length).toBeGreaterThan(0);
      expect(styles.fills.length).toBeGreaterThan(0);
      expect(styles.borders.length).toBeGreaterThan(0);
      // Default cellXf + date cellXf + datetime cellXf = at least 3
      expect(styles.cellXfs.length).toBeGreaterThanOrEqual(3);
    });
  });

  // =============================================================================
  // Warnings
  // =============================================================================

  describe("warnings", () => {
    it("warns when a record has more fields than headers", () => {
      // Manually create a document with mismatched fields
      const doc: DsvDocument = {
        type: "document",
        headers: ["a"],
        records: [
          {
            type: "record",
            fields: [
              { type: "field", value: "1", raw: "1", quoting: "unquoted", span: { start: { line: 2, column: 0, offset: 0 }, end: { line: 2, column: 1, offset: 1 } } },
              { type: "field", value: "2", raw: "2", quoting: "unquoted", span: { start: { line: 2, column: 2, offset: 2 }, end: { line: 2, column: 3, offset: 3 } } },
            ],
            recordIndex: 0,
            span: { start: { line: 2, column: 0, offset: 0 }, end: { line: 2, column: 3, offset: 3 } },
          },
        ],
      };
      const result = convertDsvToXlsx(doc);

      expect(result.warnings).toBeDefined();
      expect(result.warnings!.some((w) => w.code === "DSV_EXTRA_FIELDS")).toBe(true);
    });
  });

  // =============================================================================
  // Cell addressing
  // =============================================================================

  describe("cell addressing", () => {
    it("assigns correct 1-based row/col addresses", () => {
      const doc = makeDsv("a,b\nx,y\n");
      const result = convertDsvToXlsx(doc);
      const rows = result.data.sheets[0].rows;

      // Row 1 = headers
      expect(rows[0].rowNumber).toBe(1);
      expect(rows[0].cells[0].address.col).toBe(1);
      expect(rows[0].cells[0].address.row).toBe(1);
      expect(rows[0].cells[1].address.col).toBe(2);
      expect(rows[0].cells[1].address.row).toBe(1);

      // Row 2 = first data row
      expect(rows[1].rowNumber).toBe(2);
      expect(rows[1].cells[0].address.col).toBe(1);
      expect(rows[1].cells[0].address.row).toBe(2);
    });
  });
});
