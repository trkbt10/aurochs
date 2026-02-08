/**
 * @file Tests for cell serialization
 */
import type { Cell, CellValue } from "@aurochs-office/xlsx/domain/cell/types";
import { colIdx, rowIdx, styleId } from "@aurochs-office/xlsx/domain/types";
import { serializeCell, formatCellValue } from "./cell-serializer";

describe("cell-serializer", () => {
  describe("serializeCell", () => {
    it("should serialize a string cell", () => {
      const cell: Cell = {
        address: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
        value: { type: "string", value: "Hello" },
      };

      const result = serializeCell(cell);

      expect(result.ref).toBe("A1");
      expect(result.type).toBe("string");
      expect(result.value).toBe("Hello");
      expect(result.formula).toBeUndefined();
      expect(result.styleId).toBeUndefined();
    });

    it("should serialize a number cell", () => {
      const cell: Cell = {
        address: { col: colIdx(2), row: rowIdx(3), colAbsolute: false, rowAbsolute: false },
        value: { type: "number", value: 42.5 },
      };

      const result = serializeCell(cell);

      expect(result.ref).toBe("B3");
      expect(result.type).toBe("number");
      expect(result.value).toBe(42.5);
    });

    it("should serialize a boolean cell", () => {
      const cell: Cell = {
        address: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
        value: { type: "boolean", value: true },
      };

      const result = serializeCell(cell);

      expect(result.type).toBe("boolean");
      expect(result.value).toBe(true);
    });

    it("should serialize a date cell", () => {
      const testDate = new Date("2025-01-15T12:00:00.000Z");
      const cell: Cell = {
        address: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
        value: { type: "date", value: testDate },
      };

      const result = serializeCell(cell);

      expect(result.type).toBe("date");
      expect(result.value).toBe("2025-01-15T12:00:00.000Z");
    });

    it("should serialize an error cell", () => {
      const cell: Cell = {
        address: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
        value: { type: "error", value: "#DIV/0!" },
      };

      const result = serializeCell(cell);

      expect(result.type).toBe("error");
      expect(result.value).toBe("#DIV/0!");
    });

    it("should serialize an empty cell", () => {
      const cell: Cell = {
        address: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
        value: { type: "empty" },
      };

      const result = serializeCell(cell);

      expect(result.type).toBe("empty");
      expect(result.value).toBeNull();
    });

    it("should include formula when present", () => {
      const cell: Cell = {
        address: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
        value: { type: "number", value: 10 },
        formula: { expression: "A1+B1", type: "normal" },
      };

      const result = serializeCell(cell);

      expect(result.formula).toBe("A1+B1");
      expect(result.value).toBe(10);
    });

    it("should include styleId when present", () => {
      const cell: Cell = {
        address: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
        value: { type: "string", value: "Styled" },
        styleId: styleId(5),
      };

      const result = serializeCell(cell);

      expect(result.styleId).toBe(5);
    });

    it("should handle column index AA correctly", () => {
      const cell: Cell = {
        address: { col: colIdx(27), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
        value: { type: "number", value: 1 },
      };

      const result = serializeCell(cell);

      expect(result.ref).toBe("AA1");
    });
  });

  describe("formatCellValue", () => {
    it("should format string values", () => {
      const value: CellValue = { type: "string", value: "Hello" };
      expect(formatCellValue(value)).toBe("Hello");
    });

    it("should format number values", () => {
      const value: CellValue = { type: "number", value: 42.5 };
      expect(formatCellValue(value)).toBe("42.5");
    });

    it("should format boolean TRUE", () => {
      const value: CellValue = { type: "boolean", value: true };
      expect(formatCellValue(value)).toBe("TRUE");
    });

    it("should format boolean FALSE", () => {
      const value: CellValue = { type: "boolean", value: false };
      expect(formatCellValue(value)).toBe("FALSE");
    });

    it("should format date values as ISO string", () => {
      const value: CellValue = { type: "date", value: new Date("2025-01-15T12:00:00.000Z") };
      expect(formatCellValue(value)).toBe("2025-01-15T12:00:00.000Z");
    });

    it("should format error values", () => {
      const value: CellValue = { type: "error", value: "#VALUE!" };
      expect(formatCellValue(value)).toBe("#VALUE!");
    });

    it("should format empty values as empty string", () => {
      const value: CellValue = { type: "empty" };
      expect(formatCellValue(value)).toBe("");
    });
  });
});
