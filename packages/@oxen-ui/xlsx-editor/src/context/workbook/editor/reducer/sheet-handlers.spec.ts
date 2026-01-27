/**
 * @file Sheet handlers tests
 */

import type { XlsxWorkbook, XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import { createDefaultStyleSheet } from "@oxen/xlsx/domain/style/types";
import type { XlsxEditorState } from "../types";
import { createEmptyCellSelection, createIdleDragState } from "../types";
import { createHistory, pushHistory } from "../../state/history";
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
    editingCell: undefined,
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
  });
});
