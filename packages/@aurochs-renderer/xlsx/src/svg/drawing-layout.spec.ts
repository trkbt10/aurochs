/**
 * @file Drawing Layout Tests
 *
 * Tests for EMU to pixel conversion and drawing bounds calculation.
 */

import type {
  XlsxTwoCellAnchor,
  XlsxOneCellAnchor,
  XlsxAbsoluteAnchor,
} from "@aurochs-office/xlsx/domain/drawing/types";
import { colIdx, rowIdx } from "@aurochs-office/xlsx/domain/types";
import type { SheetLayout, XlsxRenderOptions } from "./types";
import { DEFAULT_XLSX_RENDER_OPTIONS } from "./types";
import { emuToPixels, calculateDrawingBounds } from "./drawing-layout";

describe("emuToPixels", () => {
  it("should convert EMU to pixels at 96 DPI", () => {
    // 914400 EMU = 1 inch = 96 pixels
    expect(emuToPixels(914400)).toBe(96);
  });

  it("should convert 0 EMU to 0 pixels", () => {
    expect(emuToPixels(0)).toBe(0);
  });

  it("should handle fractional EMU values", () => {
    // Half inch = 457200 EMU = 48 pixels
    expect(emuToPixels(457200)).toBe(48);
  });

  it("should support custom DPI", () => {
    // 914400 EMU = 1 inch = 72 pixels at 72 DPI
    expect(emuToPixels(914400, 72)).toBe(72);
  });
});

describe("calculateDrawingBounds", () => {
  // Create a minimal layout for testing
  const createTestLayout = (): SheetLayout => ({
    cells: new Map(),
    totalWidth: 1000,
    totalHeight: 800,
    columnPositions: [0, 100, 200, 300, 400, 500],
    rowPositions: [0, 50, 100, 150, 200, 250],
    columnWidths: [100, 100, 100, 100, 100, 100],
    rowHeights: [50, 50, 50, 50, 50, 50],
    columnCount: 6,
    rowCount: 6,
  });

  const options: XlsxRenderOptions = DEFAULT_XLSX_RENDER_OPTIONS;

  describe("twoCellAnchor", () => {
    it("should calculate bounds from cell positions", () => {
      const anchor: XlsxTwoCellAnchor = {
        type: "twoCellAnchor",
        from: { col: colIdx(1), colOff: 0, row: rowIdx(1), rowOff: 0 },
        to: { col: colIdx(3), colOff: 0, row: rowIdx(3), rowOff: 0 },
      };

      const bounds = calculateDrawingBounds(anchor, createTestLayout(), options);

      expect(bounds.x).toBe(100); // columnPositions[1]
      expect(bounds.y).toBe(50); // rowPositions[1]
      expect(bounds.width).toBe(200); // 300 - 100
      expect(bounds.height).toBe(100); // 150 - 50
    });

    it("should include EMU offsets in calculation", () => {
      // 457200 EMU = 0.5 inch = 48 pixels at 96 DPI
      const anchor: XlsxTwoCellAnchor = {
        type: "twoCellAnchor",
        from: { col: colIdx(0), colOff: 457200, row: rowIdx(0), rowOff: 457200 },
        to: { col: colIdx(2), colOff: 457200, row: rowIdx(2), rowOff: 457200 },
      };

      const bounds = calculateDrawingBounds(anchor, createTestLayout(), options);

      expect(bounds.x).toBe(48); // 0 + 48
      expect(bounds.y).toBe(48); // 0 + 48
      expect(bounds.width).toBe(200); // (200 + 48) - 48
      expect(bounds.height).toBe(100); // (100 + 48) - 48
    });

    it("should handle zero-size bounds", () => {
      const anchor: XlsxTwoCellAnchor = {
        type: "twoCellAnchor",
        from: { col: colIdx(1), colOff: 0, row: rowIdx(1), rowOff: 0 },
        to: { col: colIdx(1), colOff: 0, row: rowIdx(1), rowOff: 0 },
      };

      const bounds = calculateDrawingBounds(anchor, createTestLayout(), options);

      expect(bounds.width).toBe(0);
      expect(bounds.height).toBe(0);
    });
  });

  describe("oneCellAnchor", () => {
    it("should calculate bounds from cell position and extent", () => {
      // 914400 EMU = 96 pixels
      const anchor: XlsxOneCellAnchor = {
        type: "oneCellAnchor",
        from: { col: colIdx(2), colOff: 0, row: rowIdx(2), rowOff: 0 },
        ext: { cx: 914400, cy: 914400 },
      };

      const bounds = calculateDrawingBounds(anchor, createTestLayout(), options);

      expect(bounds.x).toBe(200); // columnPositions[2]
      expect(bounds.y).toBe(100); // rowPositions[2]
      expect(bounds.width).toBe(96); // 914400 EMU
      expect(bounds.height).toBe(96); // 914400 EMU
    });

    it("should include cell offset in position", () => {
      const anchor: XlsxOneCellAnchor = {
        type: "oneCellAnchor",
        from: { col: colIdx(0), colOff: 914400, row: rowIdx(0), rowOff: 914400 },
        ext: { cx: 914400, cy: 457200 },
      };

      const bounds = calculateDrawingBounds(anchor, createTestLayout(), options);

      expect(bounds.x).toBe(96); // 0 + 96
      expect(bounds.y).toBe(96); // 0 + 96
      expect(bounds.width).toBe(96);
      expect(bounds.height).toBe(48);
    });
  });

  describe("absoluteAnchor", () => {
    it("should calculate bounds from absolute position and extent", () => {
      const anchor: XlsxAbsoluteAnchor = {
        type: "absoluteAnchor",
        pos: { x: 914400, y: 457200 },
        ext: { cx: 1828800, cy: 914400 },
      };

      const bounds = calculateDrawingBounds(anchor, createTestLayout(), options);

      expect(bounds.x).toBe(96); // 914400 EMU
      expect(bounds.y).toBe(48); // 457200 EMU
      expect(bounds.width).toBe(192); // 1828800 EMU
      expect(bounds.height).toBe(96); // 914400 EMU
    });

    it("should handle zero position and size", () => {
      const anchor: XlsxAbsoluteAnchor = {
        type: "absoluteAnchor",
        pos: { x: 0, y: 0 },
        ext: { cx: 0, cy: 0 },
      };

      const bounds = calculateDrawingBounds(anchor, createTestLayout(), options);

      expect(bounds.x).toBe(0);
      expect(bounds.y).toBe(0);
      expect(bounds.width).toBe(0);
      expect(bounds.height).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("should handle out-of-bounds column index", () => {
      const anchor: XlsxTwoCellAnchor = {
        type: "twoCellAnchor",
        from: { col: colIdx(10), colOff: 0, row: rowIdx(0), rowOff: 0 },
        to: { col: colIdx(15), colOff: 0, row: rowIdx(1), rowOff: 0 },
      };

      const layout = createTestLayout();
      const bounds = calculateDrawingBounds(anchor, layout, options);

      // Out of bounds should use totalWidth
      expect(bounds.x).toBe(layout.totalWidth);
    });

    it("should handle out-of-bounds row index", () => {
      const anchor: XlsxTwoCellAnchor = {
        type: "twoCellAnchor",
        from: { col: colIdx(0), colOff: 0, row: rowIdx(10), rowOff: 0 },
        to: { col: colIdx(1), colOff: 0, row: rowIdx(15), rowOff: 0 },
      };

      const layout = createTestLayout();
      const bounds = calculateDrawingBounds(anchor, layout, options);

      // Out of bounds should use totalHeight
      expect(bounds.y).toBe(layout.totalHeight);
    });
  });
});
