/**
 * @file Tests for MergeCell type and utility functions
 */
import {
  createMergeCell,
  findMergeCell,
  getMergeSize,
  isMergeOrigin,
  type MergeCell,
} from "./merge-cell";
import { parseCellRef, parseRange } from "./cell/address";

describe("merge-cell", () => {
  // ==========================================================================
  // findMergeCell
  // ==========================================================================
  describe("findMergeCell", () => {
    const mergeCells: readonly MergeCell[] = [
      { range: parseRange("A1:B2") },
      { range: parseRange("D4:F6") },
    ];

    it("should find merge cell when cell is at origin", () => {
      const result = findMergeCell(parseCellRef("A1"), mergeCells);
      expect(result).toBeDefined();
      expect(result?.range.start.col).toBe(1);
      expect(result?.range.start.row).toBe(1);
    });

    it("should find merge cell when cell is inside range", () => {
      const result = findMergeCell(parseCellRef("B2"), mergeCells);
      expect(result).toBeDefined();
      expect(result?.range.start.col).toBe(1);
      expect(result?.range.start.row).toBe(1);
    });

    it("should find merge cell in second range", () => {
      const result = findMergeCell(parseCellRef("E5"), mergeCells);
      expect(result).toBeDefined();
      expect(result?.range.start.col).toBe(4); // D
      expect(result?.range.start.row).toBe(4);
    });

    it("should return undefined when cell is outside all ranges", () => {
      const result = findMergeCell(parseCellRef("C3"), mergeCells);
      expect(result).toBeUndefined();
    });

    it("should return undefined for empty merge cells array", () => {
      const result = findMergeCell(parseCellRef("A1"), []);
      expect(result).toBeUndefined();
    });

    it("should handle cell at edge of range", () => {
      // Test all corners of D4:F6
      expect(findMergeCell(parseCellRef("D4"), mergeCells)).toBeDefined();
      expect(findMergeCell(parseCellRef("F4"), mergeCells)).toBeDefined();
      expect(findMergeCell(parseCellRef("D6"), mergeCells)).toBeDefined();
      expect(findMergeCell(parseCellRef("F6"), mergeCells)).toBeDefined();
    });

    it("should handle cell just outside range", () => {
      // Just outside D4:F6
      expect(findMergeCell(parseCellRef("C4"), mergeCells)).toBeUndefined();
      expect(findMergeCell(parseCellRef("G4"), mergeCells)).toBeUndefined();
      expect(findMergeCell(parseCellRef("D3"), mergeCells)).toBeUndefined();
      expect(findMergeCell(parseCellRef("D7"), mergeCells)).toBeUndefined();
    });
  });

  // ==========================================================================
  // isMergeOrigin
  // ==========================================================================
  describe("isMergeOrigin", () => {
    const mergeCell: MergeCell = { range: parseRange("B2:D4") };

    it("should return true for origin cell (top-left)", () => {
      expect(isMergeOrigin(parseCellRef("B2"), mergeCell)).toBe(true);
    });

    it("should return false for non-origin cells inside range", () => {
      expect(isMergeOrigin(parseCellRef("C2"), mergeCell)).toBe(false);
      expect(isMergeOrigin(parseCellRef("B3"), mergeCell)).toBe(false);
      expect(isMergeOrigin(parseCellRef("C3"), mergeCell)).toBe(false);
      expect(isMergeOrigin(parseCellRef("D4"), mergeCell)).toBe(false);
    });

    it("should return false for cells outside range", () => {
      expect(isMergeOrigin(parseCellRef("A1"), mergeCell)).toBe(false);
      expect(isMergeOrigin(parseCellRef("E5"), mergeCell)).toBe(false);
    });

    it("should handle single-cell merge", () => {
      const singleCellMerge: MergeCell = { range: parseRange("C3") };
      expect(isMergeOrigin(parseCellRef("C3"), singleCellMerge)).toBe(true);
    });
  });

  // ==========================================================================
  // getMergeSize
  // ==========================================================================
  describe("getMergeSize", () => {
    it("should return correct size for multi-cell range", () => {
      const mergeCell: MergeCell = { range: parseRange("A1:C3") };
      const size = getMergeSize(mergeCell);
      expect(size.cols).toBe(3);
      expect(size.rows).toBe(3);
    });

    it("should return correct size for single-cell range", () => {
      const mergeCell: MergeCell = { range: parseRange("B2") };
      const size = getMergeSize(mergeCell);
      expect(size.cols).toBe(1);
      expect(size.rows).toBe(1);
    });

    it("should return correct size for horizontal merge", () => {
      const mergeCell: MergeCell = { range: parseRange("A1:D1") };
      const size = getMergeSize(mergeCell);
      expect(size.cols).toBe(4);
      expect(size.rows).toBe(1);
    });

    it("should return correct size for vertical merge", () => {
      const mergeCell: MergeCell = { range: parseRange("A1:A5") };
      const size = getMergeSize(mergeCell);
      expect(size.cols).toBe(1);
      expect(size.rows).toBe(5);
    });

    it("should handle large range", () => {
      const mergeCell: MergeCell = { range: parseRange("A1:Z100") };
      const size = getMergeSize(mergeCell);
      expect(size.cols).toBe(26);
      expect(size.rows).toBe(100);
    });
  });

  // ==========================================================================
  // createMergeCell
  // ==========================================================================
  describe("createMergeCell", () => {
    it("should create MergeCell from CellRange", () => {
      const range = parseRange("A1:B2");
      const mergeCell = createMergeCell(range);

      expect(mergeCell.range).toBe(range);
      expect(mergeCell.range.start.col).toBe(1);
      expect(mergeCell.range.start.row).toBe(1);
      expect(mergeCell.range.end.col).toBe(2);
      expect(mergeCell.range.end.row).toBe(2);
    });

    it("should preserve sheet name in range", () => {
      const range = parseRange("Sheet1!A1:B2");
      const mergeCell = createMergeCell(range);

      expect(mergeCell.range.sheetName).toBe("Sheet1");
    });

    it("should work with single-cell range", () => {
      const range = parseRange("C5");
      const mergeCell = createMergeCell(range);

      expect(mergeCell.range.start.col).toBe(3);
      expect(mergeCell.range.start.row).toBe(5);
      expect(mergeCell.range.end.col).toBe(3);
      expect(mergeCell.range.end.row).toBe(5);
    });
  });
});
