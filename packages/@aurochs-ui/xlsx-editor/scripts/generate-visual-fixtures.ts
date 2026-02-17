/**
 * @file Generate XLSX files for visual regression testing
 *
 * Creates test XLSX files that can be opened in LibreOffice Calc
 * to capture baseline screenshots.
 *
 * Usage:
 *   bun packages/@aurochs-ui/xlsx-editor/scripts/generate-visual-fixtures.ts
 *
 * This will:
 *   1. Generate test workbooks with specific layouts
 *   2. Export them as XLSX files
 *   3. Print instructions for capturing LibreOffice baselines
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { XlsxWorkbook, XlsxWorksheet, XlsxRow } from "@aurochs-office/xlsx/domain/workbook";
import type { CellAddress } from "@aurochs-office/xlsx/domain/cell/address";
import type { XlsxCell } from "@aurochs-office/xlsx/domain/cell/types";
import { createDefaultStyleSheet, type XlsxCellXf } from "@aurochs-office/xlsx/domain/style/types";
import { colIdx, rowIdx, styleId, fontId, fillId, borderId, numFmtId, type ColIndex, type RowIndex } from "@aurochs-office/xlsx/domain/types";
import { exportXlsx } from "@aurochs-builder/xlsx/exporter";

// =============================================================================
// Helpers
// =============================================================================

function addr(col: ColIndex, row: RowIndex): CellAddress {
  return { col, row, colAbsolute: false, rowAbsolute: false };
}

function textCell(col: ColIndex, row: RowIndex, text: string): XlsxCell {
  return {
    address: addr(col, row),
    value: { type: "string", value: text },
    styleId: styleId(0),
  };
}

function numCell(col: ColIndex, row: RowIndex, num: number): XlsxCell {
  return {
    address: addr(col, row),
    value: { type: "number", value: num },
    styleId: styleId(0),
  };
}

// =============================================================================
// Test Workbook: Frozen Panes
// =============================================================================

function createFrozenPanesWorkbook(): XlsxWorkbook {
  const styles = createDefaultStyleSheet();

  // Create a sheet with frozen row and column
  const rows: XlsxRow[] = [];

  // Header row (will be frozen)
  rows.push({
    rowNumber: rowIdx(1),
    height: 24,
    customHeight: true,
    cells: [
      textCell(colIdx(1), rowIdx(1), "ID"),
      textCell(colIdx(2), rowIdx(1), "Name"),
      textCell(colIdx(3), rowIdx(1), "Value"),
      textCell(colIdx(4), rowIdx(1), "Status"),
      textCell(colIdx(5), rowIdx(1), "Notes"),
    ],
  });

  // Data rows
  for (let i = 2; i <= 30; i++) {
    rows.push({
      rowNumber: rowIdx(i),
      cells: [
        numCell(colIdx(1), rowIdx(i), i - 1),
        textCell(colIdx(2), rowIdx(i), `Item ${i - 1}`),
        numCell(colIdx(3), rowIdx(i), (i - 1) * 100),
        textCell(colIdx(4), rowIdx(i), i % 3 === 0 ? "Active" : "Pending"),
        textCell(colIdx(5), rowIdx(i), `Note for row ${i}`),
      ],
    });
  }

  const sheet: XlsxWorksheet = {
    dateSystem: "1900",
    name: "Frozen Panes",
    sheetId: 1,
    state: "visible",
    sheetView: {
      showGridLines: true,
      showRowColHeaders: true,
      pane: {
        xSplit: 1, // Freeze column A
        ySplit: 1, // Freeze row 1
        topLeftCell: "B2",
        activePane: "bottomRight",
        state: "frozen",
      },
    },
    columns: [
      { min: colIdx(1), max: colIdx(1), width: 8 },
      { min: colIdx(2), max: colIdx(2), width: 15 },
      { min: colIdx(3), max: colIdx(3), width: 12 },
      { min: colIdx(4), max: colIdx(4), width: 12 },
      { min: colIdx(5), max: colIdx(5), width: 20 },
    ],
    rows,
    xmlPath: "xl/worksheets/sheet1.xml",
  };

  return {
    dateSystem: "1900",
    sheets: [sheet],
    styles,
    sharedStrings: [],
  };
}

// =============================================================================
// Test Workbook: Frozen Rows Only
// =============================================================================

function createFrozenRowsWorkbook(): XlsxWorkbook {
  const styles = createDefaultStyleSheet();

  const rows: XlsxRow[] = [];

  // Two header rows (will be frozen)
  rows.push({
    rowNumber: rowIdx(1),
    height: 28,
    customHeight: true,
    cells: [
      textCell(colIdx(1), rowIdx(1), "Category"),
      textCell(colIdx(2), rowIdx(1), "Q1"),
      textCell(colIdx(3), rowIdx(1), "Q2"),
      textCell(colIdx(4), rowIdx(1), "Q3"),
      textCell(colIdx(5), rowIdx(1), "Q4"),
    ],
  });

  rows.push({
    rowNumber: rowIdx(2),
    height: 22,
    customHeight: true,
    cells: [
      textCell(colIdx(1), rowIdx(2), "(units)"),
      textCell(colIdx(2), rowIdx(2), "Jan-Mar"),
      textCell(colIdx(3), rowIdx(2), "Apr-Jun"),
      textCell(colIdx(4), rowIdx(2), "Jul-Sep"),
      textCell(colIdx(5), rowIdx(2), "Oct-Dec"),
    ],
  });

  // Data rows
  const categories = ["Sales", "Marketing", "R&D", "Operations", "HR", "Finance"];
  for (let i = 0; i < categories.length; i++) {
    const rowNum = i + 3;
    rows.push({
      rowNumber: rowIdx(rowNum),
      cells: [
        textCell(colIdx(1), rowIdx(rowNum), categories[i]),
        numCell(colIdx(2), rowIdx(rowNum), Math.floor(Math.random() * 1000)),
        numCell(colIdx(3), rowIdx(rowNum), Math.floor(Math.random() * 1000)),
        numCell(colIdx(4), rowIdx(rowNum), Math.floor(Math.random() * 1000)),
        numCell(colIdx(5), rowIdx(rowNum), Math.floor(Math.random() * 1000)),
      ],
    });
  }

  const sheet: XlsxWorksheet = {
    dateSystem: "1900",
    name: "Frozen Rows",
    sheetId: 1,
    state: "visible",
    sheetView: {
      showGridLines: true,
      showRowColHeaders: true,
      pane: {
        xSplit: 0, // No frozen columns
        ySplit: 2, // Freeze top 2 rows
        topLeftCell: "A3",
        activePane: "bottomLeft",
        state: "frozen",
      },
    },
    columns: [
      { min: colIdx(1), max: colIdx(1), width: 15 },
      { min: colIdx(2), max: colIdx(5), width: 12 },
    ],
    rows,
    xmlPath: "xl/worksheets/sheet1.xml",
  };

  return {
    dateSystem: "1900",
    sheets: [sheet],
    styles,
    sharedStrings: [],
  };
}

// =============================================================================
// Test Workbook: Frozen Columns Only
// =============================================================================

function createFrozenColsWorkbook(): XlsxWorkbook {
  const styles = createDefaultStyleSheet();

  const rows: XlsxRow[] = [];

  // Create a wide table with many columns
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Header row
  const headerCells: XlsxCell[] = [
    textCell(colIdx(1), rowIdx(1), "Region"),
    textCell(colIdx(2), rowIdx(1), "Country"),
  ];
  months.forEach((month, i) => {
    headerCells.push(textCell(colIdx(i + 3), rowIdx(1), month));
  });
  rows.push({ rowNumber: rowIdx(1), cells: headerCells });

  // Data rows
  const regions = [
    { region: "Americas", country: "USA" },
    { region: "Americas", country: "Canada" },
    { region: "Americas", country: "Brazil" },
    { region: "Europe", country: "UK" },
    { region: "Europe", country: "Germany" },
    { region: "Europe", country: "France" },
    { region: "Asia", country: "Japan" },
    { region: "Asia", country: "China" },
  ];

  regions.forEach((r, idx) => {
    const rowNum = idx + 2;
    const cells: XlsxCell[] = [
      textCell(colIdx(1), rowIdx(rowNum), r.region),
      textCell(colIdx(2), rowIdx(rowNum), r.country),
    ];
    months.forEach((_, i) => {
      cells.push(numCell(colIdx(i + 3), rowIdx(rowNum), Math.floor(Math.random() * 500)));
    });
    rows.push({ rowNumber: rowIdx(rowNum), cells });
  });

  const sheet: XlsxWorksheet = {
    dateSystem: "1900",
    name: "Frozen Cols",
    sheetId: 1,
    state: "visible",
    sheetView: {
      showGridLines: true,
      showRowColHeaders: true,
      pane: {
        xSplit: 2, // Freeze first 2 columns
        ySplit: 0, // No frozen rows
        topLeftCell: "C1",
        activePane: "topRight",
        state: "frozen",
      },
    },
    columns: [
      { min: colIdx(1), max: colIdx(1), width: 12 },
      { min: colIdx(2), max: colIdx(2), width: 12 },
      { min: colIdx(3), max: colIdx(14), width: 8 },
    ],
    rows,
    xmlPath: "xl/worksheets/sheet1.xml",
  };

  return {
    dateSystem: "1900",
    sheets: [sheet],
    styles,
    sharedStrings: [],
  };
}

// =============================================================================
// Test Workbook: Row/Column Sizes
// =============================================================================

function createRowColSizesWorkbook(): XlsxWorkbook {
  const styles = createDefaultStyleSheet();

  const rows: XlsxRow[] = [
    // Row 1: Default height
    {
      rowNumber: rowIdx(1),
      cells: [
        textCell(colIdx(1), rowIdx(1), "Default Height"),
        textCell(colIdx(2), rowIdx(1), "A"),
        textCell(colIdx(3), rowIdx(1), "B"),
        textCell(colIdx(4), rowIdx(1), "C"),
      ],
    },
    // Row 2: Tall row (40pt)
    {
      rowNumber: rowIdx(2),
      height: 40,
      customHeight: true,
      cells: [
        textCell(colIdx(1), rowIdx(2), "Tall (40pt)"),
        textCell(colIdx(2), rowIdx(2), "Data"),
        textCell(colIdx(3), rowIdx(2), "Data"),
        textCell(colIdx(4), rowIdx(2), "Data"),
      ],
    },
    // Row 3: Short row (12pt)
    {
      rowNumber: rowIdx(3),
      height: 12,
      customHeight: true,
      cells: [
        textCell(colIdx(1), rowIdx(3), "Short"),
        textCell(colIdx(2), rowIdx(3), "X"),
        textCell(colIdx(3), rowIdx(3), "Y"),
        textCell(colIdx(4), rowIdx(3), "Z"),
      ],
    },
    // Row 4: Very tall row (60pt)
    {
      rowNumber: rowIdx(4),
      height: 60,
      customHeight: true,
      cells: [
        textCell(colIdx(1), rowIdx(4), "Very Tall (60pt)"),
        numCell(colIdx(2), rowIdx(4), 100),
        numCell(colIdx(3), rowIdx(4), 200),
        numCell(colIdx(4), rowIdx(4), 300),
      ],
    },
    // Row 5-10: Default rows
    ...Array.from({ length: 6 }, (_, i) => ({
      rowNumber: rowIdx(i + 5),
      cells: [
        textCell(colIdx(1), rowIdx(i + 5), `Row ${i + 5}`),
        numCell(colIdx(2), rowIdx(i + 5), (i + 5) * 10),
        numCell(colIdx(3), rowIdx(i + 5), (i + 5) * 20),
        numCell(colIdx(4), rowIdx(i + 5), (i + 5) * 30),
      ],
    })),
  ];

  const sheet: XlsxWorksheet = {
    dateSystem: "1900",
    name: "Row Col Sizes",
    sheetId: 1,
    state: "visible",
    sheetView: { showGridLines: true, showRowColHeaders: true },
    columns: [
      { min: colIdx(1), max: colIdx(1), width: 20 }, // Wide
      { min: colIdx(2), max: colIdx(2), width: 8 },  // Narrow
      { min: colIdx(3), max: colIdx(3), width: 15 }, // Medium
      { min: colIdx(4), max: colIdx(4), width: 25 }, // Extra wide
    ],
    rows,
    xmlPath: "xl/worksheets/sheet1.xml",
  };

  return {
    dateSystem: "1900",
    sheets: [sheet],
    styles,
    sharedStrings: [],
  };
}

// =============================================================================
// Test Workbook: Hidden Rows/Columns
// =============================================================================

function createHiddenRowColWorkbook(): XlsxWorkbook {
  const styles = createDefaultStyleSheet();

  const rows: XlsxRow[] = [
    { rowNumber: rowIdx(1), cells: [textCell(colIdx(1), rowIdx(1), "Row 1"), textCell(colIdx(2), rowIdx(1), "B1"), textCell(colIdx(3), rowIdx(1), "C1"), textCell(colIdx(4), rowIdx(1), "D1"), textCell(colIdx(5), rowIdx(1), "E1")] },
    { rowNumber: rowIdx(2), cells: [textCell(colIdx(1), rowIdx(2), "Row 2"), textCell(colIdx(2), rowIdx(2), "B2"), textCell(colIdx(3), rowIdx(2), "C2"), textCell(colIdx(4), rowIdx(2), "D2"), textCell(colIdx(5), rowIdx(2), "E2")] },
    { rowNumber: rowIdx(3), hidden: true, cells: [textCell(colIdx(1), rowIdx(3), "HIDDEN ROW 3"), textCell(colIdx(2), rowIdx(3), "B3"), textCell(colIdx(3), rowIdx(3), "C3"), textCell(colIdx(4), rowIdx(3), "D3"), textCell(colIdx(5), rowIdx(3), "E3")] },
    { rowNumber: rowIdx(4), cells: [textCell(colIdx(1), rowIdx(4), "Row 4"), textCell(colIdx(2), rowIdx(4), "B4"), textCell(colIdx(3), rowIdx(4), "C4"), textCell(colIdx(4), rowIdx(4), "D4"), textCell(colIdx(5), rowIdx(4), "E4")] },
    { rowNumber: rowIdx(5), hidden: true, cells: [textCell(colIdx(1), rowIdx(5), "HIDDEN ROW 5"), textCell(colIdx(2), rowIdx(5), "B5"), textCell(colIdx(3), rowIdx(5), "C5"), textCell(colIdx(4), rowIdx(5), "D5"), textCell(colIdx(5), rowIdx(5), "E5")] },
    { rowNumber: rowIdx(6), hidden: true, cells: [textCell(colIdx(1), rowIdx(6), "HIDDEN ROW 6"), textCell(colIdx(2), rowIdx(6), "B6"), textCell(colIdx(3), rowIdx(6), "C6"), textCell(colIdx(4), rowIdx(6), "D6"), textCell(colIdx(5), rowIdx(6), "E6")] },
    { rowNumber: rowIdx(7), cells: [textCell(colIdx(1), rowIdx(7), "Row 7"), textCell(colIdx(2), rowIdx(7), "B7"), textCell(colIdx(3), rowIdx(7), "C7"), textCell(colIdx(4), rowIdx(7), "D7"), textCell(colIdx(5), rowIdx(7), "E7")] },
    { rowNumber: rowIdx(8), cells: [textCell(colIdx(1), rowIdx(8), "Row 8"), textCell(colIdx(2), rowIdx(8), "B8"), textCell(colIdx(3), rowIdx(8), "C8"), textCell(colIdx(4), rowIdx(8), "D8"), textCell(colIdx(5), rowIdx(8), "E8")] },
  ];

  const sheet: XlsxWorksheet = {
    dateSystem: "1900",
    name: "Hidden RowCol",
    sheetId: 1,
    state: "visible",
    sheetView: { showGridLines: true, showRowColHeaders: true },
    columns: [
      { min: colIdx(1), max: colIdx(1), width: 15 },
      { min: colIdx(2), max: colIdx(2), width: 10, hidden: true }, // Hidden column B
      { min: colIdx(3), max: colIdx(3), width: 10 },
      { min: colIdx(4), max: colIdx(4), width: 10, hidden: true }, // Hidden column D
      { min: colIdx(5), max: colIdx(5), width: 10 },
    ],
    rows,
    xmlPath: "xl/worksheets/sheet1.xml",
  };

  return {
    dateSystem: "1900",
    sheets: [sheet],
    styles,
    sharedStrings: [],
  };
}

// =============================================================================
// Test Workbook: Cell Formatting (Fonts, Colors, Borders)
// =============================================================================

function createCellFormattingWorkbook(): XlsxWorkbook {
  const styles = createDefaultStyleSheet();

  // Add custom fonts
  const boldFontIdx = styles.fonts.length;
  const redFontIdx = styles.fonts.length + 1;
  const largeFontIdx = styles.fonts.length + 2;
  const italicFontIdx = styles.fonts.length + 3;

  const fonts = [
    ...styles.fonts,
    { name: "Calibri", size: 11, scheme: "minor", bold: true }, // Bold
    { name: "Calibri", size: 11, scheme: "minor", color: { type: "rgb" as const, value: "FFFF0000" } }, // Red
    { name: "Calibri", size: 16, scheme: "minor", bold: true }, // Large
    { name: "Calibri", size: 11, scheme: "minor", italic: true }, // Italic
  ];

  // Add custom fills
  const yellowFillIdx = styles.fills.length;
  const greenFillIdx = styles.fills.length + 1;
  const blueFillIdx = styles.fills.length + 2;

  const fills = [
    ...styles.fills,
    { type: "pattern" as const, pattern: { patternType: "solid" as const, fgColor: { type: "rgb" as const, value: "FFFFFF00" } } }, // Yellow
    { type: "pattern" as const, pattern: { patternType: "solid" as const, fgColor: { type: "rgb" as const, value: "FF90EE90" } } }, // Light green
    { type: "pattern" as const, pattern: { patternType: "solid" as const, fgColor: { type: "rgb" as const, value: "FFADD8E6" } } }, // Light blue
  ];

  // Add custom borders
  const thinBorderIdx = styles.borders.length;
  const thickBorderIdx = styles.borders.length + 1;

  const borders = [
    ...styles.borders,
    { // Thin border all sides
      left: { style: "thin" as const, color: { type: "rgb" as const, value: "FF000000" } },
      right: { style: "thin" as const, color: { type: "rgb" as const, value: "FF000000" } },
      top: { style: "thin" as const, color: { type: "rgb" as const, value: "FF000000" } },
      bottom: { style: "thin" as const, color: { type: "rgb" as const, value: "FF000000" } },
    },
    { // Thick border all sides
      left: { style: "thick" as const, color: { type: "rgb" as const, value: "FF000000" } },
      right: { style: "thick" as const, color: { type: "rgb" as const, value: "FF000000" } },
      top: { style: "thick" as const, color: { type: "rgb" as const, value: "FF000000" } },
      bottom: { style: "thick" as const, color: { type: "rgb" as const, value: "FF000000" } },
    },
  ];

  // Add cell styles
  const cellXfs: readonly XlsxCellXf[] = [
    ...styles.cellXfs,
    { numFmtId: numFmtId(0), fontId: fontId(boldFontIdx), fillId: fillId(0), borderId: borderId(0), applyFont: true }, // 1: Bold
    { numFmtId: numFmtId(0), fontId: fontId(redFontIdx), fillId: fillId(0), borderId: borderId(0), applyFont: true }, // 2: Red text
    { numFmtId: numFmtId(0), fontId: fontId(largeFontIdx), fillId: fillId(0), borderId: borderId(0), applyFont: true }, // 3: Large
    { numFmtId: numFmtId(0), fontId: fontId(italicFontIdx), fillId: fillId(0), borderId: borderId(0), applyFont: true }, // 4: Italic
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(yellowFillIdx), borderId: borderId(0), applyFill: true }, // 5: Yellow fill
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(greenFillIdx), borderId: borderId(0), applyFill: true }, // 6: Green fill
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(blueFillIdx), borderId: borderId(0), applyFill: true }, // 7: Blue fill
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(thinBorderIdx), applyBorder: true }, // 8: Thin border
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(thickBorderIdx), applyBorder: true }, // 9: Thick border
    { numFmtId: numFmtId(0), fontId: fontId(boldFontIdx), fillId: fillId(yellowFillIdx), borderId: borderId(thinBorderIdx), applyFont: true, applyFill: true, applyBorder: true }, // 10: Combined
  ];

  function styledCell(col: ColIndex, row: RowIndex, text: string, style: number): XlsxCell {
    return { address: addr(col, row), value: { type: "string", value: text }, styleId: styleId(style) };
  }

  const rows: XlsxRow[] = [
    { rowNumber: rowIdx(1), cells: [textCell(colIdx(1), rowIdx(1), "Style"), textCell(colIdx(2), rowIdx(1), "Example")] },
    { rowNumber: rowIdx(2), cells: [textCell(colIdx(1), rowIdx(2), "Bold"), styledCell(colIdx(2), rowIdx(2), "Bold Text", 1)] },
    { rowNumber: rowIdx(3), cells: [textCell(colIdx(1), rowIdx(3), "Red"), styledCell(colIdx(2), rowIdx(3), "Red Text", 2)] },
    { rowNumber: rowIdx(4), cells: [textCell(colIdx(1), rowIdx(4), "Large"), styledCell(colIdx(2), rowIdx(4), "Large Text", 3)] },
    { rowNumber: rowIdx(5), cells: [textCell(colIdx(1), rowIdx(5), "Italic"), styledCell(colIdx(2), rowIdx(5), "Italic Text", 4)] },
    { rowNumber: rowIdx(6), cells: [textCell(colIdx(1), rowIdx(6), "Yellow Fill"), styledCell(colIdx(2), rowIdx(6), "Yellow BG", 5)] },
    { rowNumber: rowIdx(7), cells: [textCell(colIdx(1), rowIdx(7), "Green Fill"), styledCell(colIdx(2), rowIdx(7), "Green BG", 6)] },
    { rowNumber: rowIdx(8), cells: [textCell(colIdx(1), rowIdx(8), "Blue Fill"), styledCell(colIdx(2), rowIdx(8), "Blue BG", 7)] },
    { rowNumber: rowIdx(9), cells: [textCell(colIdx(1), rowIdx(9), "Thin Border"), styledCell(colIdx(2), rowIdx(9), "Bordered", 8)] },
    { rowNumber: rowIdx(10), cells: [textCell(colIdx(1), rowIdx(10), "Thick Border"), styledCell(colIdx(2), rowIdx(10), "Thick", 9)] },
    { rowNumber: rowIdx(11), cells: [textCell(colIdx(1), rowIdx(11), "Combined"), styledCell(colIdx(2), rowIdx(11), "Bold+Yellow+Border", 10)] },
  ];

  const sheet: XlsxWorksheet = {
    dateSystem: "1900",
    name: "Cell Formatting",
    sheetId: 1,
    state: "visible",
    sheetView: { showGridLines: true, showRowColHeaders: true },
    columns: [
      { min: colIdx(1), max: colIdx(1), width: 15 },
      { min: colIdx(2), max: colIdx(2), width: 20 },
    ],
    rows,
    xmlPath: "xl/worksheets/sheet1.xml",
  };

  return {
    dateSystem: "1900",
    sheets: [sheet],
    styles: { ...styles, fonts, fills, borders, cellXfs },
    sharedStrings: [],
  };
}

// =============================================================================
// Test Workbook: Merge Cells
// =============================================================================

function createMergeCellsWorkbook(): XlsxWorkbook {
  const styles = createDefaultStyleSheet();

  // Helper to create cell range for merge
  function mergeRange(startCol: ColIndex, startRow: RowIndex, endCol: ColIndex, endRow: RowIndex) {
    return {
      start: addr(startCol, startRow),
      end: addr(endCol, endRow),
    };
  }

  const rows: XlsxRow[] = [
    // Row 1: Header merged across columns
    { rowNumber: rowIdx(1), cells: [textCell(colIdx(1), rowIdx(1), "Merged Header A1:D1")] },
    // Row 2: Individual cells
    { rowNumber: rowIdx(2), cells: [textCell(colIdx(1), rowIdx(2), "A2"), textCell(colIdx(2), rowIdx(2), "B2"), textCell(colIdx(3), rowIdx(2), "C2"), textCell(colIdx(4), rowIdx(2), "D2")] },
    // Row 3-4: Vertical merge
    { rowNumber: rowIdx(3), cells: [textCell(colIdx(1), rowIdx(3), "Vertical A3:A4"), textCell(colIdx(2), rowIdx(3), "B3"), textCell(colIdx(3), rowIdx(3), "C3"), textCell(colIdx(4), rowIdx(3), "D3")] },
    { rowNumber: rowIdx(4), cells: [textCell(colIdx(2), rowIdx(4), "B4"), textCell(colIdx(3), rowIdx(4), "C4"), textCell(colIdx(4), rowIdx(4), "D4")] },
    // Row 5: Another row
    { rowNumber: rowIdx(5), cells: [textCell(colIdx(1), rowIdx(5), "A5"), textCell(colIdx(2), rowIdx(5), "B5"), textCell(colIdx(3), rowIdx(5), "C5"), textCell(colIdx(4), rowIdx(5), "D5")] },
    // Row 6-8: 2x2 merge
    { rowNumber: rowIdx(6), cells: [textCell(colIdx(1), rowIdx(6), "A6"), textCell(colIdx(2), rowIdx(6), "2x2 Merge B6:C7"), textCell(colIdx(4), rowIdx(6), "D6")] },
    { rowNumber: rowIdx(7), cells: [textCell(colIdx(1), rowIdx(7), "A7"), textCell(colIdx(4), rowIdx(7), "D7")] },
    { rowNumber: rowIdx(8), cells: [textCell(colIdx(1), rowIdx(8), "A8"), textCell(colIdx(2), rowIdx(8), "B8"), textCell(colIdx(3), rowIdx(8), "C8"), textCell(colIdx(4), rowIdx(8), "D8")] },
  ];

  const sheet: XlsxWorksheet = {
    dateSystem: "1900",
    name: "Merge Cells",
    sheetId: 1,
    state: "visible",
    sheetView: { showGridLines: true, showRowColHeaders: true },
    columns: [
      { min: colIdx(1), max: colIdx(4), width: 15 },
    ],
    rows,
    mergeCells: [
      mergeRange(colIdx(1), rowIdx(1), colIdx(4), rowIdx(1)), // A1:D1 - Horizontal merge
      mergeRange(colIdx(1), rowIdx(3), colIdx(1), rowIdx(4)), // A3:A4 - Vertical merge
      mergeRange(colIdx(2), rowIdx(6), colIdx(3), rowIdx(7)), // B6:C7 - 2x2 merge
    ],
    xmlPath: "xl/worksheets/sheet1.xml",
  };

  return {
    dateSystem: "1900",
    sheets: [sheet],
    styles,
    sharedStrings: [],
  };
}

// =============================================================================
// Test Workbook: Number Formats
// =============================================================================

function createNumberFormatsWorkbook(): XlsxWorkbook {
  const styles = createDefaultStyleSheet();

  // Add custom number formats
  const numFmts = [
    { numFmtId: 164, formatCode: "#,##0.00" }, // Thousands with 2 decimals
    { numFmtId: 165, formatCode: "0.00%" }, // Percentage
    { numFmtId: 166, formatCode: "$#,##0.00" }, // Currency
    { numFmtId: 167, formatCode: "yyyy-mm-dd" }, // Date
    { numFmtId: 168, formatCode: "0.000" }, // 3 decimals
  ];

  const cellXfs: readonly XlsxCellXf[] = [
    ...styles.cellXfs,
    { numFmtId: numFmtId(164), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0), applyNumberFormat: true }, // 1: Thousands
    { numFmtId: numFmtId(165), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0), applyNumberFormat: true }, // 2: Percentage
    { numFmtId: numFmtId(166), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0), applyNumberFormat: true }, // 3: Currency
    { numFmtId: numFmtId(167), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0), applyNumberFormat: true }, // 4: Date
    { numFmtId: numFmtId(168), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0), applyNumberFormat: true }, // 5: 3 decimals
  ];

  function numStyledCell(col: ColIndex, row: RowIndex, num: number, style: number): XlsxCell {
    return { address: addr(col, row), value: { type: "number", value: num }, styleId: styleId(style) };
  }

  const rows: XlsxRow[] = [
    { rowNumber: rowIdx(1), cells: [textCell(colIdx(1), rowIdx(1), "Format"), textCell(colIdx(2), rowIdx(1), "Value"), textCell(colIdx(3), rowIdx(1), "Formatted")] },
    { rowNumber: rowIdx(2), cells: [textCell(colIdx(1), rowIdx(2), "Default"), numCell(colIdx(2), rowIdx(2), 1234567.89), numCell(colIdx(3), rowIdx(2), 1234567.89)] },
    { rowNumber: rowIdx(3), cells: [textCell(colIdx(1), rowIdx(3), "Thousands"), numCell(colIdx(2), rowIdx(3), 1234567.89), numStyledCell(colIdx(3), rowIdx(3), 1234567.89, 1)] },
    { rowNumber: rowIdx(4), cells: [textCell(colIdx(1), rowIdx(4), "Percentage"), numCell(colIdx(2), rowIdx(4), 0.1234), numStyledCell(colIdx(3), rowIdx(4), 0.1234, 2)] },
    { rowNumber: rowIdx(5), cells: [textCell(colIdx(1), rowIdx(5), "Currency"), numCell(colIdx(2), rowIdx(5), 1234.56), numStyledCell(colIdx(3), rowIdx(5), 1234.56, 3)] },
    { rowNumber: rowIdx(6), cells: [textCell(colIdx(1), rowIdx(6), "Date"), numCell(colIdx(2), rowIdx(6), 45302), numStyledCell(colIdx(3), rowIdx(6), 45302, 4)] }, // 2024-01-15
    { rowNumber: rowIdx(7), cells: [textCell(colIdx(1), rowIdx(7), "3 Decimals"), numCell(colIdx(2), rowIdx(7), 3.14159), numStyledCell(colIdx(3), rowIdx(7), 3.14159, 5)] },
  ];

  const sheet: XlsxWorksheet = {
    dateSystem: "1900",
    name: "Number Formats",
    sheetId: 1,
    state: "visible",
    sheetView: { showGridLines: true, showRowColHeaders: true },
    columns: [
      { min: colIdx(1), max: colIdx(1), width: 15 },
      { min: colIdx(2), max: colIdx(2), width: 15 },
      { min: colIdx(3), max: colIdx(3), width: 20 },
    ],
    rows,
    xmlPath: "xl/worksheets/sheet1.xml",
  };

  return {
    dateSystem: "1900",
    sheets: [sheet],
    styles: { ...styles, numFmts, cellXfs },
    sharedStrings: [],
  };
}

// =============================================================================
// Test Workbook: Text Alignment
// =============================================================================

function createTextAlignmentWorkbook(): XlsxWorkbook {
  const styles = createDefaultStyleSheet();

  // Add alignment styles
  const cellXfs: readonly XlsxCellXf[] = [
    ...styles.cellXfs,
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0), applyAlignment: true, alignment: { horizontal: "left" } }, // 1: Left
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0), applyAlignment: true, alignment: { horizontal: "center" } }, // 2: Center
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0), applyAlignment: true, alignment: { horizontal: "right" } }, // 3: Right
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0), applyAlignment: true, alignment: { vertical: "top" } }, // 4: Top
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0), applyAlignment: true, alignment: { vertical: "center" } }, // 5: Middle
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0), applyAlignment: true, alignment: { vertical: "bottom" } }, // 6: Bottom
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0), applyAlignment: true, alignment: { wrapText: true } }, // 7: Wrap
  ];

  function alignedCell(col: ColIndex, row: RowIndex, text: string, style: number): XlsxCell {
    return { address: addr(col, row), value: { type: "string", value: text }, styleId: styleId(style) };
  }

  const rows: XlsxRow[] = [
    { rowNumber: rowIdx(1), cells: [textCell(colIdx(1), rowIdx(1), "Alignment"), textCell(colIdx(2), rowIdx(1), "Example")] },
    { rowNumber: rowIdx(2), cells: [textCell(colIdx(1), rowIdx(2), "Left"), alignedCell(colIdx(2), rowIdx(2), "Left aligned", 1)] },
    { rowNumber: rowIdx(3), cells: [textCell(colIdx(1), rowIdx(3), "Center"), alignedCell(colIdx(2), rowIdx(3), "Center aligned", 2)] },
    { rowNumber: rowIdx(4), cells: [textCell(colIdx(1), rowIdx(4), "Right"), alignedCell(colIdx(2), rowIdx(4), "Right aligned", 3)] },
    { rowNumber: rowIdx(5), height: 40, customHeight: true, cells: [textCell(colIdx(1), rowIdx(5), "Top"), alignedCell(colIdx(2), rowIdx(5), "Top", 4)] },
    { rowNumber: rowIdx(6), height: 40, customHeight: true, cells: [textCell(colIdx(1), rowIdx(6), "Middle"), alignedCell(colIdx(2), rowIdx(6), "Middle", 5)] },
    { rowNumber: rowIdx(7), height: 40, customHeight: true, cells: [textCell(colIdx(1), rowIdx(7), "Bottom"), alignedCell(colIdx(2), rowIdx(7), "Bottom", 6)] },
    { rowNumber: rowIdx(8), height: 60, customHeight: true, cells: [textCell(colIdx(1), rowIdx(8), "Wrap Text"), alignedCell(colIdx(2), rowIdx(8), "This is a long text that should wrap to multiple lines", 7)] },
  ];

  const sheet: XlsxWorksheet = {
    dateSystem: "1900",
    name: "Text Alignment",
    sheetId: 1,
    state: "visible",
    sheetView: { showGridLines: true, showRowColHeaders: true },
    columns: [
      { min: colIdx(1), max: colIdx(1), width: 15 },
      { min: colIdx(2), max: colIdx(2), width: 25 },
    ],
    rows,
    xmlPath: "xl/worksheets/sheet1.xml",
  };

  return {
    dateSystem: "1900",
    sheets: [sheet],
    styles: { ...styles, cellXfs },
    sharedStrings: [],
  };
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const fixturesDir = path.resolve(__dirname, "../fixtures/visual");
  const xlsxDir = path.join(fixturesDir, "xlsx");
  const baselineDir = path.join(fixturesDir, "baseline");

  // Ensure directories exist
  if (!fs.existsSync(xlsxDir)) {
    fs.mkdirSync(xlsxDir, { recursive: true });
  }
  if (!fs.existsSync(baselineDir)) {
    fs.mkdirSync(baselineDir, { recursive: true });
  }

  // Generate workbooks
  const workbooks = [
    // Frozen panes
    { name: "frozen-panes", workbook: createFrozenPanesWorkbook() },
    { name: "frozen-rows", workbook: createFrozenRowsWorkbook() },
    { name: "frozen-cols", workbook: createFrozenColsWorkbook() },
    // Row/Column sizing
    { name: "row-col-sizes", workbook: createRowColSizesWorkbook() },
    // Hidden rows/columns
    { name: "hidden-rowcol", workbook: createHiddenRowColWorkbook() },
    // Cell formatting
    { name: "cell-formatting", workbook: createCellFormattingWorkbook() },
    // Merge cells
    { name: "merge-cells", workbook: createMergeCellsWorkbook() },
    // Number formats
    { name: "number-formats", workbook: createNumberFormatsWorkbook() },
    // Text alignment
    { name: "text-alignment", workbook: createTextAlignmentWorkbook() },
  ];

  console.log("Generating XLSX fixtures for visual regression testing...\n");

  for (const { name, workbook } of workbooks) {
    const xlsxPath = path.join(xlsxDir, `${name}.xlsx`);
    const bytes = await exportXlsx(workbook);
    fs.writeFileSync(xlsxPath, Buffer.from(bytes));
    console.log(`  Created: ${xlsxPath}`);
  }

  // Also export workbook JSON for test consumption
  const jsonDir = path.join(fixturesDir, "json");
  if (!fs.existsSync(jsonDir)) {
    fs.mkdirSync(jsonDir, { recursive: true });
  }

  for (const { name, workbook } of workbooks) {
    const jsonPath = path.join(jsonDir, `${name}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(workbook, null, 2));
    console.log(`  Created: ${jsonPath}`);
  }

  console.log(`
========================================
BASELINE GENERATION INSTRUCTIONS
========================================

To generate LibreOffice Calc baseline screenshots:

1. Open each XLSX file in LibreOffice Calc:
   ${xlsxDir}/*.xlsx

2. For each file, set the window size to 800x600 pixels

3. Scroll to position (0, 0) - top-left corner

4. Take a screenshot of the spreadsheet area (including headers)

5. Save as PNG to:
   ${baselineDir}/<name>.png

   For example:
   - frozen-panes.png
   - frozen-rows.png
   - frozen-cols.png

6. For scrolled tests, scroll down/right and capture:
   - frozen-panes_scrolled.png (scroll to row 15, col C)
   - frozen-rows_scrolled.png (scroll to row 10)
   - frozen-cols_scrolled.png (scroll to col H)

Alternatively, use ImageMagick with LibreOffice headless:
   soffice --headless --convert-to pdf ${xlsxDir}/frozen-panes.xlsx
   convert -density 150 frozen-panes.pdf frozen-panes.png

========================================
`);
}

main().catch(console.error);
