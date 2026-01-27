/**
 * @file A1 range utilities tests
 */

import {
  columnLetterToIndex,
  indexToColumnLetter,
  parseCellRef,
  formatCellRef,
  parseRange,
  formatRange,
  isColumnRange,
  isRowRange,
  updateRangeForItemCount,
  expandRangeForItems,
  createRange,
  getRangeCellCount,
} from "./a1-range";

describe("columnLetterToIndex", () => {
  it("converts single letters", () => {
    expect(columnLetterToIndex("A")).toBe(1);
    expect(columnLetterToIndex("B")).toBe(2);
    expect(columnLetterToIndex("Z")).toBe(26);
  });

  it("converts double letters", () => {
    expect(columnLetterToIndex("AA")).toBe(27);
    expect(columnLetterToIndex("AB")).toBe(28);
    expect(columnLetterToIndex("AZ")).toBe(52);
    expect(columnLetterToIndex("BA")).toBe(53);
  });

  it("handles lowercase", () => {
    expect(columnLetterToIndex("a")).toBe(1);
    expect(columnLetterToIndex("aa")).toBe(27);
  });
});

describe("indexToColumnLetter", () => {
  it("converts single letters", () => {
    expect(indexToColumnLetter(1)).toBe("A");
    expect(indexToColumnLetter(2)).toBe("B");
    expect(indexToColumnLetter(26)).toBe("Z");
  });

  it("converts double letters", () => {
    expect(indexToColumnLetter(27)).toBe("AA");
    expect(indexToColumnLetter(28)).toBe("AB");
    expect(indexToColumnLetter(52)).toBe("AZ");
    expect(indexToColumnLetter(53)).toBe("BA");
  });
});

describe("parseCellRef", () => {
  it("parses absolute reference", () => {
    const result = parseCellRef("$A$1");
    expect(result).toEqual({
      col: "A",
      row: 1,
      colAbsolute: true,
      rowAbsolute: true,
    });
  });

  it("parses relative reference", () => {
    const result = parseCellRef("B2");
    expect(result).toEqual({
      col: "B",
      row: 2,
      colAbsolute: false,
      rowAbsolute: false,
    });
  });

  it("parses mixed reference", () => {
    const result = parseCellRef("$C1");
    expect(result).toEqual({
      col: "C",
      row: 1,
      colAbsolute: true,
      rowAbsolute: false,
    });

    const result2 = parseCellRef("D$5");
    expect(result2).toEqual({
      col: "D",
      row: 5,
      colAbsolute: false,
      rowAbsolute: true,
    });
  });

  it("parses multi-letter columns", () => {
    const result = parseCellRef("$AA$100");
    expect(result).toEqual({
      col: "AA",
      row: 100,
      colAbsolute: true,
      rowAbsolute: true,
    });
  });

  it("returns undefined for invalid reference", () => {
    expect(parseCellRef("")).toBeUndefined();
    expect(parseCellRef("1A")).toBeUndefined();
    expect(parseCellRef("A")).toBeUndefined();
  });
});

describe("formatCellRef", () => {
  it("formats absolute reference", () => {
    expect(
      formatCellRef({ col: "A", row: 1, colAbsolute: true, rowAbsolute: true }),
    ).toBe("$A$1");
  });

  it("formats relative reference", () => {
    expect(
      formatCellRef({ col: "B", row: 2, colAbsolute: false, rowAbsolute: false }),
    ).toBe("B2");
  });

  it("formats mixed reference", () => {
    expect(
      formatCellRef({ col: "C", row: 3, colAbsolute: true, rowAbsolute: false }),
    ).toBe("$C3");
  });
});

describe("parseRange", () => {
  it("parses absolute range", () => {
    const result = parseRange("$A$2:$A$10");
    expect(result).toBeDefined();
    expect(result!.start.col).toBe("A");
    expect(result!.start.row).toBe(2);
    expect(result!.end.col).toBe("A");
    expect(result!.end.row).toBe(10);
  });

  it("parses relative range", () => {
    const result = parseRange("B1:D5");
    expect(result).toBeDefined();
    expect(result!.start.col).toBe("B");
    expect(result!.start.row).toBe(1);
    expect(result!.end.col).toBe("D");
    expect(result!.end.row).toBe(5);
  });

  it("returns undefined for invalid range", () => {
    expect(parseRange("A1")).toBeUndefined();
    expect(parseRange("")).toBeUndefined();
  });
});

