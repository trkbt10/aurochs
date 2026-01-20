import type { CellAddress } from "@lib/xlsx/domain/cell/address";
import { colIdx, rowIdx } from "@lib/xlsx/domain/types";
import type { XlsxWorkbook } from "@lib/xlsx/domain/workbook";
import { createDefaultStyleSheet } from "@lib/xlsx/domain/style/types";

export const DEFAULT_ORIGIN: CellAddress = { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false };

export function createFormulaSampleWorkbook(): XlsxWorkbook {
  const styles = createDefaultStyleSheet();

  const rows = Array.from({ length: 10 }, (_, idx) => {
    const r = idx + 1;
    const cells = [
      {
        address: { col: colIdx(1), row: rowIdx(r), colAbsolute: false, rowAbsolute: false },
        value: { type: "number" as const, value: r }, // A{r}
      },
    ];

    if (r === 1) {
      cells.push(
        { address: { col: colIdx(2), row: rowIdx(1), colAbsolute: false, rowAbsolute: false }, value: { type: "number" as const, value: 20 } }, // B1
        { address: { col: colIdx(3), row: rowIdx(1), colAbsolute: false, rowAbsolute: false }, value: { type: "string" as const, value: "Text" } }, // C1
        { address: { col: colIdx(4), row: rowIdx(1), colAbsolute: false, rowAbsolute: false }, value: { type: "boolean" as const, value: true } }, // D1
      );
    }

    if (r === 2) {
      cells.push(
        { address: { col: colIdx(2), row: rowIdx(2), colAbsolute: false, rowAbsolute: false }, value: { type: "number" as const, value: 2 } }, // B2
        { address: { col: colIdx(3), row: rowIdx(2), colAbsolute: false, rowAbsolute: false }, value: { type: "string" as const, value: "Cat" } }, // C2
      );
    }

    return { rowNumber: rowIdx(r), cells };
  });

  return {
    sheets: [
      {
        name: "Sheet1",
        sheetId: 1,
        state: "visible",
        sheetView: { showGridLines: true, showRowColHeaders: true },
        rows,
        xmlPath: "xl/worksheets/sheet1.xml",
      },
      {
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

