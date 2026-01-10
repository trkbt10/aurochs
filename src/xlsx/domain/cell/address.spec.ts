/**
 * @file Tests for Cell Address and Range parsing/formatting
 */
import {
  columnLetterToIndex,
  indexToColumnLetter,
  parseCellRef,
  parseRange,
  formatCellRef,
  formatRange,
  expandRange,
  type CellAddress,
  type CellRange,
} from "./address";
import { colIdx, rowIdx } from "../types";

describe("columnLetterToIndex", () => {
  it("converts single letters correctly", () => {
    expect(columnLetterToIndex("A")).toBe(1);
    expect(columnLetterToIndex("B")).toBe(2);
    expect(columnLetterToIndex("Z")).toBe(26);
  });

  it("converts double letters correctly", () => {
    expect(columnLetterToIndex("AA")).toBe(27);
    expect(columnLetterToIndex("AB")).toBe(28);
    expect(columnLetterToIndex("AZ")).toBe(52);
    expect(columnLetterToIndex("BA")).toBe(53);
  });

  it("converts triple letters correctly", () => {
    expect(columnLetterToIndex("AAA")).toBe(703);
  });

  it("is case-insensitive", () => {
    expect(columnLetterToIndex("a")).toBe(1);
    expect(columnLetterToIndex("aa")).toBe(27);
  });

  it("throws on empty input", () => {
    expect(() => columnLetterToIndex("")).toThrow("Column letter cannot be empty");
  });

  it("throws on invalid characters", () => {
    expect(() => columnLetterToIndex("A1")).toThrow("Invalid column letter");
    expect(() => columnLetterToIndex("$A")).toThrow("Invalid column letter");
  });
});

describe("indexToColumnLetter", () => {
  it("converts single digits correctly", () => {
    expect(indexToColumnLetter(colIdx(1))).toBe("A");
    expect(indexToColumnLetter(colIdx(2))).toBe("B");
    expect(indexToColumnLetter(colIdx(26))).toBe("Z");
  });

  it("converts to double letters correctly", () => {
    expect(indexToColumnLetter(colIdx(27))).toBe("AA");
    expect(indexToColumnLetter(colIdx(28))).toBe("AB");
    expect(indexToColumnLetter(colIdx(52))).toBe("AZ");
    expect(indexToColumnLetter(colIdx(53))).toBe("BA");
  });

  it("converts to triple letters correctly", () => {
    expect(indexToColumnLetter(colIdx(703))).toBe("AAA");
  });

  it("throws on index < 1", () => {
    expect(() => indexToColumnLetter(colIdx(0))).toThrow("Column index must be >= 1");
    expect(() => indexToColumnLetter(colIdx(-1))).toThrow("Column index must be >= 1");
  });
});

describe("columnLetterToIndex and indexToColumnLetter round-trip", () => {
  it("round-trips correctly for various values", () => {
    const testValues = [1, 2, 26, 27, 52, 53, 100, 256, 702, 703, 16384];
    for (const val of testValues) {
      const letter = indexToColumnLetter(colIdx(val));
      const backToIndex = columnLetterToIndex(letter);
      expect(backToIndex).toBe(val);
    }
  });
});

describe("parseCellRef", () => {
  it("parses simple cell reference", () => {
    const result = parseCellRef("A1");
    expect(result).toEqual({
      col: colIdx(1),
      row: rowIdx(1),
      colAbsolute: false,
      rowAbsolute: false,
    });
  });

  it("parses fully absolute reference ($A$1)", () => {
    const result = parseCellRef("$A$1");
    expect(result).toEqual({
      col: colIdx(1),
      row: rowIdx(1),
      colAbsolute: true,
      rowAbsolute: true,
    });
  });

  it("parses column-absolute reference ($A1)", () => {
    const result = parseCellRef("$A1");
    expect(result).toEqual({
      col: colIdx(1),
      row: rowIdx(1),
      colAbsolute: true,
      rowAbsolute: false,
    });
  });

  it("parses row-absolute reference (A$1)", () => {
    const result = parseCellRef("A$1");
    expect(result).toEqual({
      col: colIdx(1),
      row: rowIdx(1),
      colAbsolute: false,
      rowAbsolute: true,
    });
  });

  it("parses multi-character column", () => {
    const result = parseCellRef("AA100");
    expect(result).toEqual({
      col: colIdx(27),
      row: rowIdx(100),
      colAbsolute: false,
      rowAbsolute: false,
    });
  });

  it("parses absolute multi-character column", () => {
    const result = parseCellRef("$XFD$1048576");
    expect(result.col).toBe(columnLetterToIndex("XFD"));
    expect(result.row).toBe(1048576);
    expect(result.colAbsolute).toBe(true);
    expect(result.rowAbsolute).toBe(true);
  });

  it("throws on invalid reference", () => {
    expect(() => parseCellRef("")).toThrow("Invalid cell reference");
    expect(() => parseCellRef("A")).toThrow("Invalid cell reference");
    expect(() => parseCellRef("1")).toThrow("Invalid cell reference");
    expect(() => parseCellRef("1A")).toThrow("Invalid cell reference");
    expect(() => parseCellRef("A1:B2")).toThrow("Invalid cell reference");
  });
});

