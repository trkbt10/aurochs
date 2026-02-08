import { describe, it, expect } from "vitest";
import { renderSheetMermaid } from "./sheet-renderer";

describe("renderSheetMermaid", () => {
  it("renders empty sheet message", () => {
    const result = renderSheetMermaid({
      name: "Sheet1",
      rows: [],
      columnCount: 0,
    });
    expect(result).toBe("(empty sheet: Sheet1)");
  });

  it("renders a basic sheet as markdown table", () => {
    const result = renderSheetMermaid({
      name: "Sheet1",
      rows: [
        {
          rowNumber: 1,
          cells: [
            { value: "Name", type: "string" },
            { value: 42, type: "number" },
          ],
        },
      ],
      columnCount: 2,
    });
    expect(result).toContain("| A | B |");
    expect(result).toContain("Name");
    expect(result).toContain("42");
  });

  it("includes row numbers by default", () => {
    const result = renderSheetMermaid({
      name: "S",
      rows: [{ rowNumber: 5, cells: [{ value: "x", type: "string" }] }],
      columnCount: 1,
    });
    expect(result).toContain("| 5 |");
  });

  it("hides row numbers when disabled", () => {
    const result = renderSheetMermaid({
      name: "S",
      rows: [{ rowNumber: 1, cells: [{ value: "x", type: "string" }] }],
      columnCount: 1,
      showRowNumbers: false,
    });
    const lines = result.split("\n");
    // Header should just be "| A |"
    expect(lines[0]).toBe("| A |");
  });

  it("uses right alignment for number columns", () => {
    const result = renderSheetMermaid({
      name: "S",
      rows: [{ rowNumber: 1, cells: [{ value: 100, type: "number" }] }],
      columnCount: 1,
    });
    expect(result).toContain("---:");
  });

  it("handles empty cells", () => {
    const result = renderSheetMermaid({
      name: "S",
      rows: [
        {
          rowNumber: 1,
          cells: [
            { value: "a", type: "string" },
            { value: null, type: "empty" },
          ],
        },
      ],
      columnCount: 2,
    });
    expect(result).toContain("| a |  |");
  });
});
