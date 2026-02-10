/**
 * @file Formula range drag tests (pure logic)
 *
 * Tests the reference text expansion logic used in formula-mode range dragging.
 */

import { buildReferenceText } from "../../formula-edit/formula-reference-insert";
import { colIdx, rowIdx } from "@aurochs-office/xlsx/domain/types";
import type { CellAddress, CellRange } from "@aurochs-office/xlsx/domain/cell/address";

function addr(col: number, row: number): CellAddress {
  return { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false };
}

function range(startCol: number, startRow: number, endCol: number, endRow: number): CellRange {
  return { start: addr(startCol, startRow), end: addr(endCol, endRow) };
}

describe("formula-range-drag (reference expansion logic)", () => {
  it("expands single cell to range reference on same sheet", () => {
    // User clicked A1 then dragged to C3
    const refText = buildReferenceText(range(1, 1, 3, 3), "Sheet1", "Sheet1");
    expect(refText).toBe("A1:C3");
  });

  it("single cell reference stays as single cell when not dragged", () => {
    const refText = buildReferenceText(range(2, 2, 2, 2), "Sheet1", "Sheet1");
    expect(refText).toBe("B2");
  });

  it("cross-sheet reference expansion preserves sheet prefix", () => {
    const refText = buildReferenceText(range(1, 1, 3, 5), "Sheet1", "Sheet2");
    expect(refText).toBe("Sheet2!A1:C5");
  });

  it("replaces reference in editing text correctly", () => {
    // Simulate the text replacement logic used in startFormulaRangeDrag
    const editingText = "=SUM(A1)";
    const refInsertOffset = 5;
    const oldRefLength = 2; // "A1"

    const newRefText = buildReferenceText(range(1, 1, 3, 3), "Sheet1", "Sheet1");
    const before = editingText.slice(0, refInsertOffset);
    const after = editingText.slice(refInsertOffset + oldRefLength);
    const newText = before + newRefText + after;

    expect(newText).toBe("=SUM(A1:C3)");
  });

  it("handles cross-sheet replacement in editing text", () => {
    const editingText = "=A1";
    const refInsertOffset = 1;
    const oldRefLength = 2; // "A1"

    const newRefText = buildReferenceText(range(1, 1, 2, 5), "Sheet1", "Sheet2");
    const before = editingText.slice(0, refInsertOffset);
    const after = editingText.slice(refInsertOffset + oldRefLength);
    const newText = before + newRefText + after;

    expect(newText).toBe("=Sheet2!A1:B5");
  });
});
