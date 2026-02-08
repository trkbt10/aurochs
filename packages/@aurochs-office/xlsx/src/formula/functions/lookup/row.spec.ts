/**
 * @file Unit tests for ROW function.
 */

import type { FormulaAstNode } from "../../ast";
import { colIdx, rowIdx } from "../../../domain/types";
import { invokeLazyFormulaFunction } from "../testHelpers";
import { rowFunction } from "./row";

function createReferenceNode(row: number, col: number): FormulaAstNode {
  return {
    type: "Reference",
    reference: { row: rowIdx(row), col: colIdx(col), rowAbsolute: false, colAbsolute: false },
  };
}

function createRangeNode(params: {
  readonly startRow: number;
  readonly startCol: number;
  readonly endRow: number;
  readonly endCol: number;
}): FormulaAstNode {
  const { startRow, startCol, endRow, endCol } = params;
  return {
    type: "Range",
    range: {
      start: { row: rowIdx(startRow), col: colIdx(startCol), rowAbsolute: false, colAbsolute: false },
      end: { row: rowIdx(endRow), col: colIdx(endCol), rowAbsolute: false, colAbsolute: false },
    },
  };
}

describe("ROW", () => {
  it("returns origin row when omitted", () => {
    const result = invokeLazyFormulaFunction(rowFunction, [], {
      origin: { sheetName: "Test Sheet", address: { row: rowIdx(7), col: colIdx(2), rowAbsolute: false, colAbsolute: false } },
    });
    expect(result).toBe(7);
  });

  it("returns row for a single-cell reference", () => {
    expect(invokeLazyFormulaFunction(rowFunction, [createReferenceNode(10, 1)])).toBe(10);
  });

  it("returns top row for a range", () => {
    expect(invokeLazyFormulaFunction(rowFunction, [createRangeNode({ startRow: 3, startCol: 2, endRow: 4, endCol: 3 })])).toBe(3);
  });
});
