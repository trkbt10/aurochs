/**
 * @file Clipboard handlers tests
 */

import type { XlsxWorkbook, XlsxWorksheet, XlsxRow } from "@aurochs-office/xlsx/domain/workbook";
import type { Cell, CellValue } from "@aurochs-office/xlsx/domain/cell/types";
import type { CellAddress, CellRange } from "@aurochs-office/xlsx/domain/cell/address";
import { colIdx, rowIdx, styleId } from "@aurochs-office/xlsx/domain/types";
import { createDefaultStyleSheet } from "@aurochs-office/xlsx/domain/style/types";
import { getCell, getCellValue } from "../../../../cell/query";
import { createHistory } from "@aurochs-ui/editor-core/history";
import { createRangeSelection } from "../../state/selection";
import { createIdleDragState } from "../types";
import type { XlsxEditorState } from "../types";
import { clipboardHandlers } from "./clipboard-handlers";

function addr(col: number, row: number): CellAddress {
  return {
    col: colIdx(col),
    row: rowIdx(row),
    colAbsolute: false,
    rowAbsolute: false,
  };
}

function range({
  startCol,
  startRow,
  endCol,
  endRow,
}: {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
}): CellRange {
  return {
    start: addr(startCol, startRow),
    end: addr(endCol, endRow),
  };
}

function cellAt({
  col,
  row,
  value,
  opts,
}: {
  col: number;
  row: number;
  value: CellValue;
  opts?: { readonly styleId?: number; readonly formula?: string };
}): Cell {
  return {
    address: addr(col, row),
    value,
    ...(opts?.styleId !== undefined ? { styleId: styleId(opts.styleId) } : {}),
    ...(opts?.formula !== undefined ? { formula: { type: "normal", expression: opts.formula } } : {}),
  };
}

