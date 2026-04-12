/**
 * @file Row/column handlers tests
 */

import type { XlsxWorkbook, XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import type { CellAddress } from "@aurochs-office/xlsx/domain/cell/address";
import { createDefaultStyleSheet } from "@aurochs-office/xlsx/domain/style/types";
import { colIdx, rowIdx, sheetId } from "@aurochs-office/xlsx/domain/types";
import { getCellValue } from "@aurochs-office/xlsx/domain/mutation/query";
import { createInitialState, xlsxEditorReducer } from "./index";

function addr(col: number, row: number): CellAddress {
  return {
    col: colIdx(col),
    row: rowIdx(row),
    colAbsolute: false,
    rowAbsolute: false,
  };
}

function createWorksheet(name: string, id: number): XlsxWorksheet {
  return {
    dateSystem: "1900",
    name,
    sheetId: sheetId(id),
    state: "visible",
    xmlPath: `xl/worksheets/sheet${id}.xml`,
    rows: [],
  };
}

function createWorkbook(sheets: readonly XlsxWorksheet[]): XlsxWorkbook {
  return {
    dateSystem: "1900",
    sheets,
    styles: createDefaultStyleSheet(),
    sharedStrings: [],
  };
}

describe("xlsx-editor/context/workbook/editor/reducer/row-col-handlers", () => {
  it("INSERT_ROWS shifts cell addresses in the active worksheet and pushes history", () => {
    const sheet: XlsxWorksheet = {
      ...createWorksheet("Sheet1", 1),
      rows: [
        {
          rowNumber: rowIdx(3),
          cells: [
            {
              address: addr(1, 3),
              value: { type: "string", value: "A3" },
            },
          ],
        },
      ],
    };

    const workbook = createWorkbook([sheet]);
    // eslint-disable-next-line no-restricted-syntax -- test requires sequential state updates
    let state = createInitialState(workbook);

    state = xlsxEditorReducer(state, { type: "INSERT_ROWS", startRow: rowIdx(2), count: 2 });

    expect(state.workbookHistory.past).toHaveLength(1);
    const nextSheet = state.workbookHistory.present.sheets[0];
    expect(getCellValue(nextSheet, addr(1, 3))).toBeUndefined();
    expect(getCellValue(nextSheet, addr(1, 5))).toEqual({ type: "string", value: "A3" });
  });
});
