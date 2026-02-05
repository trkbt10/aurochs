import { describe, it, expect } from "bun:test";
import { renderSheetAscii } from "./sheet-renderer";
import { TABLE_CHARS } from "@oxen-renderer/drawing-ml/ascii";

describe("sheet-renderer", () => {
  it("renders a sheet with row numbers and column headers", () => {
    const result = renderSheetAscii({
      name: "Sheet1",
      rows: [
        {
          rowNumber: 1,
          cells: [
            { value: "Name", type: "string" },
            { value: 1234, type: "number" },
            { value: "5.2%", type: "string" },
          ],
        },
        {
          rowNumber: 2,
          cells: [
            { value: "Alice", type: "string" },
            { value: 987, type: "number" },
            { value: "-2.1%", type: "string" },
          ],
        },
      ],
      columnCount: 3,
      width: 50,
    });
    expect(result).toContain("A");
    expect(result).toContain("B");
    expect(result).toContain("C");
    expect(result).toContain("Name");
    expect(result).toContain("Alice");
    expect(result).toContain(TABLE_CHARS.topLeft);
  });

  it("right-aligns number columns", () => {
    const result = renderSheetAscii({
      name: "Sheet1",
      rows: [
        {
          rowNumber: 1,
          cells: [
            { value: "Item", type: "string" },
            { value: 100, type: "number" },
          ],
        },
      ],
      columnCount: 2,
      width: 40,
    });
    expect(result).toContain("Item");
    expect(result).toContain("100");
  });

  it("returns empty sheet message when no rows", () => {
    const result = renderSheetAscii({
      name: "Empty",
      rows: [],
      columnCount: 0,
      width: 40,
    });
    expect(result).toContain("empty sheet");
  });

  it("renders without row numbers when disabled", () => {
    const result = renderSheetAscii({
      name: "Sheet1",
      rows: [
        {
          rowNumber: 1,
          cells: [{ value: "A1", type: "string" }],
        },
      ],
      columnCount: 1,
      width: 30,
      showRowNumbers: false,
    });
    expect(result).toContain("A1");
  });

  it("renders without column headers when disabled", () => {
    const result = renderSheetAscii({
      name: "Sheet1",
      rows: [
        {
          rowNumber: 1,
          cells: [{ value: "Data", type: "string" }],
        },
      ],
      columnCount: 1,
      width: 30,
      showColumnHeaders: false,
    });
    expect(result).toContain("Data");
    expect(result).not.toContain("  A  ");
  });

  it("handles null cell values", () => {
    const result = renderSheetAscii({
      name: "Sheet1",
      rows: [
        {
          rowNumber: 1,
          cells: [{ value: null, type: "empty" }],
        },
      ],
      columnCount: 1,
      width: 30,
    });
    expect(result.length).toBeGreaterThan(0);
  });
});
