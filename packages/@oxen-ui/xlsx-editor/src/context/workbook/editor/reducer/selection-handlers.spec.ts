/**
 * @file Selection handlers tests
 *
 * Tests for cell selection reducer handlers.
 */

import type { XlsxWorkbook } from "@oxen/xlsx/domain/workbook";
import { parseCellRef, parseRange } from "@oxen/xlsx/domain/cell/address";
import { createDefaultStyleSheet } from "@oxen/xlsx/domain/style/types";
import { createHistory } from "../../state/history";
import { createEmptyCellSelection, createIdleDragState, type XlsxEditorState } from "../types";
import { selectionHandlers } from "./selection-handlers";

function createTestWorkbook(): XlsxWorkbook {
  return {
    dateSystem: "1900",
    sheets: [
      {
        dateSystem: "1900",
        name: "Sheet1",
        sheetId: 1,
        state: "visible",
        rows: [],
        xmlPath: "xl/worksheets/sheet1.xml",
      },
    ],
    styles: createDefaultStyleSheet(),
    sharedStrings: [],
  };
}

function createTestState(): XlsxEditorState {
  return {
    workbookHistory: createHistory(createTestWorkbook()),
    activeSheetIndex: 0,
    cellSelection: createEmptyCellSelection(),
    drag: createIdleDragState(),
    clipboard: undefined,
    editingCell: undefined,
  };
}

describe("selectionHandlers", () => {
  it("SELECT_CELL: selects a single cell", () => {
    const state = createTestState();
    const address = parseCellRef("B2");

    const handler = selectionHandlers.SELECT_CELL;
    expect(handler).toBeDefined();
    const next = handler!(state, { type: "SELECT_CELL", address });

    expect(next.workbookHistory).toBe(state.workbookHistory);
    expect(next.cellSelection).toEqual({
      selectedRange: { start: address, end: address },
      activeCell: address,
      multiRanges: undefined,
    });
    expect(state.cellSelection).toEqual(createEmptyCellSelection());
  });

  it("SELECT_CELL: does not push history", () => {
    const state = createTestState();
    const address = parseCellRef("B2");

    const handler = selectionHandlers.SELECT_CELL;
    expect(handler).toBeDefined();
    const next = handler!(state, { type: "SELECT_CELL", address });

    expect(next.workbookHistory).toBe(state.workbookHistory);
    expect(state.workbookHistory.past).toEqual([]);
    expect(state.workbookHistory.future).toEqual([]);
  });

  it("SELECT_RANGE: selects a range", () => {
    const state = createTestState();
    const range = parseRange("B2:D4");

    const handler = selectionHandlers.SELECT_RANGE;
    expect(handler).toBeDefined();
    const next = handler!(state, { type: "SELECT_RANGE", range });

    expect(next.workbookHistory).toBe(state.workbookHistory);
    expect(next.cellSelection.selectedRange).toEqual(range);
    expect(next.cellSelection.activeCell).toEqual(range.start);
    expect(next.cellSelection.multiRanges).toBeUndefined();
    expect(state.cellSelection).toEqual(createEmptyCellSelection());
  });

  it("EXTEND_SELECTION: extends selection from the active cell (Shift+Click)", () => {
    const startCell = parseCellRef("A1");
    const toCell = parseCellRef("C3");

    const selectHandler = selectionHandlers.SELECT_CELL;
    const extendHandler = selectionHandlers.EXTEND_SELECTION;
    expect(selectHandler).toBeDefined();
    expect(extendHandler).toBeDefined();

    const state = createTestState();
    const selected = selectHandler!(state, { type: "SELECT_CELL", address: startCell });
    const next = extendHandler!(selected, { type: "EXTEND_SELECTION", toAddress: toCell });

    expect(next.workbookHistory).toBe(selected.workbookHistory);
    expect(next.cellSelection.selectedRange).toEqual({ start: startCell, end: toCell });
    expect(next.cellSelection.activeCell).toEqual(startCell);
    expect(next.cellSelection.multiRanges).toBeUndefined();
    expect(selected.cellSelection.selectedRange).toEqual({ start: startCell, end: startCell });
  });
});
