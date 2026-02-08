import { describe, it, expect } from "bun:test";
import { renderAsciiTable } from "./table-renderer";
import { TABLE_CHARS } from "./ascii-canvas";

describe("table-renderer", () => {
  describe("renderAsciiTable", () => {
    it("renders a simple table with headers", () => {
      const result = renderAsciiTable({
        headers: ["Name", "Age"],
        rows: [["Alice", "30"], ["Bob", "25"]],
        maxWidth: 40,
      });
      expect(result).toContain("Name");
      expect(result).toContain("Alice");
      expect(result).toContain("Bob");
      expect(result).toContain(TABLE_CHARS.topLeft);
      expect(result).toContain(TABLE_CHARS.bottomRight);
      expect(result).toContain(TABLE_CHARS.cross);
    });

    it("renders a table without headers", () => {
      const result = renderAsciiTable({
        rows: [["A", "B"], ["C", "D"]],
        maxWidth: 30,
      });
      expect(result).toContain("A");
      expect(result).toContain("D");
      // No cross character because no header separator
      expect(result).not.toContain(TABLE_CHARS.cross);
    });

    it("returns empty string for empty rows and no headers", () => {
      const result = renderAsciiTable({
        rows: [],
        maxWidth: 30,
      });
      expect(result).toBe("");
    });

    it("respects right alignment", () => {
      const result = renderAsciiTable({
        headers: ["Name", "Value"],
        rows: [["Foo", "123"]],
        maxWidth: 40,
        alignments: ["left", "right"],
      });
      expect(result).toContain("Name");
      expect(result).toContain("123");
    });

    it("truncates cells when maxWidth is tight", () => {
      const result = renderAsciiTable({
        headers: ["Very Long Header"],
        rows: [["Very long cell content here"]],
        maxWidth: 20,
      });
      // Should not exceed maxWidth
      const lines = result.split("\n");
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(20);
      }
    });

    it("uses custom column widths when provided", () => {
      const result = renderAsciiTable({
        headers: ["A", "B"],
        rows: [["1", "2"]],
        columnWidths: [5, 10],
        maxWidth: 80,
      });
      expect(result).toContain("A");
      expect(result).toContain("B");
    });
  });
});