describe("formatRange", () => {
  it("formats range", () => {
    const range = parseRange("$A$2:$A$10")!;
    expect(formatRange(range)).toBe("$A$2:$A$10");
  });
});

describe("isColumnRange", () => {
  it("returns true for column range", () => {
    const range = parseRange("$A$2:$A$10")!;
    expect(isColumnRange(range)).toBe(true);
  });

  it("returns false for row range", () => {
    const range = parseRange("$B$1:$D$1")!;
    expect(isColumnRange(range)).toBe(false);
  });
});

describe("isRowRange", () => {
  it("returns true for row range", () => {
    const range = parseRange("$B$1:$D$1")!;
    expect(isRowRange(range)).toBe(true);
  });

  it("returns false for column range", () => {
    const range = parseRange("$A$2:$A$10")!;
    expect(isRowRange(range)).toBe(false);
  });
});

describe("getRangeCellCount", () => {
  it("counts cells in column range", () => {
    const range = parseRange("$A$2:$A$10")!;
    expect(getRangeCellCount(range)).toBe(9);
  });

  it("counts cells in row range", () => {
    const range = parseRange("$B$1:$D$1")!;
    expect(getRangeCellCount(range)).toBe(3);
  });

  it("counts cells in rectangular range", () => {
    const range = parseRange("$A$1:$C$3")!;
    expect(getRangeCellCount(range)).toBe(9);
  });
});

describe("updateRangeForItemCount", () => {
  it("updates column range end row", () => {
    const range = parseRange("$A$2:$A$10")!;
    const updated = updateRangeForItemCount(range, 5);
    expect(updated.start.row).toBe(2);
    expect(updated.end.row).toBe(6);
  });

  it("updates row range end column", () => {
    const range = parseRange("$B$1:$D$1")!;
    const updated = updateRangeForItemCount(range, 5);
    expect(updated.start.col).toBe("B");
    expect(updated.end.col).toBe("F");
  });

  it("preserves absoluteness", () => {
    const range = parseRange("$A$2:$A$10")!;
    const updated = updateRangeForItemCount(range, 5);
    expect(updated.start.colAbsolute).toBe(true);
    expect(updated.start.rowAbsolute).toBe(true);
  });
});

describe("expandRangeForItems", () => {
  it("expands column range", () => {
    expect(expandRangeForItems("$A$2:$A$10", 5)).toBe("$A$2:$A$6");
  });

  it("expands row range", () => {
    expect(expandRangeForItems("$B$1:$D$1", 5)).toBe("$B$1:$F$1");
  });

  it("returns original on parse failure", () => {
    expect(expandRangeForItems("invalid", 5)).toBe("invalid");
  });
});

describe("createRange", () => {
  it("creates column range", () => {
    const range = createRange("A", 2, 5, "column");
    expect(range.start.col).toBe("A");
    expect(range.start.row).toBe(2);
    expect(range.end.col).toBe("A");
    expect(range.end.row).toBe(6);
  });

  it("creates row range", () => {
    const range = createRange("B", 1, 5, "row");
    expect(range.start.col).toBe("B");
    expect(range.start.row).toBe(1);
    expect(range.end.col).toBe("F");
    expect(range.end.row).toBe(1);
  });

  it("uses absolute references by default", () => {
    const range = createRange("A", 1, 3, "column");
    expect(range.start.colAbsolute).toBe(true);
    expect(range.start.rowAbsolute).toBe(true);
  });

  it("supports relative references", () => {
    const range = createRange("A", 1, 3, "column", false);
    expect(range.start.colAbsolute).toBe(false);
    expect(range.start.rowAbsolute).toBe(false);
  });
});
