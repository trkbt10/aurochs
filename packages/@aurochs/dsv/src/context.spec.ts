/**
 * @file Context and type inference tests
 */

import { parseDsv } from "./parser";
import {
  createParseContext,
  inferFieldType,
  coerceFieldValue,
  analyzeColumns,
} from "./context";

// =============================================================================
// inferFieldType
// =============================================================================

describe("inferFieldType", () => {
  it("detects null for empty string", () => {
    expect(inferFieldType("")).toBe("null");
  });

  it("detects null for whitespace-only", () => {
    expect(inferFieldType("   ")).toBe("null");
  });

  it("detects boolean true", () => {
    expect(inferFieldType("true")).toBe("boolean");
    expect(inferFieldType("True")).toBe("boolean");
    expect(inferFieldType("TRUE")).toBe("boolean");
  });

  it("detects boolean false", () => {
    expect(inferFieldType("false")).toBe("boolean");
    expect(inferFieldType("False")).toBe("boolean");
  });

  it("detects integer", () => {
    expect(inferFieldType("0")).toBe("integer");
    expect(inferFieldType("42")).toBe("integer");
    expect(inferFieldType("-1")).toBe("integer");
    expect(inferFieldType("+100")).toBe("integer");
  });

  it("does not detect integer with leading zeros", () => {
    expect(inferFieldType("007")).toBe("string");
    expect(inferFieldType("00")).toBe("string");
  });

  it("detects number (decimal)", () => {
    expect(inferFieldType("3.14")).toBe("number");
    expect(inferFieldType("-0.5")).toBe("number");
    expect(inferFieldType(".5")).toBe("number");
    expect(inferFieldType("1.")).toBe("number");
  });

  it("detects number (scientific notation)", () => {
    expect(inferFieldType("1e10")).toBe("number");
    expect(inferFieldType("2.5E-3")).toBe("number");
    expect(inferFieldType("-1.5e+2")).toBe("number");
  });

  it("detects ISO date", () => {
    expect(inferFieldType("2024-01-15")).toBe("date");
    expect(inferFieldType("2000-12-31")).toBe("date");
  });

  it("rejects invalid dates", () => {
    expect(inferFieldType("2024-13-01")).toBe("string"); // month 13
    expect(inferFieldType("2024-00-01")).toBe("string"); // month 0
    expect(inferFieldType("2024-01-32")).toBe("string"); // day 32
    expect(inferFieldType("2024-01-00")).toBe("string"); // day 0
  });

  it("detects ISO datetime", () => {
    expect(inferFieldType("2024-01-15T10:30:00")).toBe("datetime");
    expect(inferFieldType("2024-01-15T10:30:00Z")).toBe("datetime");
    expect(inferFieldType("2024-01-15T10:30:00.123Z")).toBe("datetime");
    expect(inferFieldType("2024-01-15T10:30:00+09:00")).toBe("datetime");
    expect(inferFieldType("2024-01-15T10:30:00-05:30")).toBe("datetime");
  });

  it("detects string for everything else", () => {
    expect(inferFieldType("hello")).toBe("string");
    expect(inferFieldType("abc123")).toBe("string");
    expect(inferFieldType("2024/01/15")).toBe("string");
    expect(inferFieldType("12-34-56")).toBe("string");
  });
});

// =============================================================================
// coerceFieldValue
// =============================================================================

describe("coerceFieldValue", () => {
  it("coerces null", () => {
    expect(coerceFieldValue("", "null")).toBe(null);
  });

  it("coerces boolean", () => {
    expect(coerceFieldValue("true", "boolean")).toBe(true);
    expect(coerceFieldValue("false", "boolean")).toBe(false);
  });

  it("coerces integer", () => {
    expect(coerceFieldValue("42", "integer")).toBe(42);
    expect(coerceFieldValue("-10", "integer")).toBe(-10);
  });

  it("coerces number", () => {
    expect(coerceFieldValue("3.14", "number")).toBeCloseTo(3.14);
    expect(coerceFieldValue("1e10", "number")).toBe(1e10);
  });

  it("coerces date", () => {
    const d = coerceFieldValue("2024-01-15", "date");
    expect(d).toBeInstanceOf(Date);
    expect((d as Date).getUTCFullYear()).toBe(2024);
    expect((d as Date).getUTCMonth()).toBe(0); // January
    expect((d as Date).getUTCDate()).toBe(15);
  });

  it("coerces datetime", () => {
    const d = coerceFieldValue("2024-01-15T10:30:00Z", "datetime");
    expect(d).toBeInstanceOf(Date);
    expect((d as Date).getUTCHours()).toBe(10);
  });

  it("returns string as-is", () => {
    expect(coerceFieldValue("hello", "string")).toBe("hello");
  });
});

// =============================================================================
// analyzeColumns
// =============================================================================

