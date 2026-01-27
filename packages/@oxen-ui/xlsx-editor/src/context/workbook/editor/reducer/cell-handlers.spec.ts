/**
 * @file Cell handlers tests
 */

import { colIdx, rowIdx } from "@oxen/xlsx/domain/types";
import type { CellAddress, CellRange } from "@oxen/xlsx/domain/cell/address";
import type { Cell, CellValue } from "@oxen/xlsx/domain/cell/types";
import type { XlsxWorkbook, XlsxWorksheet, XlsxRow } from "@oxen/xlsx/domain/workbook";
import { createDefaultStyleSheet } from "@oxen/xlsx/domain/style/types";
import { createHistory } from "../../state/history";
import { getCellValue, hasCell } from "../../../../cell/query";
import type { XlsxEditorAction, XlsxEditorState } from "../types";
import { createEmptyCellSelection, createIdleDragState } from "../types";
import { cellHandlers } from "./cell-handlers";

function addr(col: number, row: number): CellAddress {
  return {
    col: colIdx(col),
    row: rowIdx(row),
    colAbsolute: false,
    rowAbsolute: false,
  };
}

function range(startCol: number, startRow: number, endCol: number, endRow: number): CellRange {
  return { start: addr(startCol, startRow), end: addr(endCol, endRow) };
}

function cellAt(col: number, row: number, value: CellValue): Cell {
  return { address: addr(col, row), value };
}

function createWorksheet(cells: readonly Cell[]): XlsxWorksheet {
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
      cells: [...rowCells].sort(
        (a, b) => (a.address.col as number) - (b.address.col as number),
      ),
    }));

  return {
    dateSystem: "1900",
    name: "Sheet1",
    sheetId: 1,
    state: "visible",
    xmlPath: "xl/worksheets/sheet1.xml",
    rows,
  };
}

function createWorkbook(worksheet: XlsxWorksheet): XlsxWorkbook {
  return {
    dateSystem: "1900",
    sheets: [worksheet],
    styles: createDefaultStyleSheet(),
    sharedStrings: [],
  };
}

function createState(workbook: XlsxWorkbook): XlsxEditorState {
  const futureWorkbook: XlsxWorkbook = { ...workbook, sharedStrings: ["future"] };
  return {
    workbookHistory: { ...createHistory(workbook), future: [futureWorkbook] },
    activeSheetIndex: 0,
    cellSelection: createEmptyCellSelection(),
    drag: createIdleDragState(),
    clipboard: undefined,
    editingCell: undefined,
  };
}

describe("xlsx-editor/context/workbook/editor/reducer/cell-handlers", () => {
  it("UPDATE_CELL updates a cell and pushes history", () => {
    type UpdateCellAction = Extract<XlsxEditorAction, { type: "UPDATE_CELL" }>;

    const workbook = createWorkbook(createWorksheet([]));
    const state = createState(workbook);
    const action: UpdateCellAction = {
      type: "UPDATE_CELL",
      address: addr(1, 1),
      value: { type: "string", value: "A1" },
    };

    const handler = cellHandlers.UPDATE_CELL;
    if (!handler) {
      throw new Error("UPDATE_CELL handler is not defined");
    }
    const nextState = handler(state, action);

    expect(nextState.workbookHistory.past).toHaveLength(1);
    expect(nextState.workbookHistory.past[0]).toBe(workbook);
    expect(nextState.workbookHistory.future).toHaveLength(0);

    const updatedSheet = nextState.workbookHistory.present.sheets[0];
    expect(getCellValue(updatedSheet, addr(1, 1))).toEqual({
      type: "string",
      value: "A1",
    });
    expect(getCellValue(workbook.sheets[0], addr(1, 1))).toBeUndefined();
    expect(state.workbookHistory.future).toHaveLength(1);
  });

  it("DELETE_CELLS deletes a range and pushes history", () => {
    type DeleteCellsAction = Extract<XlsxEditorAction, { type: "DELETE_CELLS" }>;

    const workbook = createWorkbook(
      createWorksheet([
        cellAt(1, 1, { type: "string", value: "A1" }),
        cellAt(2, 1, { type: "string", value: "B1" }),
        cellAt(1, 2, { type: "string", value: "A2" }),
      ]),
    );
    const state = createState(workbook);
    const action: DeleteCellsAction = {
      type: "DELETE_CELLS",
      range: range(1, 1, 2, 1),
    };

    const handler = cellHandlers.DELETE_CELLS;
    if (!handler) {
      throw new Error("DELETE_CELLS handler is not defined");
    }
    const nextState = handler(state, action);

    expect(nextState.workbookHistory.past).toHaveLength(1);
    expect(nextState.workbookHistory.past[0]).toBe(workbook);
    expect(nextState.workbookHistory.future).toHaveLength(0);

    const updatedSheet = nextState.workbookHistory.present.sheets[0];
    expect(hasCell(updatedSheet, addr(1, 1))).toBe(false);
    expect(hasCell(updatedSheet, addr(2, 1))).toBe(false);
    expect(hasCell(updatedSheet, addr(1, 2))).toBe(true);
    expect(hasCell(workbook.sheets[0], addr(1, 1))).toBe(true);
    expect(hasCell(workbook.sheets[0], addr(2, 1))).toBe(true);
    expect(state.workbookHistory.future).toHaveLength(1);
  });
});
