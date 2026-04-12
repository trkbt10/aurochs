/**
 * @file Tests for autoFilter evaluation engine.
 */

import {
  evaluateFilter,
  evaluateAutoFilter,
} from "./auto-filter-evaluator";
import type { CellValue } from "./cell/types";
import type { CellRange, CellAddress } from "./cell/address";
import type { XlsxWorksheet, XlsxRow } from "./workbook";
import type {
  XlsxAutoFilter,
  XlsxFilters,
  XlsxCustomFilters,
  XlsxTop10Filter,
  XlsxDynamicFilter,
} from "./auto-filter";
import { colIdx, rowIdx, sheetId } from "./types";

// =============================================================================
// Helpers
// =============================================================================

function addr(col: number, row: number): CellAddress {
  return { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false };
}

function makeRange(range: { sc: number; sr: number; ec: number; er: number }): CellRange {
  return { start: addr(range.sc, range.sr), end: addr(range.ec, range.er) };
}

function makeRow(rowNumber: number, cells: readonly { col: number; value: CellValue }[]): XlsxRow {
  return {
    rowNumber: rowIdx(rowNumber),
    cells: cells.map((c) => ({
      address: addr(c.col, rowNumber),
      value: c.value,
    })),
  };
}

function makeWorksheet(rows: readonly XlsxRow[], autoFilter?: XlsxAutoFilter): XlsxWorksheet {
  return {
    name: "Sheet1",
    sheetId: sheetId(1),
    state: "visible",
    rows,
    xmlPath: "xl/worksheets/sheet1.xml",
    dateSystem: "1900",
    autoFilter,
  };
}

function str(v: string): CellValue {
  return { type: "string", value: v };
}
function num(v: number): CellValue {
  return { type: "number", value: v };
}
function bool(v: boolean): CellValue {
  return { type: "boolean", value: v };
}
function empty(): CellValue {
  return { type: "empty" };
}

// =============================================================================
// evaluateFilter: filters (value list)
// =============================================================================

