/**
 * @file Sheet handlers tests
 */

import type { XlsxWorkbook, XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import { createDefaultStyleSheet } from "@aurochs-office/xlsx/domain/style/types";
import type { XlsxEditorState, CellEditingState } from "../types";
import { createEmptyCellSelection, createIdleDragState, createIdleComposition } from "../types";
import { colIdx, rowIdx } from "@aurochs-office/xlsx/domain/types";
import { createHistory, pushHistory } from "@aurochs-ui/editor-core/history";
import { sheetHandlers } from "./sheet-handlers";

function createWorksheet(name: string, sheetId: number): XlsxWorksheet {
  return {
    dateSystem: "1900",
    name,
    sheetId,
    state: "visible",
    rows: [],
    xmlPath: `xl/worksheets/sheet${sheetId}.xml`,
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

function createState(workbook: XlsxWorkbook, activeSheetIndex: number | undefined): XlsxEditorState {
  return {
    workbookHistory: createHistory(workbook),
    activeSheetIndex,
    cellSelection: createEmptyCellSelection(),
    drag: createIdleDragState(),
    clipboard: undefined,
    editing: undefined,
  };
}

describe("sheet-handlers", () => {
  describe("SET_WORKBOOK", () => {
    it("sets workbook and resets history", () => {
      const workbookA = createWorkbook([createWorksheet("A", 1)]);
      const workbookB = createWorkbook([createWorksheet("B", 1), createWorksheet("C", 2)]);

      const state: XlsxEditorState = {
        ...createState(workbookA, 0),
        workbookHistory: pushHistory(createHistory(workbookA), workbookA),
      };

      const next = sheetHandlers.SET_WORKBOOK!(state, {
        type: "SET_WORKBOOK",
        workbook: workbookB,
      });

      expect(next.workbookHistory.present).toBe(workbookB);
      expect(next.workbookHistory.past).toEqual([]);
      expect(next.workbookHistory.future).toEqual([]);
      expect(next.activeSheetIndex).toBe(0);
      expect(state.workbookHistory.present).toBe(workbookA);
      expect(state.activeSheetIndex).toBe(0);
    });
  });

  describe("ADD_SHEET", () => {
    it("adds a sheet and pushes history", () => {
      const workbook = createWorkbook([createWorksheet("A", 1)]);
      const state = createState(workbook, 0);

      const next = sheetHandlers.ADD_SHEET!(state, {
        type: "ADD_SHEET",
        name: "B",
      });

      expect(next.workbookHistory.past).toHaveLength(1);
      expect(next.workbookHistory.past[0]).toBe(workbook);
      expect(next.workbookHistory.present.sheets.map((s) => s.name)).toEqual(["A", "B"]);
      expect(next.workbookHistory.future).toEqual([]);
      expect(next.activeSheetIndex).toBe(1);
      expect(workbook.sheets.map((s) => s.name)).toEqual(["A"]);
      expect(state.workbookHistory.present).toBe(workbook);
      expect(state.activeSheetIndex).toBe(0);
    });
  });

  describe("DELETE_SHEET", () => {
    const sheets = [createWorksheet("A", 1), createWorksheet("B", 2), createWorksheet("C", 3)];

    function makeEditingOnSheet(sheetIndex: number): CellEditingState {
      return {
        address: { col: colIdx(0), row: rowIdx(0), colAbsolute: false, rowAbsolute: false },
        entryMode: "enter",
        origin: "cell",
        text: "=A1",
        caretOffset: 3,
        selectionEnd: 3,
        isFormulaMode: true,
        composition: createIdleComposition(),
        editingSheetIndex: sheetIndex,
      };
    }

    it("decrements editingSheetIndex when a sheet before it is deleted", () => {
      // Editing on sheet C (index 2), active on C, delete sheet A (index 0)
      const workbook = createWorkbook(sheets);
      const state: XlsxEditorState = {
        ...createState(workbook, 2),
        editing: makeEditingOnSheet(2),
      };

      const next = sheetHandlers.DELETE_SHEET!(state, { type: "DELETE_SHEET", sheetIndex: 0 });

      expect(next.editing).toBeDefined();
      expect(next.editing!.editingSheetIndex).toBe(1);
    });

    it("clears editing when the editing sheet is deleted (active on another sheet)", () => {
      // Editing started on sheet A (index 0), active on B (index 1), delete A
      const workbook = createWorkbook(sheets);
      const state: XlsxEditorState = {
        ...createState(workbook, 1),
        editing: makeEditingOnSheet(0),
      };

      const next = sheetHandlers.DELETE_SHEET!(state, { type: "DELETE_SHEET", sheetIndex: 0 });

      expect(next.editing).toBeUndefined();
    });

    it("clears editing when the active sheet is deleted", () => {
      // Editing on sheet B (index 1), active on B (index 1), delete B
      const workbook = createWorkbook(sheets);
      const state: XlsxEditorState = {
        ...createState(workbook, 1),
        editing: makeEditingOnSheet(1),
      };

      const next = sheetHandlers.DELETE_SHEET!(state, { type: "DELETE_SHEET", sheetIndex: 1 });

      expect(next.editing).toBeUndefined();
    });

    it("keeps editingSheetIndex unchanged when a sheet after it is deleted", () => {
      // Editing on sheet A (index 0), active on A, delete C (index 2)
      const workbook = createWorkbook(sheets);
      const state: XlsxEditorState = {
        ...createState(workbook, 0),
        editing: makeEditingOnSheet(0),
      };

      const next = sheetHandlers.DELETE_SHEET!(state, { type: "DELETE_SHEET", sheetIndex: 2 });

      expect(next.editing).toBeDefined();
      expect(next.editing!.editingSheetIndex).toBe(0);
    });
  });

  describe("MOVE_SHEET", () => {
    const sheets = [createWorksheet("A", 1), createWorksheet("B", 2), createWorksheet("C", 3)];

    function makeEditingOnSheet(sheetIndex: number): CellEditingState {
      return {
        address: { col: colIdx(0), row: rowIdx(0), colAbsolute: false, rowAbsolute: false },
        entryMode: "enter",
        origin: "cell",
        text: "=A1",
        caretOffset: 3,
        selectionEnd: 3,
        isFormulaMode: true,
        composition: createIdleComposition(),
        editingSheetIndex: sheetIndex,
      };
    }

    it("follows the editing sheet when it is moved forward", () => {
      // Editing on A (index 0), move A from 0 to 2
      const workbook = createWorkbook(sheets);
      const state: XlsxEditorState = {
        ...createState(workbook, 0),
        editing: makeEditingOnSheet(0),
      };

      const next = sheetHandlers.MOVE_SHEET!(state, { type: "MOVE_SHEET", fromIndex: 0, toIndex: 2 });

      expect(next.editing).toBeDefined();
      expect(next.editing!.editingSheetIndex).toBe(2);
    });

    it("follows the editing sheet when it is moved backward", () => {
      // Editing on C (index 2), move C from 2 to 0
      const workbook = createWorkbook(sheets);
      const state: XlsxEditorState = {
        ...createState(workbook, 2),
        editing: makeEditingOnSheet(2),
      };

      const next = sheetHandlers.MOVE_SHEET!(state, { type: "MOVE_SHEET", fromIndex: 2, toIndex: 0 });

      expect(next.editing).toBeDefined();
      expect(next.editing!.editingSheetIndex).toBe(0);
    });

    it("adjusts editingSheetIndex when another sheet is moved across it", () => {
      // Editing on B (index 1), move A (index 0) to index 2
      // B shifts from index 1 → index 0
      const workbook = createWorkbook(sheets);
      const state: XlsxEditorState = {
        ...createState(workbook, 1),
        editing: makeEditingOnSheet(1),
      };

      const next = sheetHandlers.MOVE_SHEET!(state, { type: "MOVE_SHEET", fromIndex: 0, toIndex: 2 });

      expect(next.editing).toBeDefined();
      expect(next.editing!.editingSheetIndex).toBe(0);
    });

    it("keeps editingSheetIndex when move does not cross it", () => {
      // Editing on A (index 0), move B (index 1) to C (index 2)
      const workbook = createWorkbook(sheets);
      const state: XlsxEditorState = {
        ...createState(workbook, 0),
        editing: makeEditingOnSheet(0),
      };

      const next = sheetHandlers.MOVE_SHEET!(state, { type: "MOVE_SHEET", fromIndex: 1, toIndex: 2 });

      expect(next.editing).toBeDefined();
      expect(next.editing!.editingSheetIndex).toBe(0);
    });
  });

  describe("SELECT_SHEET", () => {
    it("changes the active sheet without pushing history", () => {
      const workbook = createWorkbook([createWorksheet("A", 1), createWorksheet("B", 2)]);
      const history = pushHistory(createHistory(workbook), workbook);
      const state: XlsxEditorState = {
        ...createState(workbook, 0),
        workbookHistory: history,
      };

      const next = sheetHandlers.SELECT_SHEET!(state, {
        type: "SELECT_SHEET",
        sheetIndex: 1,
      });

      expect(next.activeSheetIndex).toBe(1);
      expect(next.workbookHistory).toBe(state.workbookHistory);
      expect(state.activeSheetIndex).toBe(0);
      expect(state.workbookHistory.present).toBe(workbook);
    });

    it("preserves editing state and editingSheetIndex during formula-mode sheet switch", () => {
      const workbook = createWorkbook([createWorksheet("Sheet1", 1), createWorksheet("Sheet2", 2)]);
      const editing: CellEditingState = {
        address: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
        entryMode: "enter",
        origin: "cell",
        text: "=",
        caretOffset: 1,
        selectionEnd: 1,
        isFormulaMode: true,
        composition: createIdleComposition(),
        editingSheetIndex: 0,
      };
      const state: XlsxEditorState = {
        ...createState(workbook, 0),
        editing,
      };

      const next = sheetHandlers.SELECT_SHEET!(state, {
        type: "SELECT_SHEET",
        sheetIndex: 1,
      });

      expect(next.activeSheetIndex).toBe(1);
      // Editing preserved with original editingSheetIndex
      expect(next.editing).toBeDefined();
      expect(next.editing!.editingSheetIndex).toBe(0);
      expect(next.editing!.isFormulaMode).toBe(true);
    });

    it("clears editing when not in formula mode on sheet switch", () => {
      const workbook = createWorkbook([createWorksheet("Sheet1", 1), createWorksheet("Sheet2", 2)]);
      const editing: CellEditingState = {
        address: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
        entryMode: "enter",
        origin: "cell",
        text: "Hello",
        caretOffset: 5,
        selectionEnd: 5,
        isFormulaMode: false,
        composition: createIdleComposition(),
        editingSheetIndex: 0,
      };
      const state: XlsxEditorState = {
        ...createState(workbook, 0),
        editing,
      };

      const next = sheetHandlers.SELECT_SHEET!(state, {
        type: "SELECT_SHEET",
        sheetIndex: 1,
      });

      expect(next.activeSheetIndex).toBe(1);
      expect(next.editing).toBeUndefined();
    });
  });
});
