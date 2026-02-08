import { describe, it, expect } from "vitest";
import { renderMarkdownTable } from "./markdown-table";

describe("renderMarkdownTable", () => {
  it("renders a basic table", () => {
    const result = renderMarkdownTable({
      headers: ["Name", "Value"],
      rows: [
        ["A", "1"],
        ["B", "2"],
      ],
    });
    expect(result).toBe(
      "| Name | Value |\n| --- | --- |\n| A | 1 |\n| B | 2 |",
    );
  });

  it("escapes pipe characters in cells", () => {
    const result = renderMarkdownTable({
      headers: ["Col"],
      rows: [["a|b"]],
    });
    expect(result).toContain("a\\|b");
  });

  it("supports right alignment", () => {
    const result = renderMarkdownTable({
      headers: ["Num"],
      rows: [["42"]],
      alignments: ["right"],
    });
    expect(result).toContain("---:");
  });

  it("supports center alignment", () => {
    const result = renderMarkdownTable({
      headers: ["Mid"],
      rows: [["x"]],
      alignments: ["center"],
    });
    expect(result).toContain(":---:");
  });

  it("returns empty string for zero columns", () => {
    expect(renderMarkdownTable({ headers: [], rows: [] })).toBe("");
  });

  it("pads short rows with empty cells", () => {
    const result = renderMarkdownTable({
      headers: ["A", "B", "C"],
      rows: [["1"]],
    });
    const lines = result.split("\n");
    expect(lines[2]).toBe("| 1 |  |  |");
  });

  it("replaces newlines in cell content", () => {
    const result = renderMarkdownTable({
      headers: ["Text"],
      rows: [["line1\nline2"]],
    });
    expect(result).toContain("line1 line2");
    expect(result).not.toContain("\nline2");
  });
});
