/**
 * @file Demo XLSX workbook for the editor page.
 */

import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import { createDefaultStyleSheet, type XlsxCellXf } from "@aurochs-office/xlsx/domain/style/types";
import {
  borderId,
  colIdx,
  fillId,
  fontId,
  numFmtId,
  rowIdx,
  styleId,
  type ColIndex,
  type RowIndex,
} from "@aurochs-office/xlsx/domain/types";
import type { CellAddress } from "@aurochs-office/xlsx/domain/cell/address";
import type { Formula } from "@aurochs-office/xlsx/domain/cell/formula";

function createAddress(col: ColIndex, row: RowIndex): CellAddress {
  return { col, row, colAbsolute: false, rowAbsolute: false };
}

function createNormalFormula(expression: string): Formula {
  return { type: "normal", expression };
}

export function createDemoWorkbook(): XlsxWorkbook {
  const styles = createDefaultStyleSheet();

  const redBoldFontIndex = styles.fonts.length;
  const yellowFillIndex = styles.fills.length;
  const thinBorderIndex = styles.borders.length;

  const cellXfs: readonly XlsxCellXf[] = [
    ...styles.cellXfs,
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(yellowFillIndex), borderId: borderId(0), applyFill: true },
    { numFmtId: numFmtId(0), fontId: fontId(redBoldFontIndex), fillId: fillId(0), borderId: borderId(0), applyFont: true },
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(thinBorderIndex), applyBorder: true },
  ];

  return {
    dateSystem: "1900",
    sheets: [
      {
        dateSystem: "1900",
        name: "Sheet1",
        sheetId: 1,
        state: "visible",
        sheetView: { showGridLines: true, showRowColHeaders: true },
        rows: [
          {
            rowNumber: rowIdx(1),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(1)), value: { type: "number", value: 10 }, styleId: styleId(1) },
              { address: createAddress(colIdx(2), rowIdx(1)), value: { type: "number", value: 20 }, styleId: styleId(2) },
              { address: createAddress(colIdx(3), rowIdx(1)), value: { type: "empty" }, formula: createNormalFormula("A1+B1"), styleId: styleId(3) },
            ],
          },
          {
            rowNumber: rowIdx(2),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(2)), value: { type: "number", value: 1 } },
              { address: createAddress(colIdx(2), rowIdx(2)), value: { type: "empty" }, formula: createNormalFormula('IF(A2>0,"OK","NG")') },
              { address: createAddress(colIdx(3), rowIdx(2)), value: { type: "empty" }, formula: createNormalFormula("SUM(A1:B1)") },
            ],
          },
          {
            rowNumber: rowIdx(3),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(3)), value: { type: "string", value: "Hello" } },
              { address: createAddress(colIdx(2), rowIdx(3)), value: { type: "boolean", value: true } },
              { address: createAddress(colIdx(3), rowIdx(3)), value: { type: "date", value: new Date("2024-01-15") } },
            ],
          },
        ],
        xmlPath: "xl/worksheets/sheet1.xml",
      },
      {
        dateSystem: "1900",
        name: "Sheet2",
        sheetId: 2,
        state: "visible",
        sheetView: { showGridLines: true, showRowColHeaders: true },
        rows: [
          {
            rowNumber: rowIdx(1),
            cells: [{ address: createAddress(colIdx(1), rowIdx(1)), value: { type: "number", value: 42 } }],
          },
        ],
        xmlPath: "xl/worksheets/sheet2.xml",
      },
      // Layout Demo sheet - demonstrates Row/Column sizing, hidden rows/cols, outline grouping, and freeze panes
      {
        dateSystem: "1900",
        name: "Layout Demo",
        sheetId: 3,
        state: "visible",
        sheetView: {
          showGridLines: true,
          showRowColHeaders: true,
          // Freeze first row (header) - like Excel's "Freeze Top Row"
          pane: {
            ySplit: 1, // Freeze 1 row
            xSplit: 1, // Freeze 1 column
            topLeftCell: "B2",
            activePane: "bottomRight",
            state: "frozen",
          },
        },
        // Custom column widths
        columns: [
          { min: colIdx(1), max: colIdx(1), width: 20 }, // Wide column A
          { min: colIdx(2), max: colIdx(2), width: 8 },  // Narrow column B
          { min: colIdx(3), max: colIdx(3), width: 15 }, // Medium column C
          { min: colIdx(4), max: colIdx(4), width: 12, hidden: true }, // Hidden column D
          { min: colIdx(5), max: colIdx(5), width: 12 }, // Column E
          { min: colIdx(6), max: colIdx(7), width: 10, outlineLevel: 1 }, // Grouped columns F-G (level 1)
          { min: colIdx(8), max: colIdx(8), width: 10, outlineLevel: 2 }, // Nested group column H (level 2)
        ],
        rows: [
          // Row 1: Header row with custom height
          {
            rowNumber: rowIdx(1),
            height: 30,
            customHeight: true,
            cells: [
              { address: createAddress(colIdx(1), rowIdx(1)), value: { type: "string", value: "Wide Column" } },
              { address: createAddress(colIdx(2), rowIdx(1)), value: { type: "string", value: "Narrow" } },
              { address: createAddress(colIdx(3), rowIdx(1)), value: { type: "string", value: "Medium" } },
              { address: createAddress(colIdx(4), rowIdx(1)), value: { type: "string", value: "Hidden D" } },
              { address: createAddress(colIdx(5), rowIdx(1)), value: { type: "string", value: "Col E" } },
              { address: createAddress(colIdx(6), rowIdx(1)), value: { type: "string", value: "Group L1" } },
              { address: createAddress(colIdx(7), rowIdx(1)), value: { type: "string", value: "Group L1" } },
              { address: createAddress(colIdx(8), rowIdx(1)), value: { type: "string", value: "Group L2" } },
            ],
          },
          // Row 2: Normal row
          {
            rowNumber: rowIdx(2),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(2)), value: { type: "number", value: 100 } },
              { address: createAddress(colIdx(2), rowIdx(2)), value: { type: "number", value: 200 } },
              { address: createAddress(colIdx(3), rowIdx(2)), value: { type: "number", value: 300 } },
              { address: createAddress(colIdx(4), rowIdx(2)), value: { type: "number", value: 400 } },
              { address: createAddress(colIdx(5), rowIdx(2)), value: { type: "number", value: 500 } },
              { address: createAddress(colIdx(6), rowIdx(2)), value: { type: "number", value: 600 } },
              { address: createAddress(colIdx(7), rowIdx(2)), value: { type: "number", value: 700 } },
              { address: createAddress(colIdx(8), rowIdx(2)), value: { type: "number", value: 800 } },
            ],
          },
          // Row 3: Grouped row (outline level 1)
          {
            rowNumber: rowIdx(3),
            outlineLevel: 1,
            cells: [
              { address: createAddress(colIdx(1), rowIdx(3)), value: { type: "string", value: "Row Group L1" } },
              { address: createAddress(colIdx(2), rowIdx(3)), value: { type: "number", value: 10 } },
              { address: createAddress(colIdx(3), rowIdx(3)), value: { type: "number", value: 20 } },
            ],
          },
          // Row 4: Grouped row (outline level 1)
          {
            rowNumber: rowIdx(4),
            outlineLevel: 1,
            cells: [
              { address: createAddress(colIdx(1), rowIdx(4)), value: { type: "string", value: "Row Group L1" } },
              { address: createAddress(colIdx(2), rowIdx(4)), value: { type: "number", value: 30 } },
              { address: createAddress(colIdx(3), rowIdx(4)), value: { type: "number", value: 40 } },
            ],
          },
          // Row 5: Nested group (outline level 2)
          {
            rowNumber: rowIdx(5),
            outlineLevel: 2,
            cells: [
              { address: createAddress(colIdx(1), rowIdx(5)), value: { type: "string", value: "Row Group L2 (nested)" } },
              { address: createAddress(colIdx(2), rowIdx(5)), value: { type: "number", value: 50 } },
              { address: createAddress(colIdx(3), rowIdx(5)), value: { type: "number", value: 60 } },
            ],
          },
          // Row 6: Hidden row
          {
            rowNumber: rowIdx(6),
            hidden: true,
            cells: [
              { address: createAddress(colIdx(1), rowIdx(6)), value: { type: "string", value: "Hidden Row" } },
              { address: createAddress(colIdx(2), rowIdx(6)), value: { type: "number", value: 999 } },
            ],
          },
          // Row 7: Tall row
          {
            rowNumber: rowIdx(7),
            height: 50,
            customHeight: true,
            cells: [
              { address: createAddress(colIdx(1), rowIdx(7)), value: { type: "string", value: "Tall Row (50pt)" } },
              { address: createAddress(colIdx(2), rowIdx(7)), value: { type: "string", value: "More content" } },
            ],
          },
          // Row 8: Short row
          {
            rowNumber: rowIdx(8),
            height: 12,
            customHeight: true,
            cells: [
              { address: createAddress(colIdx(1), rowIdx(8)), value: { type: "string", value: "Short (12pt)" } },
            ],
          },
        ],
        xmlPath: "xl/worksheets/sheet3.xml",
      },
    ],
    styles: {
      ...styles,
      fonts: [
        ...styles.fonts,
        { name: "Calibri", size: 11, scheme: "minor", bold: true, color: { type: "rgb", value: "FFFF0000" } },
      ],
      fills: [
        ...styles.fills,
        { type: "pattern", pattern: { patternType: "solid", fgColor: { type: "rgb", value: "FFFFFF00" } } },
      ],
      borders: [
        ...styles.borders,
        {
          left: { style: "thin", color: { type: "rgb", value: "FF000000" } },
          right: { style: "thin", color: { type: "rgb", value: "FF000000" } },
          top: { style: "thin", color: { type: "rgb", value: "FF000000" } },
          bottom: { style: "thin", color: { type: "rgb", value: "FF000000" } },
        },
      ],
      cellXfs,
    },
    sharedStrings: [],
  };
}
