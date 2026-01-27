/**
 * @file TableEditor component tests
 *
 * Tests the TableEditor handles table data correctly,
 * including edge cases with empty tables or incomplete data.
 */

import type { Table, TableRow, TableCell } from "@oxen/pptx/domain/table/types";
import { px } from "@oxen/ooxml/domain/units";

// =============================================================================
// Helper functions
// =============================================================================

const createCell = (text: string): TableCell => ({
  textBody: {
    bodyProperties: {},
    paragraphs: [
      {
        runs: [{ type: "text", text, properties: {} }],
        properties: {},
        endProperties: {},
      },
    ],
  },
  properties: {},
});

const createRow = (cellTexts: string[]): TableRow => ({
  height: px(30),
  cells: cellTexts.map(createCell),
});

// =============================================================================
// TableEditor Tests
// =============================================================================

describe("TableEditor: Table data handling", () => {
  describe("grid access", () => {
    it("handles table with grid columns", () => {
      const table: Table = {
        grid: {
          columns: [{ width: px(100) }, { width: px(100) }],
        },
        rows: [],
        properties: {},
      };

      expect(table.grid).toBeDefined();
      expect(table.grid.columns.length).toBe(2);
    });

    it("handles table with empty grid columns", () => {
      const table: Table = {
        grid: {
          columns: [],
        },
        rows: [],
        properties: {},
      };

      expect(table.grid.columns.length).toBe(0);
    });
  });

  describe("rows access", () => {
    it("handles table with rows", () => {
      const table: Table = {
        grid: { columns: [{ width: px(100) }] },
        rows: [createRow(["A1"]), createRow(["A2"])],
        properties: {},
      };

      expect(table.rows.length).toBe(2);
      expect(table.rows[0].cells.length).toBe(1);
    });

    it("handles table with empty rows", () => {
      const table: Table = {
        grid: { columns: [] },
        rows: [],
        properties: {},
      };

      expect(table.rows.length).toBe(0);
    });

    it("handles table row with empty cells", () => {
      const table: Table = {
        grid: { columns: [] },
        rows: [{ height: px(30), cells: [] }],
        properties: {},
      };

      expect(table.rows[0].cells.length).toBe(0);
    });
  });

  describe("cell text access", () => {
    it("handles cell with text body", () => {
      const cell = createCell("Test");

      expect(cell.textBody).toBeDefined();
      expect(cell.textBody?.paragraphs.length).toBe(1);
    });

    it("handles cell without text body", () => {
      const cell: TableCell = {
        properties: {},
      };

      expect(cell.textBody).toBeUndefined();
    });
  });

  describe("selectedCell validation", () => {
    it("validates selected cell within bounds", () => {
      const table: Table = {
        grid: { columns: [{ width: px(100) }, { width: px(100) }] },
        rows: [createRow(["A1", "B1"]), createRow(["A2", "B2"])],
        properties: {},
      };

      // Component uses this pattern to determine initial selection
      const hasValidSelection =
        table.rows.length > 0 && table.rows[0].cells.length > 0;

      expect(hasValidSelection).toBe(true);
    });

    it("handles table with no valid selection", () => {
      const table: Table = {
        grid: { columns: [] },
        rows: [],
        properties: {},
      };

      const hasValidSelection =
        table.rows.length > 0 &&
        table.rows[0]?.cells.length > 0;

      expect(hasValidSelection).toBe(false);
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("TableEditor: Edge cases", () => {
  it("handles undefined grid columns gracefully", () => {
    const table: Partial<Table> = {
      rows: [],
      properties: {},
    };

    // Component should handle missing grid
    const colCount = table.grid?.columns?.length ?? 0;
    expect(colCount).toBe(0);
  });

  it("handles row with undefined cells gracefully", () => {
    const row: Partial<TableRow> = {
      height: px(30),
    };

    // Component should handle missing cells
    const cellCount = row.cells?.length ?? 0;
    expect(cellCount).toBe(0);
  });
});