describe("evaluateFilter", () => {
  describe("filters (value list)", () => {
    it("should match a single value", () => {
      const filter: XlsxFilters = { type: "filters", values: [{ val: "進行中" }] };
      expect(evaluateFilter(filter, str("進行中"))).toBe(true);
      expect(evaluateFilter(filter, str("完了"))).toBe(false);
    });

    it("should match any of multiple values (OR semantics)", () => {
      const filter: XlsxFilters = {
        type: "filters",
        values: [{ val: "進行中" }, { val: "完了" }],
      };
      expect(evaluateFilter(filter, str("進行中"))).toBe(true);
      expect(evaluateFilter(filter, str("完了"))).toBe(true);
      expect(evaluateFilter(filter, str("未着手"))).toBe(false);
    });

    it("should match blank cells when blank=true", () => {
      const filter: XlsxFilters = { type: "filters", blank: true, values: [{ val: "A" }] };
      expect(evaluateFilter(filter, empty())).toBe(true);
      expect(evaluateFilter(filter, str("A"))).toBe(true);
      expect(evaluateFilter(filter, str("B"))).toBe(false);
    });

    it("should not match blank cells when blank is not set", () => {
      const filter: XlsxFilters = { type: "filters", values: [{ val: "A" }] };
      expect(evaluateFilter(filter, empty())).toBe(false);
    });

    it("should match number values by string comparison", () => {
      // ECMA-376: filter val is always string; number cells are compared as their string representation
      const filter: XlsxFilters = { type: "filters", values: [{ val: "100" }] };
      expect(evaluateFilter(filter, num(100))).toBe(true);
      expect(evaluateFilter(filter, num(200))).toBe(false);
    });

    it("should match boolean values by string representation", () => {
      const filter: XlsxFilters = { type: "filters", values: [{ val: "TRUE" }] };
      expect(evaluateFilter(filter, bool(true))).toBe(true);
      expect(evaluateFilter(filter, bool(false))).toBe(false);
    });

    it("should handle filters with no values and blank=true (blank only)", () => {
      const filter: XlsxFilters = { type: "filters", blank: true };
      expect(evaluateFilter(filter, empty())).toBe(true);
      expect(evaluateFilter(filter, str("A"))).toBe(false);
    });

    it("should handle filters with no values and blank not set (nothing matches)", () => {
      const filter: XlsxFilters = { type: "filters" };
      expect(evaluateFilter(filter, empty())).toBe(false);
      expect(evaluateFilter(filter, str("A"))).toBe(false);
    });
  });

  // ===========================================================================
  // evaluateFilter: customFilters (operator-based)
  // ===========================================================================

  describe("customFilters (operator-based)", () => {
    it("should evaluate equal operator", () => {
      const filter: XlsxCustomFilters = {
        type: "customFilters",
        conditions: [{ operator: "equal", val: "100" }],
      };
      expect(evaluateFilter(filter, num(100))).toBe(true);
      expect(evaluateFilter(filter, num(200))).toBe(false);
    });

    it("should evaluate notEqual operator", () => {
      const filter: XlsxCustomFilters = {
        type: "customFilters",
        conditions: [{ operator: "notEqual", val: "100" }],
      };
      expect(evaluateFilter(filter, num(100))).toBe(false);
      expect(evaluateFilter(filter, num(200))).toBe(true);
    });

    it("should evaluate lessThan operator with numbers", () => {
      const filter: XlsxCustomFilters = {
        type: "customFilters",
        conditions: [{ operator: "lessThan", val: "50" }],
      };
      expect(evaluateFilter(filter, num(30))).toBe(true);
      expect(evaluateFilter(filter, num(50))).toBe(false);
      expect(evaluateFilter(filter, num(70))).toBe(false);
    });

    it("should evaluate lessThanOrEqual operator", () => {
      const filter: XlsxCustomFilters = {
        type: "customFilters",
        conditions: [{ operator: "lessThanOrEqual", val: "50" }],
      };
      expect(evaluateFilter(filter, num(50))).toBe(true);
      expect(evaluateFilter(filter, num(51))).toBe(false);
    });

    it("should evaluate greaterThan operator", () => {
      const filter: XlsxCustomFilters = {
        type: "customFilters",
        conditions: [{ operator: "greaterThan", val: "50" }],
      };
      expect(evaluateFilter(filter, num(51))).toBe(true);
      expect(evaluateFilter(filter, num(50))).toBe(false);
    });

    it("should evaluate greaterThanOrEqual operator", () => {
      const filter: XlsxCustomFilters = {
        type: "customFilters",
        conditions: [{ operator: "greaterThanOrEqual", val: "50" }],
      };
      expect(evaluateFilter(filter, num(50))).toBe(true);
      expect(evaluateFilter(filter, num(49))).toBe(false);
    });

    it("should default to equal when operator is omitted", () => {
      const filter: XlsxCustomFilters = {
        type: "customFilters",
        conditions: [{ val: "hello" }],
      };
      expect(evaluateFilter(filter, str("hello"))).toBe(true);
      expect(evaluateFilter(filter, str("world"))).toBe(false);
    });

    it("should evaluate two conditions with OR (default)", () => {
      const filter: XlsxCustomFilters = {
        type: "customFilters",
        conditions: [
          { operator: "greaterThan", val: "80" },
          { operator: "lessThan", val: "20" },
        ],
      };
      expect(evaluateFilter(filter, num(90))).toBe(true);
      expect(evaluateFilter(filter, num(10))).toBe(true);
      expect(evaluateFilter(filter, num(50))).toBe(false);
    });

    it("should evaluate two conditions with AND", () => {
      const filter: XlsxCustomFilters = {
        type: "customFilters",
        and: true,
        conditions: [
          { operator: "greaterThanOrEqual", val: "20" },
          { operator: "lessThanOrEqual", val: "80" },
        ],
      };
      expect(evaluateFilter(filter, num(50))).toBe(true);
      expect(evaluateFilter(filter, num(20))).toBe(true);
      expect(evaluateFilter(filter, num(80))).toBe(true);
      expect(evaluateFilter(filter, num(10))).toBe(false);
      expect(evaluateFilter(filter, num(90))).toBe(false);
    });

    it("should compare strings lexicographically for non-numeric values", () => {
      const filter: XlsxCustomFilters = {
        type: "customFilters",
        conditions: [{ operator: "greaterThan", val: "B" }],
      };
      expect(evaluateFilter(filter, str("C"))).toBe(true);
      expect(evaluateFilter(filter, str("A"))).toBe(false);
    });

    it("should not match empty cells", () => {
      const filter: XlsxCustomFilters = {
        type: "customFilters",
        conditions: [{ operator: "equal", val: "100" }],
      };
      expect(evaluateFilter(filter, empty())).toBe(false);
    });

    it("should support wildcard * for equal operator (contains)", () => {
      const filter: XlsxCustomFilters = {
        type: "customFilters",
        conditions: [{ operator: "equal", val: "*進行*" }],
      };
      expect(evaluateFilter(filter, str("進行中"))).toBe(true);
      expect(evaluateFilter(filter, str("進行中 随時"))).toBe(true);
      expect(evaluateFilter(filter, str("完了"))).toBe(false);
    });

    it("should support wildcard ? for equal operator (single char)", () => {
      const filter: XlsxCustomFilters = {
        type: "customFilters",
        conditions: [{ operator: "equal", val: "A?" }],
      };
      expect(evaluateFilter(filter, str("AB"))).toBe(true);
      expect(evaluateFilter(filter, str("AC"))).toBe(true);
      expect(evaluateFilter(filter, str("ABC"))).toBe(false);
      expect(evaluateFilter(filter, str("A"))).toBe(false);
    });

    it("should support escaped wildcards with ~", () => {
      const filter: XlsxCustomFilters = {
        type: "customFilters",
        conditions: [{ operator: "equal", val: "~*star" }],
      };
      expect(evaluateFilter(filter, str("*star"))).toBe(true);
      expect(evaluateFilter(filter, str("Xstar"))).toBe(false);
    });
  });

  // ===========================================================================
  // evaluateFilter: top10
  // ===========================================================================

  describe("top10", () => {
    // top10 is evaluated at the autoFilter level, not per-cell.
    // evaluateFilter for top10 requires the threshold to be pre-computed in filterVal.
    // When top=true (default), cells with value >= filterVal pass.
    // When top=false, cells with value <= filterVal pass.

    it("should match values at or above filterVal when top=true", () => {
      const filter: XlsxTop10Filter = {
        type: "top10",
        top: true,
        val: 3,
        filterVal: 80,
      };
      expect(evaluateFilter(filter, num(100))).toBe(true);
      expect(evaluateFilter(filter, num(80))).toBe(true);
      expect(evaluateFilter(filter, num(79))).toBe(false);
    });

    it("should match values at or below filterVal when top=false (bottom)", () => {
      const filter: XlsxTop10Filter = {
        type: "top10",
        top: false,
        val: 3,
        filterVal: 20,
      };
      expect(evaluateFilter(filter, num(10))).toBe(true);
      expect(evaluateFilter(filter, num(20))).toBe(true);
      expect(evaluateFilter(filter, num(21))).toBe(false);
    });

    it("should not match non-numeric cells", () => {
      const filter: XlsxTop10Filter = {
        type: "top10",
        top: true,
        val: 3,
        filterVal: 50,
      };
      expect(evaluateFilter(filter, str("hello"))).toBe(false);
      expect(evaluateFilter(filter, empty())).toBe(false);
    });
  });

  // ===========================================================================
  // evaluateFilter: dynamicFilter
  // ===========================================================================

  describe("dynamicFilter", () => {
    it("should match aboveAverage using pre-computed val", () => {
      // For aboveAverage, val holds the average. Cells strictly above pass.
      const filter: XlsxDynamicFilter = {
        type: "dynamicFilter",
        filterType: "aboveAverage",
        val: 50,
      };
      expect(evaluateFilter(filter, num(60))).toBe(true);
      expect(evaluateFilter(filter, num(50))).toBe(false);
      expect(evaluateFilter(filter, num(40))).toBe(false);
    });

    it("should match belowAverage using pre-computed val", () => {
      const filter: XlsxDynamicFilter = {
        type: "dynamicFilter",
        filterType: "belowAverage",
        val: 50,
      };
      expect(evaluateFilter(filter, num(40))).toBe(true);
      expect(evaluateFilter(filter, num(50))).toBe(false);
      expect(evaluateFilter(filter, num(60))).toBe(false);
    });

    it("should not match non-numeric cells for aboveAverage", () => {
      const filter: XlsxDynamicFilter = {
        type: "dynamicFilter",
        filterType: "aboveAverage",
        val: 50,
      };
      expect(evaluateFilter(filter, str("hello"))).toBe(false);
      expect(evaluateFilter(filter, empty())).toBe(false);
    });
  });
});

