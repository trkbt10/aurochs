/**
 * @file Formula reference insertion tests
 */

import { colIdx, rowIdx } from "@aurochs-office/xlsx/domain/types";
import type { CellAddress, CellRange } from "@aurochs-office/xlsx/domain/cell/address";
import { isReferenceInsertionPoint, buildReferenceText } from "./formula-reference-insert";

function addr(col: number, row: number): CellAddress {
  return { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false };
}

function range(params: { startCol: number; startRow: number; endCol: number; endRow: number }): CellRange {
  return { start: addr(params.startCol, params.startRow), end: addr(params.endCol, params.endRow) };
}

describe("formula-edit/formula-reference-insert", () => {
  describe("isReferenceInsertionPoint", () => {
    it("returns true after =", () => {
      expect(isReferenceInsertionPoint("=", 1)).toBe(true);
    });

    it("returns true after ( in function call", () => {
      expect(isReferenceInsertionPoint("=SUM(", 5)).toBe(true);
    });

    it("returns true after comma", () => {
      expect(isReferenceInsertionPoint("=SUM(A1,", 8)).toBe(true);
    });

    it("returns true after + operator", () => {
      expect(isReferenceInsertionPoint("=A1+", 4)).toBe(true);
    });

    it("returns true after - operator", () => {
      expect(isReferenceInsertionPoint("=A1-", 4)).toBe(true);
    });

    it("returns true after * operator", () => {
      expect(isReferenceInsertionPoint("=A1*", 4)).toBe(true);
    });

    it("returns true after / operator", () => {
      expect(isReferenceInsertionPoint("=A1/", 4)).toBe(true);
    });

    it("returns true after & concatenation", () => {
      expect(isReferenceInsertionPoint('=A1&', 4)).toBe(true);
    });

    it("returns true after > comparison", () => {
      expect(isReferenceInsertionPoint("=A1>", 4)).toBe(true);
    });

    it("returns true after < comparison", () => {
      expect(isReferenceInsertionPoint("=A1<", 4)).toBe(true);
    });

    it("returns true after = comparison (second = in >=)", () => {
      expect(isReferenceInsertionPoint("=A1=", 4)).toBe(true);
    });

    it("returns true after semicolon", () => {
      expect(isReferenceInsertionPoint("=A1;", 4)).toBe(true);
    });

    it("returns false after cell reference (letter)", () => {
      expect(isReferenceInsertionPoint("=A1", 3)).toBe(false);
    });

    it("returns false after closing paren", () => {
      expect(isReferenceInsertionPoint("=SUM(A1)", 8)).toBe(false);
    });

    it("returns false after number", () => {
      expect(isReferenceInsertionPoint("=10", 3)).toBe(false);
    });

    it("returns false at start (caretOffset = 0)", () => {
      expect(isReferenceInsertionPoint("=A1", 0)).toBe(false);
    });

    it("skips whitespace when checking", () => {
      expect(isReferenceInsertionPoint("=A1 + ", 6)).toBe(true);
    });
  });

  describe("buildReferenceText", () => {
    it("builds single cell reference on same sheet", () => {
      expect(buildReferenceText(range({ startCol: 1, startRow: 1, endCol: 1, endRow: 1 }), "Sheet1")).toBe("A1");
    });

    it("builds range reference on same sheet", () => {
      expect(buildReferenceText(range({ startCol: 1, startRow: 1, endCol: 2, endRow: 5 }), "Sheet1")).toBe("A1:B5");
    });

    it("builds cross-sheet single cell reference", () => {
      expect(buildReferenceText(range({ startCol: 3, startRow: 3, endCol: 3, endRow: 3 }), "Sheet1", "Sheet2")).toBe("Sheet2!C3");
    });

    it("builds cross-sheet range reference", () => {
      expect(buildReferenceText(range({ startCol: 1, startRow: 1, endCol: 2, endRow: 5 }), "Sheet1", "Sheet2")).toBe("Sheet2!A1:B5");
    });

    it("quotes sheet name with spaces", () => {
      expect(buildReferenceText(range({ startCol: 1, startRow: 1, endCol: 1, endRow: 1 }), "Sheet1", "My Sheet")).toBe("'My Sheet'!A1");
    });

    it("escapes single quotes in sheet name", () => {
      expect(buildReferenceText(range({ startCol: 1, startRow: 1, endCol: 1, endRow: 1 }), "Sheet1", "Bob's")).toBe("'Bob''s'!A1");
    });

    it("does not add prefix when target is same sheet", () => {
      expect(buildReferenceText(range({ startCol: 1, startRow: 1, endCol: 1, endRow: 1 }), "Sheet1", "Sheet1")).toBe("A1");
    });

    it("does not add prefix when target is undefined", () => {
      expect(buildReferenceText(range({ startCol: 1, startRow: 1, endCol: 1, endRow: 1 }), "Sheet1", undefined)).toBe("A1");
    });
  });
});