function createWorksheet(name: string, sheetIdValue: number, cells: readonly Cell[]): XlsxWorksheet {
  const rowsByNumber = new Map<number, Cell[]>();
  for (const cell of cells) {
    const rowNumber = cell.address.row as number;
    const existing = rowsByNumber.get(rowNumber);
    if (existing) {
      existing.push(cell);
    } else {
      rowsByNumber.set(rowNumber, [cell]);
    }
  }

  const rows: XlsxRow[] = [...rowsByNumber.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rowNumber, rowCells]) => ({
      rowNumber: rowIdx(rowNumber),
      cells: [...rowCells].sort((a, b) => (a.address.col as number) - (b.address.col as number)),
    }));

  return {
    dateSystem: "1900",
    name,
    sheetId: sheetIdValue,
    state: "visible",
    xmlPath: `xl/worksheets/sheet${sheetIdValue}.xml`,
    rows,
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

function createEditorState(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  selection: { readonly range: CellRange; readonly activeCell?: CellAddress },
): XlsxEditorState {
  return {
    workbookHistory: createHistory(workbook),
    activeSheetIndex: sheetIndex,
    cellSelection: createRangeSelection(selection.range, selection.activeCell),
    drag: createIdleDragState(),
    clipboard: undefined,
    editingCell: undefined,
  };
}

describe("xlsx-editor/context/workbook/editor/reducer/clipboard-handlers", () => {
  it("COPY saves clipboard content with isCut=false", () => {
    const worksheet = createWorksheet("Sheet1", 1, [
      cellAt({ col: 1, row: 1, value: { type: "string", value: "A1" }, opts: { styleId: 10, formula: "SUM(1,2)" } }),
      cellAt({ col: 2, row: 2, value: { type: "string", value: "B2" } }),
    ]);
    const workbook = createWorkbook([worksheet]);
    const state = createEditorState(workbook, 0, { range: range({ startCol: 1, startRow: 1, endCol: 2, endRow: 2 }) });

    const next = clipboardHandlers.COPY?.(state, { type: "COPY" });
    expect(next).toBeDefined();
    expect(next?.clipboard).toEqual({
      sourceRange: range({ startCol: 1, startRow: 1, endCol: 2, endRow: 2 }),
      isCut: false,
      values: [
        [{ type: "string", value: "A1" }, { type: "empty" }],
        [{ type: "empty" }, { type: "string", value: "B2" }],
      ],
      formulas: [
        ["SUM(1,2)", undefined],
        [undefined, undefined],
      ],
      styles: [
        [styleId(10), undefined],
        [undefined, undefined],
      ],
    });
    expect(next?.workbookHistory).toBe(state.workbookHistory);
  });

  it("COPY normalizes sourceRange to top-left → bottom-right", () => {
    const worksheet = createWorksheet("Sheet1", 1, [
      cellAt({ col: 1, row: 1, value: { type: "string", value: "A1" } }),
      cellAt({ col: 2, row: 2, value: { type: "string", value: "B2" } }),
    ]);
    const workbook = createWorkbook([worksheet]);
    const state = createEditorState(workbook, 0, { range: range({ startCol: 2, startRow: 2, endCol: 1, endRow: 1 }) });

    const next = clipboardHandlers.COPY?.(state, { type: "COPY" });
    expect(next?.clipboard?.sourceRange).toEqual(range({ startCol: 1, startRow: 1, endCol: 2, endRow: 2 }));
    expect(next?.clipboard?.values).toEqual([
      [{ type: "string", value: "A1" }, { type: "empty" }],
      [{ type: "empty" }, { type: "string", value: "B2" }],
    ]);
  });

  it("CUT saves clipboard content with isCut=true and deletes source range (pushes history)", () => {
    const worksheet = createWorksheet("Sheet1", 1, [
      cellAt({ col: 1, row: 1, value: { type: "string", value: "A1" } }),
      cellAt({ col: 2, row: 1, value: { type: "string", value: "B1" } }),
      cellAt({ col: 5, row: 5, value: { type: "string", value: "keep" } }),
    ]);
    const workbook = createWorkbook([worksheet]);
    const state = createEditorState(workbook, 0, { range: range({ startCol: 1, startRow: 1, endCol: 2, endRow: 1 }) });

    const next = clipboardHandlers.CUT?.(state, { type: "CUT" });
    expect(next).toBeDefined();
    expect(next?.clipboard?.isCut).toBe(true);
    expect(next?.workbookHistory.past).toHaveLength(1);

    const nextSheet = next?.workbookHistory.present.sheets[0];
    expect(getCell(nextSheet!, addr(1, 1))).toBeUndefined();
    expect(getCell(nextSheet!, addr(2, 1))).toBeUndefined();
    expect(getCellValue(nextSheet!, addr(5, 5))).toEqual({ type: "string", value: "keep" });
  });

  it("PASTE writes values/formulas/styles from active cell and pushes history", () => {
    const worksheet = createWorksheet("Sheet1", 1, [
      cellAt({ col: 9, row: 9, value: { type: "string", value: "keep" } }),
    ]);
    const workbook = createWorkbook([worksheet]);
    const state: XlsxEditorState = {
      workbookHistory: createHistory(workbook),
      activeSheetIndex: 0,
      cellSelection: createRangeSelection(range({ startCol: 3, startRow: 3, endCol: 3, endRow: 3 }), addr(3, 3)),
      drag: createIdleDragState(),
      clipboard: {
        sourceRange: range({ startCol: 1, startRow: 1, endCol: 2, endRow: 2 }),
        isCut: false,
        values: [
          [
            { type: "string", value: "A1" },
            { type: "string", value: "B1" },
          ],
          [{ type: "string", value: "A2" }, { type: "empty" }],
        ],
        formulas: [
          [undefined, "A1+1"],
          [undefined, undefined],
        ],
        styles: [
          [styleId(2), undefined],
          [undefined, styleId(7)],
        ],
      },
      editingCell: undefined,
    };

    const next = clipboardHandlers.PASTE?.(state, { type: "PASTE" });
    expect(next).toBeDefined();
    expect(next?.workbookHistory.past).toHaveLength(1);

    const nextSheet = next?.workbookHistory.present.sheets[0];
    expect(getCellValue(nextSheet!, addr(3, 3))).toEqual({ type: "string", value: "A1" });
    expect(getCell(nextSheet!, addr(3, 3))?.styleId).toEqual(styleId(2));

    expect(getCellValue(nextSheet!, addr(4, 3))).toEqual({ type: "empty" });
    expect(getCell(nextSheet!, addr(4, 3))?.formula).toEqual({ type: "normal", expression: "C3+1" });

    expect(getCellValue(nextSheet!, addr(3, 4))).toEqual({ type: "string", value: "A2" });
    expect(getCell(nextSheet!, addr(4, 4))?.value).toEqual({ type: "empty" });
    expect(getCell(nextSheet!, addr(4, 4))?.styleId).toEqual(styleId(7));
    expect(getCellValue(nextSheet!, addr(9, 9))).toEqual({ type: "string", value: "keep" });
  });

  it("PASTE shifts relative references in formulas (keeps $ absolute refs)", () => {
    const worksheet = createWorksheet("Sheet1", 1, []);
    const workbook = createWorkbook([worksheet]);
    const state: XlsxEditorState = {
      workbookHistory: createHistory(workbook),
      activeSheetIndex: 0,
      cellSelection: createRangeSelection(range({ startCol: 3, startRow: 3, endCol: 3, endRow: 3 }), addr(3, 3)),
      drag: createIdleDragState(),
      clipboard: {
        sourceRange: range({ startCol: 1, startRow: 1, endCol: 1, endRow: 1 }),
        isCut: false,
        values: [[{ type: "empty" }]],
        formulas: [["A1+$A$1+A$1+$A1"]],
        styles: [[undefined]],
      },
      editingCell: undefined,
    };

    const next = clipboardHandlers.PASTE?.(state, { type: "PASTE" });
    expect(next).toBeDefined();

    const nextSheet = next?.workbookHistory.present.sheets[0];
    expect(getCell(nextSheet!, addr(3, 3))?.formula).toEqual({ type: "normal", expression: "C3+$A$1+C$1+$A3" });
  });
});
