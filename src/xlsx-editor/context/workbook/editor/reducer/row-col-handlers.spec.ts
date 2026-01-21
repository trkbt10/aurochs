/**
 * @file Row/column handlers tests
 */

import type { XlsxWorkbook, XlsxWorksheet } from "../../../../../xlsx/domain/workbook";
import type { CellAddress } from "../../../../../xlsx/domain/cell/address";
import { createDefaultStyleSheet } from "../../../../../xlsx/domain/style/types";
import { colIdx, rowIdx } from "../../../../../xlsx/domain/types";
import { getCellValue } from "../../../../cell/query";
import { createInitialState, xlsxEditorReducer } from "./index";

function addr(col: number, row: number): CellAddress {
  return {
    col: colIdx(col),
    row: rowIdx(row),
    colAbsolute: false,
    rowAbsolute: false,
  };
}

function createWorksheet(name: string, sheetId: number): XlsxWorksheet {
  return {
    dateSystem: "1900",
    name,
    sheetId,
    state: "visible",
    xmlPath: `xl/worksheets/sheet${sheetId}.xml`,
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
