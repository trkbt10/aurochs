/**
 * @file Drag handlers tests
 *
 * Tests for drag operation reducer handlers (3-stage pattern).
 */

import type { XlsxWorkbook } from "@oxen/xlsx/domain/workbook";
import { createDefaultStyleSheet } from "@oxen/xlsx/domain/style/types";
import { parseCellRef, parseRange } from "@oxen/xlsx/domain/cell/address";
import { colIdx, rowIdx } from "@oxen/xlsx/domain/types";
import { createHistory } from "../../state/history";
import { createEmptyCellSelection, createIdleDragState, type XlsxEditorState } from "../types";
import { dragHandlers } from "./drag-handlers";

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
  const workbook = createTestWorkbook();
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

describe("xlsx-editor/context/workbook/editor/reducer/drag-handlers", () => {
  it("START_RANGE_SELECT: starts drag state", () => {
    const state = createTestState();
    const startCell = parseCellRef("B2");

    const handler = dragHandlers.START_RANGE_SELECT;
    if (!handler) {throw new Error("START_RANGE_SELECT handler is not defined");}
    const next = handler(state, { type: "START_RANGE_SELECT", startCell });

    expect(next.workbookHistory).toBe(state.workbookHistory);
    expect(next.workbookHistory.past).toEqual([]);
    expect(next.workbookHistory.future).toHaveLength(1);
    expect(next.drag).toEqual({
      type: "rangeSelect",
      startCell,
      currentCell: startCell,
    });
    expect(next.cellSelection.selectedRange).toEqual({ start: startCell, end: startCell });
    expect(next.cellSelection.activeCell).toEqual(startCell);
    expect(state.drag).toEqual(createIdleDragState());
    expect(state.cellSelection).toEqual(createEmptyCellSelection());
  });

  it("PREVIEW_RANGE_SELECT: updates preview range", () => {
    const startCell = parseCellRef("B2");
    const currentCell = parseCellRef("D4");

    const startHandler = dragHandlers.START_RANGE_SELECT;
    const previewHandler = dragHandlers.PREVIEW_RANGE_SELECT;
    if (!startHandler) {throw new Error("START_RANGE_SELECT handler is not defined");}
    if (!previewHandler) {throw new Error("PREVIEW_RANGE_SELECT handler is not defined");}

    const state = createTestState();
    const started = startHandler(state, { type: "START_RANGE_SELECT", startCell });
    const next = previewHandler(started, { type: "PREVIEW_RANGE_SELECT", currentCell });

    expect(next.workbookHistory).toBe(state.workbookHistory);
    expect(next.workbookHistory.past).toEqual([]);
    expect(next.workbookHistory.future).toHaveLength(1);
    expect(next.drag).toEqual({
      type: "rangeSelect",
      startCell,
      currentCell,
    });
    expect(next.cellSelection.selectedRange).toEqual({ start: startCell, end: currentCell });
    expect(next.cellSelection.activeCell).toEqual(startCell);
    expect(started.drag).toEqual({
      type: "rangeSelect",
      startCell,
      currentCell: startCell,
    });
  });

  it("END_RANGE_SELECT: commits selection and ends drag", () => {
    const startCell = parseCellRef("B2");
    const currentCell = parseCellRef("D4");

    const startHandler = dragHandlers.START_RANGE_SELECT;
    const previewHandler = dragHandlers.PREVIEW_RANGE_SELECT;
    const endHandler = dragHandlers.END_RANGE_SELECT;
    if (!startHandler) {throw new Error("START_RANGE_SELECT handler is not defined");}
    if (!previewHandler) {throw new Error("PREVIEW_RANGE_SELECT handler is not defined");}
    if (!endHandler) {throw new Error("END_RANGE_SELECT handler is not defined");}

    const state = createTestState();
    const started = startHandler(state, { type: "START_RANGE_SELECT", startCell });
    const previewed = previewHandler(started, { type: "PREVIEW_RANGE_SELECT", currentCell });
    const next = endHandler(previewed, { type: "END_RANGE_SELECT" });

    expect(next.workbookHistory).toBe(state.workbookHistory);
    expect(next.workbookHistory.past).toEqual([]);
    expect(next.workbookHistory.future).toHaveLength(1);
    expect(next.drag.type).toBe("idle");
    expect(next.cellSelection.selectedRange).toEqual(parseRange("B2:D4"));
    expect(next.cellSelection.activeCell).toEqual(startCell);
    expect(previewed.drag).toEqual({
      type: "rangeSelect",
      startCell,
      currentCell,
    });
  });

  it("COMMIT_ROW_RESIZE: commits row height and pushes history", () => {
    const state = createTestState();
    const workbook = state.workbookHistory.present;

    const startHandler = dragHandlers.START_ROW_RESIZE;
    const previewHandler = dragHandlers.PREVIEW_ROW_RESIZE;
    const commitHandler = dragHandlers.COMMIT_ROW_RESIZE;
    if (!startHandler) {throw new Error("START_ROW_RESIZE handler is not defined");}
    if (!previewHandler) {throw new Error("PREVIEW_ROW_RESIZE handler is not defined");}
    if (!commitHandler) {throw new Error("COMMIT_ROW_RESIZE handler is not defined");}

    const started = startHandler(state, {
      type: "START_ROW_RESIZE",
      rowIndex: rowIdx(1),
      startY: 100,
      originalHeight: 12,
    });
    expect(started.workbookHistory).toBe(state.workbookHistory);

    const previewed = previewHandler(started, {
      type: "PREVIEW_ROW_RESIZE",
      newHeight: 24,
    });
    expect(previewed.workbookHistory).toBe(state.workbookHistory);
    expect(previewed.drag.type).toBe("rowResize");
    expect(started.drag.type).toBe("rowResize");

    const next = commitHandler(previewed, { type: "COMMIT_ROW_RESIZE" });

    expect(next.workbookHistory.past).toHaveLength(1);
    expect(next.workbookHistory.past[0]).toBe(workbook);
    expect(next.workbookHistory.future).toHaveLength(0);

    const sheet = next.workbookHistory.present.sheets[0];
    const row1 = sheet?.rows.find((r) => r.rowNumber === rowIdx(1));
    expect(row1?.height).toBe(24);
    expect(row1?.customHeight).toBe(true);
    expect(next.drag.type).toBe("idle");
    expect(state.workbookHistory.present).toBe(workbook);
  });

  it("COMMIT_FILL_DRAG: fills numeric series and pushes history", () => {
    const workbook: XlsxWorkbook = {
      dateSystem: "1900",
      sheets: [
        {
          dateSystem: "1900",
          name: "Sheet1",
          sheetId: 1,
          state: "visible",
          rows: [
            {
              rowNumber: rowIdx(1),
              cells: [
                {
                  address: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
                  value: { type: "number", value: 5 },
                },
              ],
            },
          ],
          xmlPath: "xl/worksheets/sheet1.xml",
        },
      ],
      styles: createDefaultStyleSheet(),
      sharedStrings: [],
    };

    const state: XlsxEditorState = {
      workbookHistory: createHistory(workbook),
      activeSheetIndex: 0,
      cellSelection: createEmptyCellSelection(),
      drag: createIdleDragState(),
      clipboard: undefined,
      editingCell: undefined,
    };

    const startHandler = dragHandlers.START_FILL_DRAG;
    const previewHandler = dragHandlers.PREVIEW_FILL_DRAG;
    const commitHandler = dragHandlers.COMMIT_FILL_DRAG;
    if (!startHandler) {throw new Error("START_FILL_DRAG handler is not defined");}
    if (!previewHandler) {throw new Error("PREVIEW_FILL_DRAG handler is not defined");}
    if (!commitHandler) {throw new Error("COMMIT_FILL_DRAG handler is not defined");}

    const started = startHandler(state, { type: "START_FILL_DRAG", sourceRange: parseRange("A1") });
    const previewed = previewHandler(started, { type: "PREVIEW_FILL_DRAG", targetRange: parseRange("A1:A3") });
    const next = commitHandler(previewed, { type: "COMMIT_FILL_DRAG" });

    expect(next.workbookHistory.past).toHaveLength(1);
    expect(next.drag.type).toBe("idle");
    expect(next.cellSelection.selectedRange).toEqual(parseRange("A1:A3"));

    const sheet1 = next.workbookHistory.present.sheets[0];
    const row2 = sheet1?.rows.find((r) => r.rowNumber === rowIdx(2));
    const row3 = sheet1?.rows.find((r) => r.rowNumber === rowIdx(3));
    expect(row2?.cells[0]?.value).toEqual({ type: "number", value: 6 });
    expect(row3?.cells[0]?.value).toEqual({ type: "number", value: 7 });
  });
});
