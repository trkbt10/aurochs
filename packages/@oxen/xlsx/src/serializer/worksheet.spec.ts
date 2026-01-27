/**
 * @file Worksheet Serializer Tests
 *
 * Tests for serializing worksheet elements to XML.
 */

import { serializeElement } from "@oxen/xml";
import type { XlsxWorksheet, XlsxRow, XlsxColumnDef } from "../domain/workbook";
import type { CellAddress, CellRange } from "../domain/cell/address";
import type { Cell } from "../domain/cell/types";
import { colIdx, rowIdx, styleId } from "../domain/types";
import type { SharedStringTable } from "./cell";
import {
  serializeWorksheet,
  serializeSheetData,
  serializeRow,
  serializeCols,
  serializeMergeCells,
  serializeDimension,
} from "./worksheet";

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create a simple cell address (relative, no absolute references)
 */
function addr(col: number, row: number): CellAddress {
  return {
    col: colIdx(col),
    row: rowIdx(row),
    colAbsolute: false,
    rowAbsolute: false,
  };
}

/**
 * Create a cell range
 */
function range(
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
): CellRange {
  return {
    start: addr(startCol, startRow),
    end: addr(endCol, endRow),
  };
}

/**
 * Create a simple number cell
 */
function numCell(col: number, row: number, value: number): Cell {
  return {
    address: addr(col, row),
    value: { type: "number", value },
  };
}

/**
 * Create a simple string cell
 */
function strCell(col: number, row: number, value: string): Cell {
  return {
    address: addr(col, row),
    value: { type: "string", value },
  };
}

/**
 * Create a row with cells
 */
function createRow(rowNumber: number, cells: Cell[]): XlsxRow {
  return {
    rowNumber: rowIdx(rowNumber),
    cells,
  };
}

/**
 * Mock SharedStringTable for testing
 */
function createMockSharedStrings(): SharedStringTable {
  const strings: string[] = [];
  const indexMap = new Map<string, number>();

  return {
    getIndex(value: string): number | undefined {
      return indexMap.get(value);
    },
    addString(value: string): number {
      const existing = indexMap.get(value);
      if (existing !== undefined) {
        return existing;
      }
      const index = strings.length;
      strings.push(value);
      indexMap.set(value, index);
      return index;
    },
  };
}

/**
 * Create a minimal worksheet
 */
function createWorksheet(
  rows: XlsxRow[],
  options?: {
    columns?: XlsxColumnDef[];
    mergeCells?: CellRange[];
  },
): XlsxWorksheet {
  return {
    dateSystem: "1900",
    name: "Sheet1",
    sheetId: 1,
    state: "visible",
    rows,
    columns: options?.columns,
    mergeCells: options?.mergeCells,
    xmlPath: "xl/worksheets/sheet1.xml",
  };
}

// =============================================================================
// serializeDimension Tests
// =============================================================================

describe("serializeDimension", () => {
  it("should return A1 for empty rows", () => {
    const element = serializeDimension([]);
    const xml = serializeElement(element);
    expect(xml).toBe('<dimension ref="A1"/>');
  });

  it("should return A1 for rows with no cells", () => {
    const rows: XlsxRow[] = [createRow(1, []), createRow(2, [])];
    const element = serializeDimension(rows);
    const xml = serializeElement(element);
    expect(xml).toBe('<dimension ref="A1"/>');
  });

  it("should calculate dimension for single cell", () => {
    const rows: XlsxRow[] = [createRow(1, [numCell(1, 1, 42)])];
    const element = serializeDimension(rows);
    const xml = serializeElement(element);
    expect(xml).toBe('<dimension ref="A1"/>');
  });

  it("should calculate dimension for multiple cells in one row", () => {
    const rows: XlsxRow[] = [
      createRow(1, [numCell(1, 1, 1), numCell(3, 1, 3)]),
    ];
    const element = serializeDimension(rows);
    const xml = serializeElement(element);
    expect(xml).toBe('<dimension ref="A1:C1"/>');
  });

  it("should calculate dimension for multiple rows", () => {
    const rows: XlsxRow[] = [
      createRow(1, [numCell(1, 1, 1)]),
      createRow(3, [numCell(2, 3, 2)]),
    ];
    const element = serializeDimension(rows);
    const xml = serializeElement(element);
    expect(xml).toBe('<dimension ref="A1:B3"/>');
  });

  it("should calculate dimension for sparse data", () => {
    const rows: XlsxRow[] = [
      createRow(2, [numCell(2, 2, 1)]),
      createRow(5, [numCell(4, 5, 2)]),
    ];
    const element = serializeDimension(rows);
    const xml = serializeElement(element);
    expect(xml).toBe('<dimension ref="B2:D5"/>');
  });
});

