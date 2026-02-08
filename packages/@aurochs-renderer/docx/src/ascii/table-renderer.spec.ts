import { describe, it, expect } from "bun:test";
import { renderDocxTableAscii } from "./table-renderer";
import { TABLE_CHARS } from "@aurochs-renderer/drawing-ml/ascii";

describe("docx-table-renderer", () => {
  it("renders a table with header and data rows", () => {
    const result = renderDocxTableAscii(
      {
        type: "table",
        rows: [
          { cells: [{ text: "Name" }, { text: "Age" }] },
          { cells: [{ text: "Alice" }, { text: "30" }] },
          { cells: [{ text: "Bob" }, { text: "25" }] },
        ],
      },
      40,
    );
    expect(result).toContain("Name");
    expect(result).toContain("Alice");
    expect(result).toContain(TABLE_CHARS.topLeft);
    expect(result).toContain(TABLE_CHARS.cross);
  });

  it("returns empty string for empty table", () => {
    expect(renderDocxTableAscii({ type: "table", rows: [] }, 40)).toBe("");
  });

  it("handles single-row table (header only)", () => {
    const result = renderDocxTableAscii(
      {
        type: "table",
        rows: [{ cells: [{ text: "Col A" }, { text: "Col B" }] }],
      },
      40,
    );
    expect(result).toContain("Col A");
  });
});