describe("analyzeColumns", () => {
  it("analyzes column types", () => {
    const doc = parseDsv("name,age,active\nAlice,30,true\nBob,25,false\n");
    const columns = analyzeColumns(doc);
    expect(columns).toHaveLength(3);
    expect(columns[0].header).toBe("name");
    expect(columns[0].inferredType).toBe("string");
    expect(columns[1].header).toBe("age");
    expect(columns[1].inferredType).toBe("integer");
    expect(columns[2].header).toBe("active");
    expect(columns[2].inferredType).toBe("boolean");
  });

  it("handles mixed types (majority wins)", () => {
    const doc = parseDsv("val\n1\n2\nhello\n");
    const columns = analyzeColumns(doc);
    // 2 integers vs 1 string → integer
    expect(columns[0].inferredType).toBe("integer");
  });

  it("handles null values in counts", () => {
    // Empty lines are skipped by the parser, so we use empty fields instead
    const doc = parseDsv("val\n1\n\n3\n");
    const columns = analyzeColumns(doc);
    // Two data rows: "1" and "3" (empty line is skipped)
    expect(columns[0].nullCount).toBe(0);
    expect(columns[0].totalCount).toBe(2);
  });

  it("counts null for empty field values", () => {
    // Explicit empty fields (not empty lines)
    const doc = parseDsv("a,b\n1,\n,3\n");
    const columns = analyzeColumns(doc);
    expect(columns[0].nullCount).toBe(1); // second row, field "a" is empty
    expect(columns[1].nullCount).toBe(1); // first row, field "b" is empty
  });

  it("handles empty document", () => {
    const doc = parseDsv("name\n");
    const columns = analyzeColumns(doc);
    expect(columns).toHaveLength(1);
    expect(columns[0].totalCount).toBe(0);
  });

  it("handles ragged records", () => {
    const doc = parseDsv("a,b,c\n1\n1,2,3\n");
    const columns = analyzeColumns(doc);
    expect(columns).toHaveLength(3);
    // First record only has 1 field → columns 1,2 get null count
    expect(columns[1].nullCount).toBe(1);
    expect(columns[2].nullCount).toBe(1);
  });
});

// =============================================================================
// DsvParseContext
// =============================================================================

describe("DsvParseContext", () => {
  it("provides header lookup", () => {
    const doc = parseDsv("name,age\nAlice,30\n");
    const ctx = createParseContext(doc);
    expect(ctx.headers).toEqual(["name", "age"]);
    expect(ctx.headerIndex.get("name")).toBe(0);
    expect(ctx.headerIndex.get("age")).toBe(1);
  });

  it("getField retrieves value by column name", () => {
    const doc = parseDsv("name,age\nAlice,30\n");
    const ctx = createParseContext(doc);
    expect(ctx.getField(doc.records[0], "name")).toBe("Alice");
    expect(ctx.getField(doc.records[0], "age")).toBe("30");
  });

  it("getField returns undefined for unknown column", () => {
    const doc = parseDsv("name\nAlice\n");
    const ctx = createParseContext(doc);
    expect(ctx.getField(doc.records[0], "unknown")).toBeUndefined();
  });

  it("getFieldByIndex retrieves value by index", () => {
    const doc = parseDsv("name,age\nAlice,30\n");
    const ctx = createParseContext(doc);
    expect(ctx.getFieldByIndex(doc.records[0], 0)).toBe("Alice");
    expect(ctx.getFieldByIndex(doc.records[0], 1)).toBe("30");
    expect(ctx.getFieldByIndex(doc.records[0], 2)).toBeUndefined();
    expect(ctx.getFieldByIndex(doc.records[0], -1)).toBeUndefined();
  });

  it("recordToObject converts record to keyed object", () => {
    const doc = parseDsv("name,age\nAlice,30\n");
    const ctx = createParseContext(doc);
    expect(ctx.recordToObject(doc.records[0])).toEqual({
      name: "Alice",
      age: "30",
    });
  });

  it("toObjects converts all records", () => {
    const doc = parseDsv("name,age\nAlice,30\nBob,25\n");
    const ctx = createParseContext(doc);
    expect(ctx.toObjects()).toEqual([
      { name: "Alice", age: "30" },
      { name: "Bob", age: "25" },
    ]);
  });

  it("getTypedField returns typed values", () => {
    const doc = parseDsv("name,age,active\nAlice,30,true\n");
    const ctx = createParseContext(doc);
    expect(ctx.getTypedField(doc.records[0], "name")).toBe("Alice");
    expect(ctx.getTypedField(doc.records[0], "age")).toBe(30);
    expect(ctx.getTypedField(doc.records[0], "active")).toBe(true);
  });

  it("handles duplicate headers (first occurrence wins)", () => {
    const doc = parseDsv("a,a\n1,2\n");
    const ctx = createParseContext(doc);
    expect(ctx.getField(doc.records[0], "a")).toBe("1");
  });

  it("handles missing fields in short records", () => {
    const doc = parseDsv("a,b,c\n1\n");
    const ctx = createParseContext(doc);
    expect(ctx.recordToObject(doc.records[0])).toEqual({
      a: "1",
      b: undefined,
      c: undefined,
    });
  });
});