// =============================================================================
// evaluateAutoFilter
// =============================================================================

describe("evaluateAutoFilter", () => {
  it("should return empty set when no filterColumns", () => {
    const autoFilter: XlsxAutoFilter = { ref: makeRange({ sc: 1, sr: 1, ec: 3, er: 10 }) };
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("Header") }]),
      makeRow(2, [{ col: 1, value: str("A") }]),
      makeRow(3, [{ col: 1, value: str("B") }]),
    ], autoFilter);

    const hidden = evaluateAutoFilter(autoFilter, ws);
    expect(hidden.size).toBe(0);
  });

  it("should hide rows that do not match the filter", () => {
    const autoFilter: XlsxAutoFilter = {
      ref: makeRange({ sc: 1, sr: 1, ec: 2, er: 5 }),
      filterColumns: [
        {
          colId: colIdx(0), // column A (relative to ref start col 1)
          filter: { type: "filters", values: [{ val: "Yes" }] },
        },
      ],
    };
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("Status") }, { col: 2, value: str("Value") }]), // header
      makeRow(2, [{ col: 1, value: str("Yes") }, { col: 2, value: num(10) }]),
      makeRow(3, [{ col: 1, value: str("No") }, { col: 2, value: num(20) }]),
      makeRow(4, [{ col: 1, value: str("Yes") }, { col: 2, value: num(30) }]),
      makeRow(5, [{ col: 1, value: str("No") }, { col: 2, value: num(40) }]),
    ], autoFilter);

    const hidden = evaluateAutoFilter(autoFilter, ws);
    expect(hidden.has(1)).toBe(false); // header row never hidden
    expect(hidden.has(2)).toBe(false); // matches
    expect(hidden.has(3)).toBe(true);  // does not match
    expect(hidden.has(4)).toBe(false); // matches
    expect(hidden.has(5)).toBe(true);  // does not match
  });

  it("should apply multiple filterColumns with AND logic (all must match)", () => {
    const autoFilter: XlsxAutoFilter = {
      ref: makeRange({ sc: 1, sr: 1, ec: 3, er: 5 }),
      filterColumns: [
        {
          colId: colIdx(0), // col A
          filter: { type: "filters", values: [{ val: "Yes" }] },
        },
        {
          colId: colIdx(1), // col B
          filter: {
            type: "customFilters",
            conditions: [{ operator: "greaterThan", val: "20" }],
          },
        },
      ],
    };
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("Status") }, { col: 2, value: str("Score") }]),
      makeRow(2, [{ col: 1, value: str("Yes") }, { col: 2, value: num(30) }]), // both match
      makeRow(3, [{ col: 1, value: str("Yes") }, { col: 2, value: num(10) }]), // col A match, col B no
      makeRow(4, [{ col: 1, value: str("No") }, { col: 2, value: num(30) }]),  // col A no, col B match
      makeRow(5, [{ col: 1, value: str("No") }, { col: 2, value: num(10) }]),  // neither
    ], autoFilter);

    const hidden = evaluateAutoFilter(autoFilter, ws);
    expect(hidden.has(2)).toBe(false); // both match → visible
    expect(hidden.has(3)).toBe(true);
    expect(hidden.has(4)).toBe(true);
    expect(hidden.has(5)).toBe(true);
  });

  it("should not hide rows outside the autoFilter ref range", () => {
    const autoFilter: XlsxAutoFilter = {
      ref: makeRange({ sc: 1, sr: 1, ec: 1, er: 3 }), // only rows 1-3
      filterColumns: [
        {
          colId: colIdx(0),
          filter: { type: "filters", values: [{ val: "Yes" }] },
        },
      ],
    };
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("Header") }]),
      makeRow(2, [{ col: 1, value: str("No") }]),
      makeRow(3, [{ col: 1, value: str("No") }]),
      makeRow(4, [{ col: 1, value: str("No") }]), // outside range
    ], autoFilter);

    const hidden = evaluateAutoFilter(autoFilter, ws);
    expect(hidden.has(2)).toBe(true);
    expect(hidden.has(3)).toBe(true);
    expect(hidden.has(4)).toBe(false); // outside range, not affected
  });

  it("should never hide the header row (first row of ref)", () => {
    const autoFilter: XlsxAutoFilter = {
      ref: makeRange({ sc: 1, sr: 1, ec: 1, er: 3 }),
      filterColumns: [
        {
          colId: colIdx(0),
          filter: { type: "filters", values: [{ val: "impossible" }] },
        },
      ],
    };
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("Header") }]),
      makeRow(2, [{ col: 1, value: str("A") }]),
      makeRow(3, [{ col: 1, value: str("B") }]),
    ], autoFilter);

    const hidden = evaluateAutoFilter(autoFilter, ws);
    expect(hidden.has(1)).toBe(false); // header row
  });

  it("should handle empty rows (no cells) as empty values", () => {
    const autoFilter: XlsxAutoFilter = {
      ref: makeRange({ sc: 1, sr: 1, ec: 1, er: 4 }),
      filterColumns: [
        {
          colId: colIdx(0),
          filter: { type: "filters", blank: true },
        },
      ],
    };
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("Header") }]),
      makeRow(2, [{ col: 1, value: str("A") }]),
      // row 3 is missing entirely → treated as empty
      makeRow(4, [{ col: 1, value: empty() }]),
    ], autoFilter);

    const hidden = evaluateAutoFilter(autoFilter, ws);
    expect(hidden.has(2)).toBe(true);  // "A" does not match blank-only filter
    expect(hidden.has(3)).toBe(false); // missing row → empty → matches blank
    expect(hidden.has(4)).toBe(false); // explicit empty → matches blank
  });

  it("should handle autoFilter with ref starting at non-A1 position", () => {
    // autoFilter.ref = C3:D6, so colId=0 maps to column C (col=3), colId=1 to column D (col=4)
    const autoFilter: XlsxAutoFilter = {
      ref: makeRange({ sc: 3, sr: 3, ec: 4, er: 6 }),
      filterColumns: [
        {
          colId: colIdx(0), // relative → absolute col 3 (C)
          filter: { type: "filters", values: [{ val: "OK" }] },
        },
      ],
    };
    const ws = makeWorksheet([
      makeRow(3, [{ col: 3, value: str("Status") }, { col: 4, value: str("Data") }]), // header
      makeRow(4, [{ col: 3, value: str("OK") }, { col: 4, value: num(1) }]),
      makeRow(5, [{ col: 3, value: str("NG") }, { col: 4, value: num(2) }]),
      makeRow(6, [{ col: 3, value: str("OK") }, { col: 4, value: num(3) }]),
    ], autoFilter);

    const hidden = evaluateAutoFilter(autoFilter, ws);
    expect(hidden.has(3)).toBe(false); // header
    expect(hidden.has(4)).toBe(false); // matches
    expect(hidden.has(5)).toBe(true);  // doesn't match
    expect(hidden.has(6)).toBe(false); // matches
  });

  it("should skip filterColumns without a filter defined", () => {
    const autoFilter: XlsxAutoFilter = {
      ref: makeRange({ sc: 1, sr: 1, ec: 2, er: 3 }),
      filterColumns: [
        {
          colId: colIdx(0),
          // no filter → should not affect visibility
        },
        {
          colId: colIdx(1),
          filter: { type: "filters", values: [{ val: "X" }] },
        },
      ],
    };
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("A") }, { col: 2, value: str("B") }]),
      makeRow(2, [{ col: 1, value: str("any") }, { col: 2, value: str("X") }]),
      makeRow(3, [{ col: 1, value: str("any") }, { col: 2, value: str("Y") }]),
    ], autoFilter);

    const hidden = evaluateAutoFilter(autoFilter, ws);
    expect(hidden.has(2)).toBe(false);
    expect(hidden.has(3)).toBe(true);
  });
});