// =============================================================================
// serializeRow Tests
// =============================================================================

describe("serializeRow", () => {
  it("should serialize basic row with cells", () => {
    const sharedStrings = createMockSharedStrings();
    const row = createRow(1, [numCell(1, 1, 42)]);
    const element = serializeRow(row, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toBe('<row r="1"><c r="A1"><v>42</v></c></row>');
  });

  it("should serialize row with multiple cells", () => {
    const sharedStrings = createMockSharedStrings();
    const row = createRow(1, [numCell(1, 1, 1), numCell(2, 1, 2)]);
    const element = serializeRow(row, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toContain('r="1"');
    expect(xml).toContain('r="A1"');
    expect(xml).toContain('r="B1"');
  });

  it("should serialize row with height", () => {
    const sharedStrings = createMockSharedStrings();
    const row: XlsxRow = {
      rowNumber: rowIdx(1),
      cells: [numCell(1, 1, 42)],
      height: 20,
    };
    const element = serializeRow(row, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toContain('ht="20"');
  });

  it("should serialize row with customHeight", () => {
    const sharedStrings = createMockSharedStrings();
    const row: XlsxRow = {
      rowNumber: rowIdx(1),
      cells: [numCell(1, 1, 42)],
      height: 25.5,
      customHeight: true,
    };
    const element = serializeRow(row, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toContain('ht="25.5"');
    expect(xml).toContain('customHeight="1"');
  });

  it("should serialize hidden row", () => {
    const sharedStrings = createMockSharedStrings();
    const row: XlsxRow = {
      rowNumber: rowIdx(1),
      cells: [numCell(1, 1, 42)],
      hidden: true,
    };
    const element = serializeRow(row, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toContain('hidden="1"');
  });

  it("should serialize row with style", () => {
    const sharedStrings = createMockSharedStrings();
    const row: XlsxRow = {
      rowNumber: rowIdx(1),
      cells: [numCell(1, 1, 42)],
      styleId: styleId(5),
    };
    const element = serializeRow(row, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toContain('s="5"');
  });

  it("should omit style attribute when styleId is 0", () => {
    const sharedStrings = createMockSharedStrings();
    const row: XlsxRow = {
      rowNumber: rowIdx(1),
      cells: [numCell(1, 1, 42)],
      styleId: styleId(0),
    };
    const element = serializeRow(row, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).not.toContain('s="0"');
  });

  it("should serialize empty row (no cells)", () => {
    const sharedStrings = createMockSharedStrings();
    const row = createRow(1, []);
    const element = serializeRow(row, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toBe('<row r="1"/>');
  });
});

// =============================================================================
// serializeSheetData Tests
// =============================================================================

describe("serializeSheetData", () => {
  it("should serialize empty sheetData", () => {
    const sharedStrings = createMockSharedStrings();
    const element = serializeSheetData([], sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toBe("<sheetData/>");
  });

  it("should serialize single row", () => {
    const sharedStrings = createMockSharedStrings();
    const rows: XlsxRow[] = [createRow(1, [numCell(1, 1, 42)])];
    const element = serializeSheetData(rows, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toContain("<sheetData>");
    expect(xml).toContain("</sheetData>");
    expect(xml).toContain('<row r="1">');
  });

  it("should serialize multiple rows", () => {
    const sharedStrings = createMockSharedStrings();
    const rows: XlsxRow[] = [
      createRow(1, [numCell(1, 1, 1)]),
      createRow(2, [numCell(1, 2, 2)]),
    ];
    const element = serializeSheetData(rows, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toContain('<row r="1">');
    expect(xml).toContain('<row r="2">');
  });

  it("should skip rows with no cells", () => {
    const sharedStrings = createMockSharedStrings();
    const rows: XlsxRow[] = [
      createRow(1, [numCell(1, 1, 1)]),
      createRow(2, []), // empty row
      createRow(3, [numCell(1, 3, 3)]),
    ];
    const element = serializeSheetData(rows, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toContain('<row r="1">');
    expect(xml).not.toContain('r="2"');
    expect(xml).toContain('<row r="3">');
  });
});

// =============================================================================
// serializeCols Tests
// =============================================================================

describe("serializeCols", () => {
  it("should serialize single column", () => {
    const columns: XlsxColumnDef[] = [
      { min: colIdx(1), max: colIdx(1), width: 12 },
    ];
    const element = serializeCols(columns);
    const xml = serializeElement(element);
    expect(xml).toBe(
      '<cols><col min="1" max="1" width="12" customWidth="1"/></cols>',
    );
  });

  it("should serialize multiple columns", () => {
    const columns: XlsxColumnDef[] = [
      { min: colIdx(1), max: colIdx(1), width: 10 },
      { min: colIdx(2), max: colIdx(2), width: 15 },
    ];
    const element = serializeCols(columns);
    const xml = serializeElement(element);
    expect(xml).toContain('min="1"');
    expect(xml).toContain('min="2"');
    expect(xml).toContain('width="10"');
    expect(xml).toContain('width="15"');
  });

  it("should serialize column range", () => {
    const columns: XlsxColumnDef[] = [
      { min: colIdx(1), max: colIdx(5), width: 12 },
    ];
    const element = serializeCols(columns);
    const xml = serializeElement(element);
    expect(xml).toContain('min="1"');
    expect(xml).toContain('max="5"');
  });

  it("should serialize hidden column", () => {
    const columns: XlsxColumnDef[] = [
      { min: colIdx(1), max: colIdx(1), hidden: true },
    ];
    const element = serializeCols(columns);
    const xml = serializeElement(element);
    expect(xml).toContain('hidden="1"');
  });

  it("should serialize bestFit column", () => {
    const columns: XlsxColumnDef[] = [
      { min: colIdx(1), max: colIdx(1), width: 12, bestFit: true },
    ];
    const element = serializeCols(columns);
    const xml = serializeElement(element);
    expect(xml).toContain('bestFit="1"');
  });

  it("should serialize column with style", () => {
    const columns: XlsxColumnDef[] = [
      { min: colIdx(1), max: colIdx(1), styleId: styleId(3) },
    ];
    const element = serializeCols(columns);
    const xml = serializeElement(element);
    expect(xml).toContain('style="3"');
  });

  it("should omit style when styleId is 0", () => {
    const columns: XlsxColumnDef[] = [
      { min: colIdx(1), max: colIdx(1), styleId: styleId(0) },
    ];
    const element = serializeCols(columns);
    const xml = serializeElement(element);
    expect(xml).not.toContain("style=");
  });
});

// =============================================================================
// serializeMergeCells Tests
// =============================================================================

describe("serializeMergeCells", () => {
  it("should serialize single merge cell", () => {
    const mergeCells: CellRange[] = [range(1, 1, 2, 2)];
    const element = serializeMergeCells(mergeCells);
    const xml = serializeElement(element);
    expect(xml).toBe(
      '<mergeCells count="1"><mergeCell ref="A1:B2"/></mergeCells>',
    );
  });

  it("should serialize multiple merge cells", () => {
    const mergeCells: CellRange[] = [range(1, 1, 2, 2), range(4, 1, 5, 3)];
    const element = serializeMergeCells(mergeCells);
    const xml = serializeElement(element);
    expect(xml).toContain('count="2"');
    expect(xml).toContain('ref="A1:B2"');
    expect(xml).toContain('ref="D1:E3"');
  });

  it("should serialize merge cell spanning multiple columns", () => {
    const mergeCells: CellRange[] = [range(1, 1, 10, 1)];
    const element = serializeMergeCells(mergeCells);
    const xml = serializeElement(element);
    expect(xml).toContain('ref="A1:J1"');
  });

  it("should serialize merge cell spanning multiple rows", () => {
    const mergeCells: CellRange[] = [range(1, 1, 1, 10)];
    const element = serializeMergeCells(mergeCells);
    const xml = serializeElement(element);
    expect(xml).toContain('ref="A1:A10"');
  });
});

// =============================================================================
// serializeWorksheet Tests
// =============================================================================

describe("serializeWorksheet", () => {
  it("should serialize empty worksheet", () => {
    const sharedStrings = createMockSharedStrings();
    const worksheet = createWorksheet([]);
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);

    expect(xml).toContain("<worksheet");
    expect(xml).toContain('xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"');
    expect(xml).toContain("<dimension");
    expect(xml).toContain("<sheetData");
    expect(xml).toContain("<pageMargins");
    expect(xml).toContain("</worksheet>");
  });

  it("should serialize worksheet with data", () => {
    const sharedStrings = createMockSharedStrings();
    const rows: XlsxRow[] = [createRow(1, [numCell(1, 1, 42)])];
    const worksheet = createWorksheet(rows);
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);

    expect(xml).toContain('<dimension ref="A1"/>');
    expect(xml).toContain("<sheetData>");
    expect(xml).toContain('<row r="1">');
    expect(xml).toContain('<c r="A1"><v>42</v></c>');
  });

  it("should serialize worksheet with columns", () => {
    const sharedStrings = createMockSharedStrings();
    const worksheet = createWorksheet([], {
      columns: [{ min: colIdx(1), max: colIdx(1), width: 15 }],
    });
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);

    expect(xml).toContain("<cols>");
    expect(xml).toContain("</cols>");
    expect(xml).toContain('width="15"');
  });

  it("should serialize worksheet with merge cells", () => {
    const sharedStrings = createMockSharedStrings();
    const worksheet = createWorksheet([], {
      mergeCells: [range(1, 1, 2, 2)],
    });
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);

    expect(xml).toContain("<mergeCells");
    expect(xml).toContain("</mergeCells>");
    expect(xml).toContain('ref="A1:B2"');
  });

  it("should include pageMargins with default values", () => {
    const sharedStrings = createMockSharedStrings();
    const worksheet = createWorksheet([]);
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);

    expect(xml).toContain("<pageMargins");
    expect(xml).toContain('left="0.7"');
    expect(xml).toContain('right="0.7"');
    expect(xml).toContain('top="0.75"');
    expect(xml).toContain('bottom="0.75"');
    expect(xml).toContain('header="0.3"');
    expect(xml).toContain('footer="0.3"');
  });

  it("should not include cols when no columns defined", () => {
    const sharedStrings = createMockSharedStrings();
    const worksheet = createWorksheet([]);
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);

    expect(xml).not.toContain("<cols>");
  });

  it("should not include mergeCells when no merges defined", () => {
    const sharedStrings = createMockSharedStrings();
    const worksheet = createWorksheet([]);
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);

    expect(xml).not.toContain("<mergeCells");
  });
});

// =============================================================================
// Element Order Tests
// =============================================================================

describe("Element order", () => {
  it("should have dimension before cols", () => {
    const sharedStrings = createMockSharedStrings();
    const worksheet = createWorksheet([], {
      columns: [{ min: colIdx(1), max: colIdx(1), width: 15 }],
    });
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);

    const dimensionPos = xml.indexOf("<dimension");
    const colsPos = xml.indexOf("<cols>");
    expect(dimensionPos).toBeLessThan(colsPos);
  });

  it("should have cols before sheetData", () => {
    const sharedStrings = createMockSharedStrings();
    const rows: XlsxRow[] = [createRow(1, [numCell(1, 1, 42)])];
    const worksheet = createWorksheet(rows, {
      columns: [{ min: colIdx(1), max: colIdx(1), width: 15 }],
    });
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);

    const colsPos = xml.indexOf("<cols>");
    const sheetDataPos = xml.indexOf("<sheetData>");
    expect(colsPos).toBeLessThan(sheetDataPos);
  });

  it("should have sheetData before mergeCells", () => {
    const sharedStrings = createMockSharedStrings();
    const rows: XlsxRow[] = [createRow(1, [numCell(1, 1, 42)])];
    const worksheet = createWorksheet(rows, {
      mergeCells: [range(1, 1, 2, 2)],
    });
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);

    const sheetDataPos = xml.indexOf("<sheetData>");
    const mergeCellsPos = xml.indexOf("<mergeCells");
    expect(sheetDataPos).toBeLessThan(mergeCellsPos);
  });

  it("should have mergeCells before pageMargins", () => {
    const sharedStrings = createMockSharedStrings();
    const worksheet = createWorksheet([], {
      mergeCells: [range(1, 1, 2, 2)],
    });
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);

    const mergeCellsPos = xml.indexOf("<mergeCells");
    const pageMarginsPos = xml.indexOf("<pageMargins");
    expect(mergeCellsPos).toBeLessThan(pageMarginsPos);
  });
});