describe("parseRange", () => {
  it("parses single cell as range", () => {
    const result = parseRange("A1");
    expect(result.start).toEqual(parseCellRef("A1"));
    expect(result.end).toEqual(parseCellRef("A1"));
    expect(result.sheetName).toBeUndefined();
  });

  it("parses simple range (A1:B2)", () => {
    const result = parseRange("A1:B2");
    expect(result.start).toEqual(parseCellRef("A1"));
    expect(result.end).toEqual(parseCellRef("B2"));
    expect(result.sheetName).toBeUndefined();
  });

  it("parses absolute range ($A$1:$B$2)", () => {
    const result = parseRange("$A$1:$B$2");
    expect(result.start).toEqual(parseCellRef("$A$1"));
    expect(result.end).toEqual(parseCellRef("$B$2"));
  });

  it("parses sheet-qualified range (Sheet1!A1:B2)", () => {
    const result = parseRange("Sheet1!A1:B2");
    expect(result.start).toEqual(parseCellRef("A1"));
    expect(result.end).toEqual(parseCellRef("B2"));
    expect(result.sheetName).toBe("Sheet1");
  });

  it("parses sheet-qualified single cell (Sheet1!A1)", () => {
    const result = parseRange("Sheet1!A1");
    expect(result.start).toEqual(parseCellRef("A1"));
    expect(result.end).toEqual(parseCellRef("A1"));
    expect(result.sheetName).toBe("Sheet1");
  });

  it("parses quoted sheet name ('Sheet Name'!A1:B2)", () => {
    const result = parseRange("'Sheet Name'!A1:B2");
    expect(result.start).toEqual(parseCellRef("A1"));
    expect(result.end).toEqual(parseCellRef("B2"));
    expect(result.sheetName).toBe("Sheet Name");
  });

  it("parses quoted sheet name with special characters", () => {
    const result = parseRange("'My Sheet!'!$A$1:$B$2");
    expect(result.start).toEqual(parseCellRef("$A$1"));
    expect(result.end).toEqual(parseCellRef("$B$2"));
    expect(result.sheetName).toBe("My Sheet!");
  });

  it("throws on invalid range", () => {
    expect(() => parseRange("")).toThrow("Invalid range reference");
    expect(() => parseRange("A")).toThrow("Invalid range reference");
    expect(() => parseRange("Sheet1!")).toThrow("Invalid range reference");
  });
});

describe("formatCellRef", () => {
  it("formats simple cell reference", () => {
    const addr: CellAddress = {
      col: colIdx(1),
      row: rowIdx(1),
      colAbsolute: false,
      rowAbsolute: false,
    };
    expect(formatCellRef(addr)).toBe("A1");
  });

  it("formats fully absolute reference", () => {
    const addr: CellAddress = {
      col: colIdx(1),
      row: rowIdx(1),
      colAbsolute: true,
      rowAbsolute: true,
    };
    expect(formatCellRef(addr)).toBe("$A$1");
  });

  it("formats column-absolute reference", () => {
    const addr: CellAddress = {
      col: colIdx(1),
      row: rowIdx(1),
      colAbsolute: true,
      rowAbsolute: false,
    };
    expect(formatCellRef(addr)).toBe("$A1");
  });

  it("formats row-absolute reference", () => {
    const addr: CellAddress = {
      col: colIdx(1),
      row: rowIdx(1),
      colAbsolute: false,
      rowAbsolute: true,
    };
    expect(formatCellRef(addr)).toBe("A$1");
  });

  it("formats multi-character column", () => {
    const addr: CellAddress = {
      col: colIdx(27),
      row: rowIdx(100),
      colAbsolute: false,
      rowAbsolute: false,
    };
    expect(formatCellRef(addr)).toBe("AA100");
  });
});

