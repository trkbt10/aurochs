/**
 * @file Worksheet Serializer Tests
 *
 * Tests for serializing worksheet elements to XML.
 */

import { serializeElement } from "@aurochs/xml";
import type { XlsxWorksheet, XlsxRow, XlsxColumnDef, XlsxSheetView } from "@aurochs-office/xlsx/domain/workbook";
import type { CellAddress, CellRange } from "@aurochs-office/xlsx/domain/cell/address";
import type { Cell } from "@aurochs-office/xlsx/domain/cell/types";
import type { XlsxSheetProtection } from "@aurochs-office/xlsx/domain/protection";
import type { XlsxAutoFilter } from "@aurochs-office/xlsx/domain/auto-filter";
import type { XlsxConditionalFormatting } from "@aurochs-office/xlsx/domain/conditional-formatting";
import type { XlsxDataValidation } from "@aurochs-office/xlsx/domain/data-validation";
import type { XlsxHyperlink } from "@aurochs-office/xlsx/domain/hyperlink";
import type { XlsxPageSetup, XlsxPageMargins, XlsxHeaderFooter, XlsxPrintOptions } from "@aurochs-office/xlsx/domain/page-setup";
import { colIdx, rowIdx, styleId } from "@aurochs-office/xlsx/domain/types";
import type { SharedStringTable } from "./cell";
import {
  serializeWorksheet,
  serializeSheetData,
  serializeRow,
  serializeCols,
  serializeMergeCells,
  serializeDimension,
  serializeSheetPr,
  serializeSheetViews,
  serializeSheetProtection,
  serializeAutoFilter,
  serializeConditionalFormatting,
  serializeDataValidations,
  serializeHyperlinks,
  serializePrintOptions,
  serializePageMargins,
  serializePageSetup,
  serializeHeaderFooter,
  serializeRowBreaks,
  serializeColBreaks,
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
function range(params: {
  readonly startCol: number;
  readonly startRow: number;
  readonly endCol: number;
  readonly endRow: number;
}): CellRange {
  const { startCol, startRow, endCol, endRow } = params;
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
    const rows: XlsxRow[] = [createRow(1, [numCell(1, 1, 1), numCell(3, 1, 3)])];
    const element = serializeDimension(rows);
    const xml = serializeElement(element);
    expect(xml).toBe('<dimension ref="A1:C1"/>');
  });

  it("should calculate dimension for multiple rows", () => {
    const rows: XlsxRow[] = [createRow(1, [numCell(1, 1, 1)]), createRow(3, [numCell(2, 3, 2)])];
    const element = serializeDimension(rows);
    const xml = serializeElement(element);
    expect(xml).toBe('<dimension ref="A1:B3"/>');
  });

  it("should calculate dimension for sparse data", () => {
    const rows: XlsxRow[] = [createRow(2, [numCell(2, 2, 1)]), createRow(5, [numCell(4, 5, 2)])];
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
    const rows: XlsxRow[] = [createRow(1, [numCell(1, 1, 1)]), createRow(2, [numCell(1, 2, 2)])];
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
    const columns: XlsxColumnDef[] = [{ min: colIdx(1), max: colIdx(1), width: 12 }];
    const element = serializeCols(columns);
    const xml = serializeElement(element);
    expect(xml).toBe('<cols><col min="1" max="1" width="12" customWidth="1"/></cols>');
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
    const columns: XlsxColumnDef[] = [{ min: colIdx(1), max: colIdx(5), width: 12 }];
    const element = serializeCols(columns);
    const xml = serializeElement(element);
    expect(xml).toContain('min="1"');
    expect(xml).toContain('max="5"');
  });

  it("should serialize hidden column", () => {
    const columns: XlsxColumnDef[] = [{ min: colIdx(1), max: colIdx(1), hidden: true }];
    const element = serializeCols(columns);
    const xml = serializeElement(element);
    expect(xml).toContain('hidden="1"');
  });

  it("should serialize bestFit column", () => {
    const columns: XlsxColumnDef[] = [{ min: colIdx(1), max: colIdx(1), width: 12, bestFit: true }];
    const element = serializeCols(columns);
    const xml = serializeElement(element);
    expect(xml).toContain('bestFit="1"');
  });

  it("should serialize column with style", () => {
    const columns: XlsxColumnDef[] = [{ min: colIdx(1), max: colIdx(1), styleId: styleId(3) }];
    const element = serializeCols(columns);
    const xml = serializeElement(element);
    expect(xml).toContain('style="3"');
  });

  it("should omit style when styleId is 0", () => {
    const columns: XlsxColumnDef[] = [{ min: colIdx(1), max: colIdx(1), styleId: styleId(0) }];
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
    const mergeCells: CellRange[] = [range({ startCol: 1, startRow: 1, endCol: 2, endRow: 2 })];
    const element = serializeMergeCells(mergeCells);
    const xml = serializeElement(element);
    expect(xml).toBe('<mergeCells count="1"><mergeCell ref="A1:B2"/></mergeCells>');
  });

  it("should serialize multiple merge cells", () => {
    const mergeCells: CellRange[] = [
      range({ startCol: 1, startRow: 1, endCol: 2, endRow: 2 }),
      range({ startCol: 4, startRow: 1, endCol: 5, endRow: 3 }),
    ];
    const element = serializeMergeCells(mergeCells);
    const xml = serializeElement(element);
    expect(xml).toContain('count="2"');
    expect(xml).toContain('ref="A1:B2"');
    expect(xml).toContain('ref="D1:E3"');
  });

  it("should serialize merge cell spanning multiple columns", () => {
    const mergeCells: CellRange[] = [range({ startCol: 1, startRow: 1, endCol: 10, endRow: 1 })];
    const element = serializeMergeCells(mergeCells);
    const xml = serializeElement(element);
    expect(xml).toContain('ref="A1:J1"');
  });

  it("should serialize merge cell spanning multiple rows", () => {
    const mergeCells: CellRange[] = [range({ startCol: 1, startRow: 1, endCol: 1, endRow: 10 })];
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
      mergeCells: [range({ startCol: 1, startRow: 1, endCol: 2, endRow: 2 })],
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
      mergeCells: [range({ startCol: 1, startRow: 1, endCol: 2, endRow: 2 })],
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
      mergeCells: [range({ startCol: 1, startRow: 1, endCol: 2, endRow: 2 })],
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

    const rows: XlsxRow[] = [createRow(1, [strCell(1, 1, "Hello"), strCell(2, 1, "Hello")])];
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
        cells: [strCell(1, 1, "Name"), strCell(2, 1, "Value")],
        height: 20,
        customHeight: true,
      },
      {
        rowNumber: rowIdx(2),
        cells: [strCell(1, 2, "Item A"), numCell(2, 2, 100)],
      },
      {
        rowNumber: rowIdx(3),
        cells: [strCell(1, 3, "Item B"), numCell(2, 3, 200)],
      },
    ];

    const worksheet = createWorksheet(rows, {
      columns: [
        { min: colIdx(1), max: colIdx(1), width: 20 },
        { min: colIdx(2), max: colIdx(2), width: 15 },
      ],
      mergeCells: [range({ startCol: 1, startRow: 1, endCol: 2, endRow: 1 })],
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

// =============================================================================
// serializeSheetPr Tests
// =============================================================================

describe("serializeSheetPr", () => {
  it("should return undefined when no tabColor", () => {
    const worksheet = createWorksheet([]);
    expect(serializeSheetPr(worksheet)).toBeUndefined();
  });

  it("should serialize RGB tabColor", () => {
    const worksheet: XlsxWorksheet = {
      ...createWorksheet([]),
      tabColor: { type: "rgb", value: "FF0000" },
    };
    const element = serializeSheetPr(worksheet)!;
    const xml = serializeElement(element);
    expect(xml).toBe('<sheetPr><tabColor rgb="FF0000"/></sheetPr>');
  });

  it("should serialize theme tabColor with tint", () => {
    const worksheet: XlsxWorksheet = {
      ...createWorksheet([]),
      tabColor: { type: "theme", theme: 4, tint: -0.25 },
    };
    const element = serializeSheetPr(worksheet)!;
    const xml = serializeElement(element);
    expect(xml).toContain('theme="4"');
    expect(xml).toContain('tint="-0.25"');
  });

  it("should serialize indexed tabColor", () => {
    const worksheet: XlsxWorksheet = {
      ...createWorksheet([]),
      tabColor: { type: "indexed", index: 10 },
    };
    const element = serializeSheetPr(worksheet)!;
    const xml = serializeElement(element);
    expect(xml).toContain('indexed="10"');
  });
});

// =============================================================================
// serializeSheetViews Tests
// =============================================================================

describe("serializeSheetViews", () => {
  it("should serialize basic sheet view", () => {
    const view: XlsxSheetView = { tabSelected: true };
    const element = serializeSheetViews(view);
    const xml = serializeElement(element);
    expect(xml).toContain("<sheetViews>");
    expect(xml).toContain('tabSelected="1"');
    expect(xml).toContain('workbookViewId="0"');
  });

  it("should serialize sheet view with zoom", () => {
    const view: XlsxSheetView = { zoomScale: 150 };
    const element = serializeSheetViews(view);
    const xml = serializeElement(element);
    expect(xml).toContain('zoomScale="150"');
  });

  it("should serialize sheet view with hidden gridlines", () => {
    const view: XlsxSheetView = { showGridLines: false };
    const element = serializeSheetViews(view);
    const xml = serializeElement(element);
    expect(xml).toContain('showGridLines="0"');
  });

  it("should serialize sheet view with pane (freeze)", () => {
    const view: XlsxSheetView = {
      pane: { xSplit: 1, ySplit: 2, topLeftCell: "B3", activePane: "bottomRight", state: "frozen" },
    };
    const element = serializeSheetViews(view);
    const xml = serializeElement(element);
    expect(xml).toContain('<pane');
    expect(xml).toContain('xSplit="1"');
    expect(xml).toContain('ySplit="2"');
    expect(xml).toContain('topLeftCell="B3"');
    expect(xml).toContain('state="frozen"');
  });

  it("should serialize sheet view with selection", () => {
    const view: XlsxSheetView = {
      selection: { pane: "bottomRight", activeCell: "C5", sqref: "C5:D10" },
    };
    const element = serializeSheetViews(view);
    const xml = serializeElement(element);
    expect(xml).toContain('<selection');
    expect(xml).toContain('activeCell="C5"');
    expect(xml).toContain('sqref="C5:D10"');
  });
});

// =============================================================================
// serializeSheetProtection Tests
// =============================================================================

describe("serializeSheetProtection", () => {
  it("should serialize basic protection", () => {
    const protection: XlsxSheetProtection = { sheet: true };
    const element = serializeSheetProtection(protection);
    const xml = serializeElement(element);
    expect(xml).toBe('<sheetProtection sheet="1"/>');
  });

  it("should serialize protection with password", () => {
    const protection: XlsxSheetProtection = { sheet: true, password: "CC3D" };
    const element = serializeSheetProtection(protection);
    const xml = serializeElement(element);
    expect(xml).toContain('sheet="1"');
    expect(xml).toContain('password="CC3D"');
  });

  it("should serialize protection with granular permissions", () => {
    const protection: XlsxSheetProtection = {
      sheet: true,
      formatCells: false,
      insertRows: true,
      deleteRows: false,
    };
    const element = serializeSheetProtection(protection);
    const xml = serializeElement(element);
    expect(xml).toContain('sheet="1"');
    expect(xml).toContain('formatCells="0"');
    expect(xml).toContain('insertRows="1"');
    expect(xml).toContain('deleteRows="0"');
  });

  it("should serialize protection with modern hash", () => {
    const protection: XlsxSheetProtection = {
      sheet: true,
      algorithmName: "SHA-512",
      hashValue: "abc123==",
      saltValue: "def456==",
      spinCount: 100000,
    };
    const element = serializeSheetProtection(protection);
    const xml = serializeElement(element);
    expect(xml).toContain('algorithmName="SHA-512"');
    expect(xml).toContain('hashValue="abc123=="');
    expect(xml).toContain('saltValue="def456=="');
    expect(xml).toContain('spinCount="100000"');
  });
});

// =============================================================================
// serializeAutoFilter Tests
// =============================================================================

describe("serializeAutoFilter", () => {
  it("should serialize basic auto filter", () => {
    const af: XlsxAutoFilter = {
      ref: range({ startCol: 1, startRow: 1, endCol: 5, endRow: 100 }),
    };
    const element = serializeAutoFilter(af);
    const xml = serializeElement(element);
    expect(xml).toBe('<autoFilter ref="A1:E100"/>');
  });

  it("should serialize auto filter with value filters", () => {
    const af: XlsxAutoFilter = {
      ref: range({ startCol: 1, startRow: 1, endCol: 3, endRow: 10 }),
      filterColumns: [{
        colId: colIdx(0),
        filter: { type: "filters", values: [{ val: "A" }, { val: "B" }] },
      }],
    };
    const element = serializeAutoFilter(af);
    const xml = serializeElement(element);
    expect(xml).toContain('<filterColumn colId="0">');
    expect(xml).toContain('<filter val="A"/>');
    expect(xml).toContain('<filter val="B"/>');
  });

  it("should serialize auto filter with custom filter", () => {
    const af: XlsxAutoFilter = {
      ref: range({ startCol: 1, startRow: 1, endCol: 3, endRow: 10 }),
      filterColumns: [{
        colId: colIdx(1),
        filter: {
          type: "customFilters",
          and: true,
          conditions: [
            { operator: "greaterThan", val: "100" },
            { operator: "lessThan", val: "500" },
          ],
        },
      }],
    };
    const element = serializeAutoFilter(af);
    const xml = serializeElement(element);
    expect(xml).toContain('and="1"');
    expect(xml).toContain('operator="greaterThan"');
    expect(xml).toContain('operator="lessThan"');
  });

  it("should serialize auto filter with top10", () => {
    const af: XlsxAutoFilter = {
      ref: range({ startCol: 1, startRow: 1, endCol: 3, endRow: 10 }),
      filterColumns: [{
        colId: colIdx(0),
        filter: { type: "top10", top: true, percent: false, val: 5 },
      }],
    };
    const element = serializeAutoFilter(af);
    const xml = serializeElement(element);
    expect(xml).toContain('<top10');
    expect(xml).toContain('top="1"');
    expect(xml).toContain('val="5"');
  });

  it("should serialize auto filter with sort state", () => {
    const af: XlsxAutoFilter = {
      ref: range({ startCol: 1, startRow: 1, endCol: 3, endRow: 10 }),
      sortState: {
        ref: "A1:C10",
        sortConditions: [{ ref: "B1:B10", descending: true }],
      },
    };
    const element = serializeAutoFilter(af);
    const xml = serializeElement(element);
    expect(xml).toContain('<sortState ref="A1:C10">');
    expect(xml).toContain('<sortCondition');
    expect(xml).toContain('descending="1"');
  });
});

// =============================================================================
// serializeConditionalFormatting Tests
// =============================================================================

describe("serializeConditionalFormatting", () => {
  it("should serialize standard rule with formula", () => {
    const cf: XlsxConditionalFormatting = {
      sqref: "A1:B10",
      ranges: [range({ startCol: 1, startRow: 1, endCol: 2, endRow: 10 })],
      rules: [{
        type: "expression",
        priority: 1,
        dxfId: 0,
        formulas: ["A1>100"],
      }],
    };
    const element = serializeConditionalFormatting(cf);
    const xml = serializeElement(element);
    expect(xml).toContain('sqref="A1:B10"');
    expect(xml).toContain('type="expression"');
    expect(xml).toContain('priority="1"');
    expect(xml).toContain('dxfId="0"');
    expect(xml).toContain("<formula>A1&gt;100</formula>");
  });

  it("should serialize cellIs rule with operator", () => {
    const cf: XlsxConditionalFormatting = {
      sqref: "C1:C20",
      ranges: [],
      rules: [{
        type: "cellIs",
        priority: 2,
        operator: "greaterThan",
        dxfId: 1,
        formulas: ["50"],
      }],
    };
    const element = serializeConditionalFormatting(cf);
    const xml = serializeElement(element);
    expect(xml).toContain('type="cellIs"');
    expect(xml).toContain('operator="greaterThan"');
  });

  it("should serialize color scale rule", () => {
    const cf: XlsxConditionalFormatting = {
      sqref: "D1:D100",
      ranges: [],
      rules: [{
        type: "colorScale",
        priority: 1,
        cfvo: [{ type: "min" }, { type: "max" }],
        colors: [
          { type: "rgb", value: "FF0000" },
          { type: "rgb", value: "00FF00" },
        ],
      }],
    };
    const element = serializeConditionalFormatting(cf);
    const xml = serializeElement(element);
    expect(xml).toContain('type="colorScale"');
    expect(xml).toContain("<colorScale>");
    expect(xml).toContain('type="min"');
    expect(xml).toContain('type="max"');
    expect(xml).toContain('rgb="FF0000"');
    expect(xml).toContain('rgb="00FF00"');
  });

  it("should serialize data bar rule", () => {
    const cf: XlsxConditionalFormatting = {
      sqref: "E1:E50",
      ranges: [],
      rules: [{
        type: "dataBar",
        priority: 1,
        cfvo: [{ type: "min" }, { type: "max" }],
        color: { type: "rgb", value: "638EC6" },
        showValue: true,
        minLength: 10,
        maxLength: 90,
      }],
    };
    const element = serializeConditionalFormatting(cf);
    const xml = serializeElement(element);
    expect(xml).toContain('type="dataBar"');
    expect(xml).toContain("<dataBar");
    expect(xml).toContain('showValue="1"');
    expect(xml).toContain('minLength="10"');
    expect(xml).toContain('maxLength="90"');
    expect(xml).toContain('rgb="638EC6"');
  });

  it("should serialize icon set rule", () => {
    const cf: XlsxConditionalFormatting = {
      sqref: "F1:F20",
      ranges: [],
      rules: [{
        type: "iconSet",
        priority: 1,
        iconSet: "3TrafficLights1",
        cfvo: [
          { type: "num", val: "0" },
          { type: "num", val: "33" },
          { type: "num", val: "67" },
        ],
        showValue: false,
        reverse: true,
      }],
    };
    const element = serializeConditionalFormatting(cf);
    const xml = serializeElement(element);
    expect(xml).toContain('type="iconSet"');
    expect(xml).toContain('iconSet="3TrafficLights1"');
    expect(xml).toContain('showValue="0"');
    expect(xml).toContain('reverse="1"');
    expect(xml).toContain('val="33"');
  });
});

// =============================================================================
// serializeDataValidations Tests
// =============================================================================

describe("serializeDataValidations", () => {
  it("should serialize list validation", () => {
    const validations: XlsxDataValidation[] = [{
      type: "list",
      sqref: "B1:B100",
      ranges: [],
      allowBlank: true,
      showInputMessage: true,
      showErrorMessage: true,
      formula1: "$A$1:$A$10",
    }];
    const element = serializeDataValidations(validations);
    const xml = serializeElement(element);
    expect(xml).toContain('count="1"');
    expect(xml).toContain('type="list"');
    expect(xml).toContain('allowBlank="1"');
    expect(xml).toContain('sqref="B1:B100"');
    expect(xml).toContain("<formula1>$A$1:$A$10</formula1>");
  });

  it("should serialize whole number validation with range", () => {
    const validations: XlsxDataValidation[] = [{
      type: "whole",
      operator: "between",
      sqref: "C1:C50",
      ranges: [],
      formula1: "1",
      formula2: "100",
      errorStyle: "stop",
      errorTitle: "Invalid",
      error: "Must be 1-100",
      promptTitle: "Enter number",
      prompt: "Enter a number between 1 and 100",
    }];
    const element = serializeDataValidations(validations);
    const xml = serializeElement(element);
    expect(xml).toContain('type="whole"');
    expect(xml).toContain('operator="between"');
    expect(xml).toContain('errorStyle="stop"');
    expect(xml).toContain('errorTitle="Invalid"');
    expect(xml).toContain("<formula1>1</formula1>");
    expect(xml).toContain("<formula2>100</formula2>");
  });

  it("should serialize multiple validations", () => {
    const validations: XlsxDataValidation[] = [
      { type: "list", sqref: "A1:A10", ranges: [], formula1: "Yes,No" },
      { type: "decimal", operator: "greaterThan", sqref: "B1:B10", ranges: [], formula1: "0" },
    ];
    const element = serializeDataValidations(validations);
    const xml = serializeElement(element);
    expect(xml).toContain('count="2"');
  });
});

// =============================================================================
// serializeHyperlinks Tests
// =============================================================================

describe("serializeHyperlinks", () => {
  it("should serialize external hyperlink", () => {
    const hyperlinks: XlsxHyperlink[] = [{
      ref: range({ startCol: 1, startRow: 1, endCol: 1, endRow: 1 }),
      relationshipId: "rId1",
      display: "Google",
      tooltip: "Go to Google",
    }];
    const element = serializeHyperlinks(hyperlinks);
    const xml = serializeElement(element);
    expect(xml).toContain("<hyperlinks>");
    expect(xml).toContain('ref="A1"');
    expect(xml).toContain('r:id="rId1"');
    expect(xml).toContain('display="Google"');
    expect(xml).toContain('tooltip="Go to Google"');
  });

  it("should serialize internal hyperlink", () => {
    const hyperlinks: XlsxHyperlink[] = [{
      ref: range({ startCol: 2, startRow: 3, endCol: 2, endRow: 3 }),
      location: "Sheet2!A1",
      display: "Go to Sheet2",
    }];
    const element = serializeHyperlinks(hyperlinks);
    const xml = serializeElement(element);
    expect(xml).toContain('location="Sheet2!A1"');
    expect(xml).not.toContain("r:id=");
  });
});

// =============================================================================
// serializePrintOptions Tests
// =============================================================================

describe("serializePrintOptions", () => {
  it("should serialize print options", () => {
    const options: XlsxPrintOptions = {
      gridLines: true,
      headings: true,
      horizontalCentered: true,
      verticalCentered: false,
    };
    const element = serializePrintOptions(options);
    const xml = serializeElement(element);
    expect(xml).toContain('gridLines="1"');
    expect(xml).toContain('headings="1"');
    expect(xml).toContain('horizontalCentered="1"');
    expect(xml).toContain('verticalCentered="0"');
  });
});

// =============================================================================
// serializePageMargins Tests
// =============================================================================

describe("serializePageMargins", () => {
  it("should serialize custom margins", () => {
    const margins: XlsxPageMargins = {
      left: 1,
      right: 1,
      top: 1.5,
      bottom: 1.5,
      header: 0.5,
      footer: 0.5,
    };
    const element = serializePageMargins(margins);
    const xml = serializeElement(element);
    expect(xml).toContain('left="1"');
    expect(xml).toContain('right="1"');
    expect(xml).toContain('top="1.5"');
    expect(xml).toContain('bottom="1.5"');
    expect(xml).toContain('header="0.5"');
    expect(xml).toContain('footer="0.5"');
  });

  it("should use defaults for undefined values", () => {
    const margins: XlsxPageMargins = {};
    const element = serializePageMargins(margins);
    const xml = serializeElement(element);
    expect(xml).toContain('left="0.7"');
    expect(xml).toContain('right="0.7"');
    expect(xml).toContain('top="0.75"');
    expect(xml).toContain('bottom="0.75"');
    expect(xml).toContain('header="0.3"');
    expect(xml).toContain('footer="0.3"');
  });
});

// =============================================================================
// serializePageSetup Tests
// =============================================================================

describe("serializePageSetup", () => {
  it("should serialize page setup with orientation", () => {
    const setup: XlsxPageSetup = {
      paperSize: 9,
      orientation: "landscape",
      scale: 100,
    };
    const element = serializePageSetup(setup);
    const xml = serializeElement(element);
    expect(xml).toContain('paperSize="9"');
    expect(xml).toContain('orientation="landscape"');
    expect(xml).toContain('scale="100"');
  });

  it("should serialize fit-to-page setup", () => {
    const setup: XlsxPageSetup = {
      fitToWidth: 1,
      fitToHeight: 0,
    };
    const element = serializePageSetup(setup);
    const xml = serializeElement(element);
    expect(xml).toContain('fitToWidth="1"');
    expect(xml).toContain('fitToHeight="0"');
  });
});

// =============================================================================
// serializeHeaderFooter Tests
// =============================================================================

describe("serializeHeaderFooter", () => {
  it("should serialize header and footer", () => {
    const hf: XlsxHeaderFooter = {
      oddHeader: "&LPage &P&CTitle",
      oddFooter: "&LFooter&RPage &P of &N",
    };
    const element = serializeHeaderFooter(hf);
    const xml = serializeElement(element);
    expect(xml).toContain("<oddHeader>&amp;LPage &amp;P&amp;CTitle</oddHeader>");
    expect(xml).toContain("<oddFooter>");
  });

  it("should serialize differentOddEven flag", () => {
    const hf: XlsxHeaderFooter = {
      differentOddEven: true,
      oddHeader: "Odd",
      evenHeader: "Even",
    };
    const element = serializeHeaderFooter(hf);
    const xml = serializeElement(element);
    expect(xml).toContain('differentOddEven="1"');
    expect(xml).toContain("<evenHeader>");
  });
});

// =============================================================================
// serializeRowBreaks / serializeColBreaks Tests
// =============================================================================

describe("serializeRowBreaks", () => {
  it("should serialize row breaks", () => {
    const element = serializeRowBreaks([
      { id: 10, max: 16383, manual: true },
      { id: 25, max: 16383, manual: true },
    ]);
    const xml = serializeElement(element);
    expect(xml).toContain('count="2"');
    expect(xml).toContain('manualBreakCount="2"');
    expect(xml).toContain('id="10"');
    expect(xml).toContain('id="25"');
    expect(xml).toContain('man="1"');
  });
});

describe("serializeColBreaks", () => {
  it("should serialize column breaks", () => {
    const element = serializeColBreaks([
      { id: 5, max: 1048575, manual: true },
    ]);
    const xml = serializeElement(element);
    expect(xml).toContain("<colBreaks");
    expect(xml).toContain('count="1"');
    expect(xml).toContain('id="5"');
  });
});

// =============================================================================
// Full Worksheet with New Elements Tests
// =============================================================================

describe("serializeWorksheet with new elements", () => {
  it("should include sheetPr with tabColor", () => {
    const sharedStrings = createMockSharedStrings();
    const worksheet: XlsxWorksheet = {
      ...createWorksheet([]),
      tabColor: { type: "rgb", value: "FF0000" },
    };
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toContain("<sheetPr>");
    expect(xml).toContain('rgb="FF0000"');
    // sheetPr should come before dimension
    const sheetPrPos = xml.indexOf("<sheetPr>");
    const dimensionPos = xml.indexOf("<dimension");
    expect(sheetPrPos).toBeLessThan(dimensionPos);
  });

  it("should include sheetViews", () => {
    const sharedStrings = createMockSharedStrings();
    const worksheet: XlsxWorksheet = {
      ...createWorksheet([]),
      sheetView: { tabSelected: true, zoomScale: 120 },
    };
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toContain("<sheetViews>");
    expect(xml).toContain('tabSelected="1"');
    // sheetViews after dimension, before sheetFormatPr
    const dimensionPos = xml.indexOf("<dimension");
    const viewsPos = xml.indexOf("<sheetViews>");
    expect(dimensionPos).toBeLessThan(viewsPos);
  });

  it("should include sheetProtection", () => {
    const sharedStrings = createMockSharedStrings();
    const worksheet: XlsxWorksheet = {
      ...createWorksheet([]),
      sheetProtection: { sheet: true, formatCells: false },
    };
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toContain("<sheetProtection");
    expect(xml).toContain('sheet="1"');
  });

  it("should include autoFilter", () => {
    const sharedStrings = createMockSharedStrings();
    const worksheet: XlsxWorksheet = {
      ...createWorksheet([createRow(1, [numCell(1, 1, 1)])]),
      autoFilter: { ref: range({ startCol: 1, startRow: 1, endCol: 3, endRow: 10 }) },
    };
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toContain('<autoFilter ref="A1:C10"/>');
  });

  it("should include conditionalFormatting", () => {
    const sharedStrings = createMockSharedStrings();
    const worksheet: XlsxWorksheet = {
      ...createWorksheet([]),
      conditionalFormattings: [{
        sqref: "A1:B10",
        ranges: [],
        rules: [{
          type: "cellIs",
          priority: 1,
          operator: "greaterThan",
          dxfId: 0,
          formulas: ["100"],
        }],
      }],
    };
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toContain("<conditionalFormatting");
    expect(xml).toContain('sqref="A1:B10"');
  });

  it("should include dataValidations", () => {
    const sharedStrings = createMockSharedStrings();
    const worksheet: XlsxWorksheet = {
      ...createWorksheet([]),
      dataValidations: [{
        type: "list",
        sqref: "A1:A10",
        ranges: [],
        formula1: "Yes,No",
      }],
    };
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toContain("<dataValidations");
    expect(xml).toContain('type="list"');
  });

  it("should include hyperlinks with r namespace", () => {
    const sharedStrings = createMockSharedStrings();
    const worksheet: XlsxWorksheet = {
      ...createWorksheet([]),
      hyperlinks: [{
        ref: range({ startCol: 1, startRow: 1, endCol: 1, endRow: 1 }),
        relationshipId: "rId1",
        target: "https://example.com",
        display: "Example",
      }],
    };
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toContain("xmlns:r=");
    expect(xml).toContain("<hyperlinks>");
    expect(xml).toContain('r:id="rId1"');
  });

  it("should use worksheet pageMargins instead of defaults", () => {
    const sharedStrings = createMockSharedStrings();
    const worksheet: XlsxWorksheet = {
      ...createWorksheet([]),
      pageMargins: { left: 1, right: 1, top: 1.5, bottom: 1.5, header: 0.5, footer: 0.5 },
    };
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toContain('left="1"');
    expect(xml).toContain('top="1.5"');
  });

  it("should include pageSetup", () => {
    const sharedStrings = createMockSharedStrings();
    const worksheet: XlsxWorksheet = {
      ...createWorksheet([]),
      pageSetup: { orientation: "landscape", paperSize: 9 },
    };
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toContain('orientation="landscape"');
  });

  it("should include headerFooter", () => {
    const sharedStrings = createMockSharedStrings();
    const worksheet: XlsxWorksheet = {
      ...createWorksheet([]),
      headerFooter: { oddHeader: "My Header" },
    };
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toContain("<headerFooter>");
    expect(xml).toContain("<oddHeader>");
  });

  it("should include page breaks", () => {
    const sharedStrings = createMockSharedStrings();
    const worksheet: XlsxWorksheet = {
      ...createWorksheet([]),
      pageBreaks: {
        rowBreaks: [{ id: 10, max: 16383, manual: true }],
        colBreaks: [{ id: 5, max: 1048575, manual: true }],
      },
    };
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toContain("<rowBreaks");
    expect(xml).toContain("<colBreaks");
  });

  it("should maintain correct element order for all features", () => {
    const sharedStrings = createMockSharedStrings();
    const worksheet: XlsxWorksheet = {
      ...createWorksheet([createRow(1, [numCell(1, 1, 42)])], {
        columns: [{ min: colIdx(1), max: colIdx(1), width: 10 }],
        mergeCells: [range({ startCol: 1, startRow: 1, endCol: 2, endRow: 1 })],
      }),
      tabColor: { type: "rgb", value: "FF0000" },
      sheetView: { tabSelected: true },
      sheetProtection: { sheet: true },
      autoFilter: { ref: range({ startCol: 1, startRow: 1, endCol: 2, endRow: 10 }) },
      conditionalFormattings: [{
        sqref: "A1:B10",
        ranges: [],
        rules: [{ type: "expression", priority: 1, formulas: ["TRUE"] }],
      }],
      dataValidations: [{ type: "list", sqref: "A1", ranges: [], formula1: "a,b" }],
      printOptions: { gridLines: true },
      pageMargins: { left: 1, right: 1, top: 1, bottom: 1, header: 0.5, footer: 0.5 },
      pageSetup: { orientation: "portrait" },
      headerFooter: { oddHeader: "Title" },
      pageBreaks: { rowBreaks: [{ id: 5, manual: true }], colBreaks: [] },
    };
    const element = serializeWorksheet(worksheet, sharedStrings);
    const xml = serializeElement(element);

    // Verify ECMA-376 element order
    const positions = [
      xml.indexOf("<sheetPr>"),
      xml.indexOf("<dimension"),
      xml.indexOf("<sheetViews>"),
      xml.indexOf("<cols>"),
      xml.indexOf("<sheetData>"),
      xml.indexOf("<sheetProtection"),
      xml.indexOf("<autoFilter"),
      xml.indexOf("<mergeCells"),
      xml.indexOf("<conditionalFormatting"),
      xml.indexOf("<dataValidations"),
      xml.indexOf("<printOptions"),
      xml.indexOf("<pageMargins"),
      xml.indexOf("<pageSetup"),
      xml.indexOf("<headerFooter"),
      xml.indexOf("<rowBreaks"),
    ];
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });
});
