/**
 * @file Tests for Units Serialization
 */

import {
  serializeInt,
  serializeIntOptional,
  serializeFloat,
  serializeFloatOptional,
  serializeBoolean,
  serializeBooleanOptional,
  serializeRowIndex,
  serializeColIndex,
  serializeStyleId,
  serializeCellRef,
  serializeRef,
  serializeRgbHex,
  colIndexToLetter,
  letterToColIndex,
} from "./units";
import { rowIdx, colIdx, styleId } from "../domain/types";
import type { CellAddress, CellRange } from "../domain/cell/address";

describe("units serialization", () => {
  // ===========================================================================
  // Integer Serialization
  // ===========================================================================

  describe("serializeInt", () => {
    it("should serialize positive integers", () => {
      expect(serializeInt(0)).toBe("0");
      expect(serializeInt(1)).toBe("1");
      expect(serializeInt(42)).toBe("42");
      expect(serializeInt(1000000)).toBe("1000000");
    });

    it("should serialize negative integers", () => {
      expect(serializeInt(-1)).toBe("-1");
      expect(serializeInt(-100)).toBe("-100");
    });

    it("should truncate floating-point values to integers", () => {
      expect(serializeInt(3.14)).toBe("3");
      expect(serializeInt(3.99)).toBe("3");
      expect(serializeInt(-3.14)).toBe("-3");
    });
  });

  describe("serializeIntOptional", () => {
    it("should serialize defined values", () => {
      expect(serializeIntOptional(42)).toBe("42");
      expect(serializeIntOptional(0)).toBe("0");
    });

    it("should return undefined for undefined values", () => {
      expect(serializeIntOptional(undefined)).toBeUndefined();
    });
  });

  // ===========================================================================
  // Float Serialization
  // ===========================================================================

  describe("serializeFloat", () => {
    it("should serialize integer values without decimal point", () => {
      expect(serializeFloat(0)).toBe("0");
      expect(serializeFloat(1)).toBe("1");
      expect(serializeFloat(42)).toBe("42");
      expect(serializeFloat(-5)).toBe("-5");
    });

    it("should serialize floating-point values", () => {
      expect(serializeFloat(3.14)).toBe("3.14");
      expect(serializeFloat(-2.5)).toBe("-2.5");
      expect(serializeFloat(0.1)).toBe("0.1");
    });

    it("should remove unnecessary trailing zeros", () => {
      expect(serializeFloat(1.5)).toBe("1.5");
      expect(serializeFloat(2.0)).toBe("2");
      expect(serializeFloat(3.10)).toBe("3.1");
    });

    it("should handle very small values", () => {
      expect(serializeFloat(0.001)).toBe("0.001");
      expect(serializeFloat(0.0001)).toBe("0.0001");
    });

    it("should handle scientific notation for extreme values", () => {
      // JavaScript automatically uses scientific notation for very large/small numbers
      expect(serializeFloat(1e20)).toBe("100000000000000000000");
      expect(serializeFloat(1e-10)).toBe("1e-10");
    });
  });

  describe("serializeFloatOptional", () => {
    it("should serialize defined values", () => {
      expect(serializeFloatOptional(3.14)).toBe("3.14");
      expect(serializeFloatOptional(0)).toBe("0");
    });

    it("should return undefined for undefined values", () => {
      expect(serializeFloatOptional(undefined)).toBeUndefined();
    });
  });

  // ===========================================================================
  // Boolean Serialization
  // ===========================================================================

  describe("serializeBoolean", () => {
    it("should serialize true as '1'", () => {
      expect(serializeBoolean(true)).toBe("1");
    });

    it("should serialize false as '0'", () => {
      expect(serializeBoolean(false)).toBe("0");
    });
  });

  describe("serializeBooleanOptional", () => {
    it("should serialize true as '1'", () => {
      expect(serializeBooleanOptional(true)).toBe("1");
    });

    it("should serialize false as '0'", () => {
      expect(serializeBooleanOptional(false)).toBe("0");
    });

    it("should return undefined for undefined values", () => {
      expect(serializeBooleanOptional(undefined)).toBeUndefined();
    });
  });

  // ===========================================================================
  // Branded Type Serialization
  // ===========================================================================

  describe("serializeRowIndex", () => {
    it("should serialize RowIndex values", () => {
      expect(serializeRowIndex(rowIdx(1))).toBe("1");
      expect(serializeRowIndex(rowIdx(100))).toBe("100");
      expect(serializeRowIndex(rowIdx(1048576))).toBe("1048576");
    });
  });

  describe("serializeColIndex", () => {
    it("should serialize ColIndex values", () => {
      expect(serializeColIndex(colIdx(1))).toBe("1");
      expect(serializeColIndex(colIdx(26))).toBe("26");
      expect(serializeColIndex(colIdx(16384))).toBe("16384");
    });
  });

  describe("serializeStyleId", () => {
    it("should serialize StyleId values", () => {
      expect(serializeStyleId(styleId(0))).toBe("0");
      expect(serializeStyleId(styleId(5))).toBe("5");
      expect(serializeStyleId(styleId(100))).toBe("100");
    });
  });

  // ===========================================================================
  // Cell Reference Serialization
  // ===========================================================================

  describe("serializeCellRef", () => {
    it("should serialize simple cell reference", () => {
      const addr: CellAddress = {
        col: colIdx(1),
        row: rowIdx(1),
        colAbsolute: false,
        rowAbsolute: false,
      };
      expect(serializeCellRef(addr)).toBe("A1");
    });

    it("should serialize fully absolute reference", () => {
      const addr: CellAddress = {
        col: colIdx(1),
        row: rowIdx(1),
        colAbsolute: true,
        rowAbsolute: true,
      };
      expect(serializeCellRef(addr)).toBe("$A$1");
    });

    it("should serialize column-absolute reference", () => {
      const addr: CellAddress = {
        col: colIdx(1),
        row: rowIdx(1),
        colAbsolute: true,
        rowAbsolute: false,
      };
      expect(serializeCellRef(addr)).toBe("$A1");
    });

    it("should serialize row-absolute reference", () => {
      const addr: CellAddress = {
        col: colIdx(1),
        row: rowIdx(1),
        colAbsolute: false,
        rowAbsolute: true,
      };
      expect(serializeCellRef(addr)).toBe("A$1");
    });

    it("should serialize multi-letter column", () => {
      const addr: CellAddress = {
        col: colIdx(27),
        row: rowIdx(100),
        colAbsolute: false,
        rowAbsolute: false,
      };
      expect(serializeCellRef(addr)).toBe("AA100");
    });

    it("should serialize maximum valid reference", () => {
      const addr: CellAddress = {
        col: colIdx(16384),
        row: rowIdx(1048576),
        colAbsolute: false,
        rowAbsolute: false,
      };
      expect(serializeCellRef(addr)).toBe("XFD1048576");
    });
  });

  describe("serializeRef", () => {
    it("should serialize simple range", () => {
      const range: CellRange = {
        start: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
        end: { col: colIdx(2), row: rowIdx(2), colAbsolute: false, rowAbsolute: false },
      };
      expect(serializeRef(range)).toBe("A1:B2");
    });

    it("should serialize single cell as single reference (not A1:A1)", () => {
      const range: CellRange = {
        start: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
        end: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
      };
      expect(serializeRef(range)).toBe("A1");
    });

    it("should serialize absolute range", () => {
      const range: CellRange = {
        start: { col: colIdx(1), row: rowIdx(1), colAbsolute: true, rowAbsolute: true },
        end: { col: colIdx(2), row: rowIdx(2), colAbsolute: true, rowAbsolute: true },
      };
      expect(serializeRef(range)).toBe("$A$1:$B$2");
    });

    it("should serialize sheet-qualified range", () => {
      const range: CellRange = {
        start: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
        end: { col: colIdx(2), row: rowIdx(2), colAbsolute: false, rowAbsolute: false },
        sheetName: "Sheet1",
      };
      expect(serializeRef(range)).toBe("Sheet1!A1:B2");
    });

    it("should quote sheet names with spaces", () => {
      const range: CellRange = {
        start: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
        end: { col: colIdx(2), row: rowIdx(2), colAbsolute: false, rowAbsolute: false },
        sheetName: "My Sheet",
      };
      expect(serializeRef(range)).toBe("'My Sheet'!A1:B2");
    });

    it("should quote sheet names with special characters", () => {
      const range: CellRange = {
        start: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
        end: { col: colIdx(2), row: rowIdx(2), colAbsolute: false, rowAbsolute: false },
        sheetName: "Sheet!Name",
      };
      expect(serializeRef(range)).toBe("'Sheet!Name'!A1:B2");
    });
  });

  // ===========================================================================
  // RGB Hex Serialization
  // ===========================================================================

  describe("serializeRgbHex", () => {
    it("should convert lowercase to uppercase", () => {
      expect(serializeRgbHex("ff0000")).toBe("FF0000");
      expect(serializeRgbHex("aabbcc")).toBe("AABBCC");
    });

    it("should preserve uppercase", () => {
      expect(serializeRgbHex("FF0000")).toBe("FF0000");
      expect(serializeRgbHex("AABBCC")).toBe("AABBCC");
    });

    it("should handle mixed case", () => {
      expect(serializeRgbHex("Ff0000")).toBe("FF0000");
      expect(serializeRgbHex("aAbBcC")).toBe("AABBCC");
    });

    it("should handle AARRGGBB format", () => {
      expect(serializeRgbHex("ffff0000")).toBe("FFFF0000");
      expect(serializeRgbHex("80000000")).toBe("80000000");
    });
  });

  // ===========================================================================
  // Column Letter Conversion
  // ===========================================================================

  describe("colIndexToLetter", () => {
    it("should convert single-digit indices", () => {
      expect(colIndexToLetter(1)).toBe("A");
      expect(colIndexToLetter(2)).toBe("B");
      expect(colIndexToLetter(26)).toBe("Z");
    });

    it("should convert double-letter columns", () => {
      expect(colIndexToLetter(27)).toBe("AA");
      expect(colIndexToLetter(28)).toBe("AB");
      expect(colIndexToLetter(52)).toBe("AZ");
      expect(colIndexToLetter(53)).toBe("BA");
    });

    it("should convert triple-letter columns", () => {
      expect(colIndexToLetter(703)).toBe("AAA");
    });

    it("should handle maximum Excel column (XFD = 16384)", () => {
      expect(colIndexToLetter(16384)).toBe("XFD");
    });

    it("should throw for index < 1", () => {
      expect(() => colIndexToLetter(0)).toThrow("Column index must be >= 1");
      expect(() => colIndexToLetter(-1)).toThrow("Column index must be >= 1");
    });
  });

  describe("letterToColIndex", () => {
    it("should convert single letters", () => {
      expect(letterToColIndex("A")).toBe(1);
      expect(letterToColIndex("B")).toBe(2);
      expect(letterToColIndex("Z")).toBe(26);
    });

    it("should convert double letters", () => {
      expect(letterToColIndex("AA")).toBe(27);
      expect(letterToColIndex("AB")).toBe(28);
      expect(letterToColIndex("AZ")).toBe(52);
      expect(letterToColIndex("BA")).toBe(53);
    });

    it("should convert triple letters", () => {
      expect(letterToColIndex("AAA")).toBe(703);
    });

    it("should handle maximum Excel column (XFD)", () => {
      expect(letterToColIndex("XFD")).toBe(16384);
    });

    it("should be case-insensitive", () => {
      expect(letterToColIndex("a")).toBe(1);
      expect(letterToColIndex("aa")).toBe(27);
      expect(letterToColIndex("Aa")).toBe(27);
    });

    it("should throw for empty input", () => {
      expect(() => letterToColIndex("")).toThrow("Column letter cannot be empty");
    });

    it("should throw for invalid characters", () => {
      expect(() => letterToColIndex("A1")).toThrow("Invalid column letter");
      expect(() => letterToColIndex("$A")).toThrow("Invalid column letter");
      expect(() => letterToColIndex("1")).toThrow("Invalid column letter");
    });
  });

  // ===========================================================================
  // Round-Trip Tests
  // ===========================================================================

  describe("round-trip: colIndexToLetter <-> letterToColIndex", () => {
    const testIndices = [1, 2, 26, 27, 52, 53, 100, 256, 702, 703, 16384];

    for (const index of testIndices) {
      it(`round-trips index ${index}`, () => {
        const letter = colIndexToLetter(index);
        const backToIndex = letterToColIndex(letter);
        expect(backToIndex).toBe(index);
      });
    }
  });

  describe("round-trip: letterToColIndex <-> colIndexToLetter", () => {
    const testLetters = ["A", "B", "Z", "AA", "AB", "AZ", "BA", "ZZ", "AAA", "XFD"];

    for (const letter of testLetters) {
      it(`round-trips letter "${letter}"`, () => {
        const index = letterToColIndex(letter);
        const backToLetter = colIndexToLetter(index);
        expect(backToLetter).toBe(letter.toUpperCase());
      });
    }
  });

  describe("round-trip: serializeInt <-> parseIntAttr (conceptual)", () => {
    // Verify serialized values can be parsed back
    it("serialized integers match expected format", () => {
      expect(serializeInt(0)).toBe("0");
      expect(serializeInt(42)).toBe("42");
      expect(serializeInt(-1)).toBe("-1");
      // parseInt should recover original value
      expect(parseInt(serializeInt(42), 10)).toBe(42);
      expect(parseInt(serializeInt(-100), 10)).toBe(-100);
    });
  });

  describe("round-trip: serializeFloat <-> parseFloatAttr (conceptual)", () => {
    it("serialized floats match expected format", () => {
      expect(serializeFloat(3.14)).toBe("3.14");
      expect(serializeFloat(2.0)).toBe("2");
      // parseFloat should recover original value
      expect(parseFloat(serializeFloat(3.14))).toBeCloseTo(3.14);
      expect(parseFloat(serializeFloat(0.001))).toBeCloseTo(0.001);
    });
  });

  describe("round-trip: serializeBoolean <-> parseBooleanAttr (conceptual)", () => {
    it("serialized booleans match expected format", () => {
      expect(serializeBoolean(true)).toBe("1");
      expect(serializeBoolean(false)).toBe("0");
      // Verify parser would recover original value
      expect(serializeBoolean(true) === "1" || serializeBoolean(true) === "true").toBe(true);
      expect(serializeBoolean(false) === "0" || serializeBoolean(false) === "false").toBe(true);
    });
  });
});