// =============================================================================
// String Cell Tests
// =============================================================================

describe("String cells with shared strings", () => {
  it("should serialize string cells using shared string indices", () => {
    const sharedStrings = createMockSharedStrings();
    const rows: XlsxRow[] = [createRow(1, [strCell(1, 1, "Hello")])];
    const worksheet = createWorksheet(rows);
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);

    expect(xml).toContain('t="s"');
    expect(xml).toContain("<v>0</v>"); // First string gets index 0
  });

  it("should reuse shared string indices", () => {
    const sharedStrings = createMockSharedStrings();
    sharedStrings.addString("Hello");

    const rows: XlsxRow[] = [
      createRow(1, [strCell(1, 1, "Hello"), strCell(2, 1, "Hello")]),
    ];
    const worksheet = createWorksheet(rows);
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);

    // Both cells should reference index 0
    const matches = xml.match(/<v>0<\/v>/g);
    expect(matches).toHaveLength(2);
  });
});

// =============================================================================
// Complex Worksheet Tests
// =============================================================================

describe("Complex worksheet", () => {
  it("should serialize a complete worksheet with all features", () => {
    const sharedStrings = createMockSharedStrings();

    const rows: XlsxRow[] = [
      {
        rowNumber: rowIdx(1),
        cells: [
          strCell(1, 1, "Name"),
          strCell(2, 1, "Value"),
        ],
        height: 20,
        customHeight: true,
      },
      {
        rowNumber: rowIdx(2),
        cells: [
          strCell(1, 2, "Item A"),
          numCell(2, 2, 100),
        ],
      },
      {
        rowNumber: rowIdx(3),
        cells: [
          strCell(1, 3, "Item B"),
          numCell(2, 3, 200),
        ],
      },
    ];

    const worksheet = createWorksheet(rows, {
      columns: [
        { min: colIdx(1), max: colIdx(1), width: 20 },
        { min: colIdx(2), max: colIdx(2), width: 15 },
      ],
      mergeCells: [range(1, 1, 2, 1)],
    });

    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);

    // Verify structure
    expect(xml).toContain('xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"');
    expect(xml).toContain('<dimension ref="A1:B3"/>');
    expect(xml).toContain("<cols>");
    expect(xml).toContain('<col min="1" max="1" width="20"');
    expect(xml).toContain('<col min="2" max="2" width="15"');
    expect(xml).toContain("<sheetData>");
    expect(xml).toContain('<row r="1"');
    expect(xml).toContain('ht="20"');
    expect(xml).toContain('customHeight="1"');
    expect(xml).toContain('<row r="2"');
    expect(xml).toContain('<row r="3"');
    expect(xml).toContain('<mergeCells count="1">');
    expect(xml).toContain('<mergeCell ref="A1:B1"/>');
    expect(xml).toContain("<pageMargins");
  });
});

// =============================================================================
// Attribute Order Tests
// =============================================================================

describe("Row attribute order", () => {
  it("should have r attribute first", () => {
    const sharedStrings = createMockSharedStrings();
    const row: XlsxRow = {
      rowNumber: rowIdx(1),
      cells: [numCell(1, 1, 42)],
      height: 20,
      customHeight: true,
      hidden: true,
      styleId: styleId(1),
    };
    const element = serializeRow(row, sharedStrings);

    const keys = Object.keys(element.attrs);
    expect(keys[0]).toBe("r");
  });
});
