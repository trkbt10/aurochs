/**
 * @file Formatting handlers tests
 */

import { EXCEL_MAX_COLS } from "@oxen/xlsx/domain/constants";
import type { CellRange } from "@oxen/xlsx/domain/cell/address";
import type { XlsxWorkbook, XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import { createDefaultStyleSheet } from "@oxen/xlsx/domain/style/types";
import { colIdx, rowIdx, styleId } from "@oxen/xlsx/domain/types";
import { createInitialState, xlsxEditorReducer } from "./index";

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

function wholeRowRange(row: number): CellRange {
  return {
    start: { col: colIdx(1), row: rowIdx(row), colAbsolute: false, rowAbsolute: false },
    end: { col: colIdx(EXCEL_MAX_COLS), row: rowIdx(row), colAbsolute: false, rowAbsolute: false },
  };
}

function range(startCol: number, startRow: number, endCol: number, endRow: number): CellRange {
  return {
    start: { col: colIdx(startCol), row: rowIdx(startRow), colAbsolute: false, rowAbsolute: false },
    end: { col: colIdx(endCol), row: rowIdx(endRow), colAbsolute: false, rowAbsolute: false },
  };
}

describe("xlsx-editor/context/workbook/editor/reducer/formatting-handlers", () => {
  it("APPLY_STYLE applies styleId to the active sheet and records history", () => {
    const workbook = createWorkbook([createWorksheet("Sheet1", 1)]);
    // eslint-disable-next-line no-restricted-syntax -- test requires sequential state updates
    let state = createInitialState(workbook);

    state = xlsxEditorReducer(state, {
      type: "APPLY_STYLE",
      range: wholeRowRange(3),
      styleId: styleId(9),
    });

    expect(state.workbookHistory.past).toHaveLength(1);
    const sheet = state.workbookHistory.present.sheets[0]!;
    expect(sheet.rows).toEqual([{ rowNumber: rowIdx(3), cells: [], styleId: styleId(9) }]);
  });

  it("SET_SELECTION_FORMAT creates a new styleId and applies it to the range", () => {
    const workbook = createWorkbook([createWorksheet("Sheet1", 1)]);
    // eslint-disable-next-line no-restricted-syntax -- test requires sequential state updates
    let state = createInitialState(workbook);

    const baseFont = workbook.styles.fonts[0]!;
    state = xlsxEditorReducer(state, {
      type: "SET_SELECTION_FORMAT",
      range: range(1, 1, 1, 1),
      format: {
        font: { ...baseFont, bold: true },
      },
    });

    expect(state.workbookHistory.past).toHaveLength(1);
    expect(state.workbookHistory.present.styles.fonts).toHaveLength(2);
    expect(state.workbookHistory.present.styles.cellXfs).toHaveLength(2);

    const sheet = state.workbookHistory.present.sheets[0]!;
    expect(sheet.rows).toEqual([
      {
        rowNumber: rowIdx(1),
        cells: [
          {
            address: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
            value: { type: "empty" },
            styleId: styleId(1),
          },
        ],
      },
    ]);
  });

  it("MERGE_CELLS adds a mergeCells range", () => {
    const workbook = createWorkbook([createWorksheet("Sheet1", 1)]);
    // eslint-disable-next-line no-restricted-syntax -- test requires sequential state updates
    let state = createInitialState(workbook);

    state = xlsxEditorReducer(state, { type: "MERGE_CELLS", range: range(2, 2, 1, 1) });

    const sheet = state.workbookHistory.present.sheets[0]!;
    expect(sheet.mergeCells).toEqual([range(1, 1, 2, 2)]);
  });

  it("UNMERGE_CELLS removes intersecting merges", () => {
    const workbook = createWorkbook([
      {
        ...createWorksheet("Sheet1", 1),
        mergeCells: [range(1, 1, 2, 2)],
      },
    ]);
    // eslint-disable-next-line no-restricted-syntax -- test requires sequential state updates
    let state = createInitialState(workbook);

    state = xlsxEditorReducer(state, { type: "UNMERGE_CELLS", range: range(2, 2, 3, 3) });

    const sheet = state.workbookHistory.present.sheets[0]!;
    expect(sheet.mergeCells).toBeUndefined();
  });
});
