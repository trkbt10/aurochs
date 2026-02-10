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