describe("formatRange", () => {
  it("formats simple range", () => {
    const range: CellRange = {
      start: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
      end: { col: colIdx(2), row: rowIdx(2), colAbsolute: false, rowAbsolute: false },
    };
    expect(formatRange(range)).toBe("A1:B2");
  });

  it("formats single cell as single ref (not A1:A1)", () => {
    const range: CellRange = {
      start: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
      end: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
    };
    expect(formatRange(range)).toBe("A1");
  });

  it("formats sheet-qualified range without spaces", () => {
    const range: CellRange = {
      start: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
      end: { col: colIdx(2), row: rowIdx(2), colAbsolute: false, rowAbsolute: false },
      sheetName: "Sheet1",
    };
    expect(formatRange(range)).toBe("Sheet1!A1:B2");
  });

  it("formats sheet-qualified range with spaces (quoted)", () => {
    const range: CellRange = {
      start: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
      end: { col: colIdx(2), row: rowIdx(2), colAbsolute: false, rowAbsolute: false },
      sheetName: "My Sheet",
    };
    expect(formatRange(range)).toBe("'My Sheet'!A1:B2");
  });

  it("formats sheet name with special characters (quoted)", () => {
    const range: CellRange = {
      start: { col: colIdx(1), row: rowIdx(1), colAbsolute: true, rowAbsolute: true },
      end: { col: colIdx(2), row: rowIdx(2), colAbsolute: true, rowAbsolute: true },
      sheetName: "Sheet!Name",
    };
    expect(formatRange(range)).toBe("'Sheet!Name'!$A$1:$B$2");
  });
});

describe("round-trip: parse -> format -> parse", () => {
  const testCases = [
    "A1",
    "$A$1",
    "$A1",
    "A$1",
    "AA100",
    "$XFD$1048576",
    "A1:B2",
    "$A$1:$B$2",
    "Sheet1!A1",
    "Sheet1!A1:B2",
    "'Sheet Name'!A1:B2",
    "'My Sheet!'!$A$1:$B$2",
  ];

  for (const original of testCases) {
    it(`round-trips "${original}"`, () => {
      const parsed = parseRange(original);
      const formatted = formatRange(parsed);
      const reparsed = parseRange(formatted);

      expect(reparsed.start).toEqual(parsed.start);
      expect(reparsed.end).toEqual(parsed.end);
      expect(reparsed.sheetName).toEqual(parsed.sheetName);
    });
  }
});

describe("expandRange", () => {
  it("expands single cell to array of one", () => {
    const range = parseRange("A1");
    const expanded = expandRange(range);
    expect(expanded).toHaveLength(1);
    expect(expanded[0]).toEqual({
      col: colIdx(1),
      row: rowIdx(1),
      colAbsolute: false,
      rowAbsolute: false,
    });
  });

  it("expands 2x2 range correctly", () => {
    const range = parseRange("A1:B2");
    const expanded = expandRange(range);
    expect(expanded).toHaveLength(4);
    // Row 1: A1, B1
    expect(expanded[0]).toEqual({ col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false });
    expect(expanded[1]).toEqual({ col: colIdx(2), row: rowIdx(1), colAbsolute: false, rowAbsolute: false });
    // Row 2: A2, B2
    expect(expanded[2]).toEqual({ col: colIdx(1), row: rowIdx(2), colAbsolute: false, rowAbsolute: false });
    expect(expanded[3]).toEqual({ col: colIdx(2), row: rowIdx(2), colAbsolute: false, rowAbsolute: false });
  });

  it("expands column range correctly", () => {
    const range = parseRange("A1:A3");
    const expanded = expandRange(range);
    expect(expanded).toHaveLength(3);
    expect(expanded.map((a) => `${indexToColumnLetter(a.col)}${a.row}`)).toEqual(["A1", "A2", "A3"]);
  });

  it("expands row range correctly", () => {
    const range = parseRange("A1:C1");
    const expanded = expandRange(range);
    expect(expanded).toHaveLength(3);
    expect(expanded.map((a) => `${indexToColumnLetter(a.col)}${a.row}`)).toEqual(["A1", "B1", "C1"]);
  });

  it("handles reverse range (B2:A1)", () => {
    // Even if start > end, we normalize
    const range: CellRange = {
      start: { col: colIdx(2), row: rowIdx(2), colAbsolute: false, rowAbsolute: false },
      end: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
    };
    const expanded = expandRange(range);
    expect(expanded).toHaveLength(4);
    // Should cover A1, B1, A2, B2
    const refs = expanded.map((a) => `${indexToColumnLetter(a.col)}${a.row}`);
    expect(refs).toContain("A1");
    expect(refs).toContain("B1");
    expect(refs).toContain("A2");
    expect(refs).toContain("B2");
  });

  it("inherits absolute flags from start cell", () => {
    const range = parseRange("$A$1:B2");
    const expanded = expandRange(range);
    for (const addr of expanded) {
      expect(addr.colAbsolute).toBe(true);
      expect(addr.rowAbsolute).toBe(true);
    }
  });
});
