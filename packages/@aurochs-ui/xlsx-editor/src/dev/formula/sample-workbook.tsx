/**
 * @file Formula sample workbook builder
 *
 * Provides an in-memory workbook used by the formula catalog pages.
 */

import type { CellAddress } from "@aurochs-office/xlsx/domain/cell/address";
import type { Cell } from "@aurochs-office/xlsx/domain/cell/types";
import { colIdx, rowIdx } from "@aurochs-office/xlsx/domain/types";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import { createDefaultStyleSheet } from "@aurochs-office/xlsx/domain/style/types";

/**
 * Default evaluation origin (A1) used by the formula catalog page.
 */
export const DEFAULT_ORIGIN: CellAddress = { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false };

/**
 * Create a small workbook with deterministic values used for function sample evaluation.
 */
export function createFormulaSampleWorkbook(): XlsxWorkbook {
  const styles = createDefaultStyleSheet();

  const rows = Array.from({ length: 10 }, (_, idx) => {
    const r = idx + 1;
    const cells: Cell[] = [
      {
        address: { col: colIdx(1), row: rowIdx(r), colAbsolute: false, rowAbsolute: false },
        value: { type: "number" as const, value: r }, // A{r}
      },
    ];

    if (r === 1) {
      cells.push(
        {
          address: { col: colIdx(2), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
          value: { type: "number" as const, value: 20 },
        }, // B1
        {
          address: { col: colIdx(3), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
          value: { type: "string" as const, value: "Text" },
        }, // C1
        {
          address: { col: colIdx(4), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
          value: { type: "boolean" as const, value: true },
        }, // D1
      );
    }

    if (r === 2) {
      cells.push(
        {
          address: { col: colIdx(2), row: rowIdx(2), colAbsolute: false, rowAbsolute: false },
          value: { type: "number" as const, value: 2 },
        }, // B2
        {
          address: { col: colIdx(3), row: rowIdx(2), colAbsolute: false, rowAbsolute: false },
          value: { type: "string" as const, value: "Cat" },
        }, // C2
      );
    }

    return { rowNumber: rowIdx(r), cells };
  });

  return {
    dateSystem: "1900",
    sheets: [
      {
        dateSystem: "1900",
        name: "Sheet1",
        sheetId: 1,
        state: "visible",
        sheetView: { showGridLines: true, showRowColHeaders: true },
        rows,
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
            cells: [
              {
                address: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
                value: { type: "number" as const, value: 41 },
              },
            ],
          },
        ],
        xmlPath: "xl/worksheets/sheet2.xml",
      },
    ],
    styles,
    sharedStrings: [],
  };
}
