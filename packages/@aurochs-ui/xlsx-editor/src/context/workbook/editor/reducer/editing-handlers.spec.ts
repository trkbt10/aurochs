/**
 * @file Editing handlers tests
 *
 * Tests for the unified cell editing state handlers:
 * ENTER_CELL_EDIT, UPDATE_EDIT_TEXT, SET_EDIT_ORIGIN, COMMIT_CELL_EDIT,
 * EXIT_CELL_EDIT, SET_COMPOSITION, INSERT_CELL_REFERENCE.
 */

import { colIdx, rowIdx } from "@aurochs-office/xlsx/domain/types";
import type { CellAddress } from "@aurochs-office/xlsx/domain/cell/address";
import type { Cell, CellValue } from "@aurochs-office/xlsx/domain/cell/types";
import type { XlsxWorkbook, XlsxWorksheet, XlsxRow } from "@aurochs-office/xlsx/domain/workbook";
import { createDefaultStyleSheet } from "@aurochs-office/xlsx/domain/style/types";
import { createHistory } from "@aurochs-ui/editor-core/history";
import { getCellValue } from "../../../../cell/query";
import type { XlsxEditorAction, XlsxEditorState, CellEditComposition } from "../types";
import { createEmptyCellSelection, createIdleDragState, createIdleComposition } from "../types";
import { editingHandlers } from "./editing-handlers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addr(col: number, row: number): CellAddress {
  return {
    col: colIdx(col),
    row: rowIdx(row),
    colAbsolute: false,
    rowAbsolute: false,
  };
}

function cellAt(col: number, row: number, value: CellValue, formula?: string): Cell {
  return {
    address: addr(col, row),
    value,
    ...(formula ? { formula: { expression: formula, type: "normal" as const } } : {}),
  };
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
      cells: [...rowCells].sort((a, b) => (a.address.col as number) - (b.address.col as number)),
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

function createState(workbook: XlsxWorkbook, overrides?: Partial<XlsxEditorState>): XlsxEditorState {
  return {
    workbookHistory: createHistory(workbook),
    activeSheetIndex: 0,
    cellSelection: createEmptyCellSelection(),
    drag: createIdleDragState(),
    clipboard: undefined,
    editing: undefined,
    ...overrides,
  };
}

function dispatch(state: XlsxEditorState, action: XlsxEditorAction): XlsxEditorState {
  const handler = editingHandlers[action.type];
  if (!handler) {
    throw new Error(`No handler for action type: ${action.type}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (handler as any)(state, action);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("xlsx-editor/context/workbook/editor/reducer/editing-handlers", () => {
  // =========================================================================
  // ENTER_CELL_EDIT
  // =========================================================================

  describe("ENTER_CELL_EDIT", () => {
    it("enters editing on an empty cell with entryMode=enter", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const next = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "enter" });

      expect(next.editing).toBeDefined();
      expect(next.editing!.address).toEqual(addr(1, 1));
      expect(next.editing!.entryMode).toBe("enter");
      expect(next.editing!.origin).toBe("cell");
      expect(next.editing!.text).toBe("");
      expect(next.editing!.caretOffset).toBe(0);
      expect(next.editing!.selectionEnd).toBe(0);
      expect(next.editing!.isFormulaMode).toBe(false);
      expect(next.editing!.composition).toEqual(createIdleComposition());
      expect(next.editing!.editingSheetIndex).toBe(0);
    });

    it("enters editing on a cell with a string value", () => {
      const sheet = createWorksheet([cellAt(1, 1, { type: "string", value: "Hello" })]);
      const state = createState(createWorkbook(sheet));
      const next = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "enter" });

      expect(next.editing!.text).toBe("Hello");
      expect(next.editing!.caretOffset).toBe(5);
      expect(next.editing!.selectionEnd).toBe(5);
      expect(next.editing!.isFormulaMode).toBe(false);
    });

    it("enters editing on a cell with a number value", () => {
      const sheet = createWorksheet([cellAt(1, 1, { type: "number", value: 42 })]);
      const state = createState(createWorkbook(sheet));
      const next = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "enter" });

      expect(next.editing!.text).toBe("42");
      expect(next.editing!.caretOffset).toBe(2);
    });

    it("enters editing on a cell with a formula", () => {
      const sheet = createWorksheet([cellAt(1, 1, { type: "number", value: 3 }, "A1+A2")]);
      const state = createState(createWorkbook(sheet));
      const next = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "enter" });

      expect(next.editing!.text).toBe("=A1+A2");
      expect(next.editing!.caretOffset).toBe(6);
      expect(next.editing!.isFormulaMode).toBe(true);
    });

    it("replaces content with initialChar in replace mode", () => {
      const sheet = createWorksheet([cellAt(1, 1, { type: "string", value: "Hello" })]);
      const state = createState(createWorkbook(sheet));
      const next = dispatch(state, {
        type: "ENTER_CELL_EDIT",
        address: addr(1, 1),
        entryMode: "replace",
        initialChar: "X",
      });

      expect(next.editing!.entryMode).toBe("replace");
      expect(next.editing!.text).toBe("X");
      expect(next.editing!.caretOffset).toBe(1);
      expect(next.editing!.isFormulaMode).toBe(false);
    });

    it("detects formula mode when replace starts with =", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const next = dispatch(state, {
        type: "ENTER_CELL_EDIT",
        address: addr(1, 1),
        entryMode: "replace",
        initialChar: "=",
      });

      expect(next.editing!.text).toBe("=");
      expect(next.editing!.isFormulaMode).toBe(true);
    });

    it("sets origin to formulaBar when entryMode is formulaBar", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const next = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "formulaBar" });

      expect(next.editing!.origin).toBe("formulaBar");
      expect(next.editing!.entryMode).toBe("formulaBar");
    });

    it("returns unchanged state when no active sheet", () => {
      const wb = createWorkbook(createWorksheet([]));
      const state = createState(wb, { activeSheetIndex: undefined });
      const next = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "enter" });

      expect(next.editing).toBeUndefined();
      expect(next).toBe(state);
    });

    it("replace mode without initialChar preserves existing cell text", () => {
      const sheet = createWorksheet([cellAt(1, 1, { type: "string", value: "Hello" })]);
      const state = createState(createWorkbook(sheet));
      const next = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "replace" });

      // No initialChar → formatCellEditText is used (same as "enter" mode)
      expect(next.editing!.text).toBe("Hello");
    });
  });

  // =========================================================================
  // UPDATE_EDIT_TEXT
  // =========================================================================

  describe("UPDATE_EDIT_TEXT", () => {
    it("updates text, caret, and selectionEnd", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const editing = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "enter" });
      const next = dispatch(editing, { type: "UPDATE_EDIT_TEXT", text: "abc", caretOffset: 3, selectionEnd: 3 });

      expect(next.editing!.text).toBe("abc");
      expect(next.editing!.caretOffset).toBe(3);
      expect(next.editing!.selectionEnd).toBe(3);
      expect(next.editing!.isFormulaMode).toBe(false);
    });

    it("detects formula mode when text starts with =", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const editing = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "enter" });
      const next = dispatch(editing, { type: "UPDATE_EDIT_TEXT", text: "=SUM(A1)", caretOffset: 8, selectionEnd: 8 });

      expect(next.editing!.isFormulaMode).toBe(true);
    });

    it("exits formula mode when = is removed", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const editing = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "replace", initialChar: "=" });
      expect(editing.editing!.isFormulaMode).toBe(true);

      const next = dispatch(editing, { type: "UPDATE_EDIT_TEXT", text: "abc", caretOffset: 3, selectionEnd: 3 });
      expect(next.editing!.isFormulaMode).toBe(false);
    });

    it("supports text selection (caretOffset != selectionEnd)", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const editing = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "enter" });
      const next = dispatch(editing, { type: "UPDATE_EDIT_TEXT", text: "Hello", caretOffset: 1, selectionEnd: 4 });

      expect(next.editing!.caretOffset).toBe(1);
      expect(next.editing!.selectionEnd).toBe(4);
    });

    it("returns unchanged state when not editing", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const next = dispatch(state, { type: "UPDATE_EDIT_TEXT", text: "abc", caretOffset: 3, selectionEnd: 3 });
      expect(next).toBe(state);
    });
  });

  // =========================================================================
  // SET_EDIT_ORIGIN
  // =========================================================================

  describe("SET_EDIT_ORIGIN", () => {
    it("switches origin from cell to formulaBar", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const editing = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "enter" });
      expect(editing.editing!.origin).toBe("cell");

      const next = dispatch(editing, { type: "SET_EDIT_ORIGIN", origin: "formulaBar" });
      expect(next.editing!.origin).toBe("formulaBar");
    });

    it("switches origin from formulaBar to cell", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const editing = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "formulaBar" });
      expect(editing.editing!.origin).toBe("formulaBar");

      const next = dispatch(editing, { type: "SET_EDIT_ORIGIN", origin: "cell" });
      expect(next.editing!.origin).toBe("cell");
    });

    it("preserves other editing fields", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const editing = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(2, 3), entryMode: "enter" });
      const withText = dispatch(editing, { type: "UPDATE_EDIT_TEXT", text: "test", caretOffset: 4, selectionEnd: 4 });
      const next = dispatch(withText, { type: "SET_EDIT_ORIGIN", origin: "formulaBar" });

      expect(next.editing!.text).toBe("test");
      expect(next.editing!.caretOffset).toBe(4);
      expect(next.editing!.address).toEqual(addr(2, 3));
    });

    it("returns unchanged state when not editing", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const next = dispatch(state, { type: "SET_EDIT_ORIGIN", origin: "formulaBar" });
      expect(next).toBe(state);
    });
  });

  // =========================================================================
  // COMMIT_CELL_EDIT
  // =========================================================================

  describe("COMMIT_CELL_EDIT", () => {
    it("commits a string value and clears editing", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const editing = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "enter" });
      const withText = dispatch(editing, { type: "UPDATE_EDIT_TEXT", text: "Hello", caretOffset: 5, selectionEnd: 5 });
      const next = dispatch(withText, { type: "COMMIT_CELL_EDIT" });

      expect(next.editing).toBeUndefined();
      const sheet = next.workbookHistory.present.sheets[0];
      expect(getCellValue(sheet, addr(1, 1))).toEqual({ type: "string", value: "Hello" });
    });

    it("commits a number value", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const editing = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "enter" });
      const withText = dispatch(editing, { type: "UPDATE_EDIT_TEXT", text: "42", caretOffset: 2, selectionEnd: 2 });
      const next = dispatch(withText, { type: "COMMIT_CELL_EDIT" });

      expect(next.editing).toBeUndefined();
      const sheet = next.workbookHistory.present.sheets[0];
      expect(getCellValue(sheet, addr(1, 1))).toEqual({ type: "number", value: 42 });
    });

    it("commits a formula (stores expression without leading =)", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const editing = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "enter" });
      const withText = dispatch(editing, { type: "UPDATE_EDIT_TEXT", text: "=SUM(A1:B2)", caretOffset: 12, selectionEnd: 12 });
      const next = dispatch(withText, { type: "COMMIT_CELL_EDIT" });

      expect(next.editing).toBeUndefined();
      const sheet = next.workbookHistory.present.sheets[0];
      const cell = sheet.rows[0]?.cells[0];
      expect(cell?.formula?.expression).toBe("SUM(A1:B2)");
    });

    it("commits empty text as empty value", () => {
      const sheet = createWorksheet([cellAt(1, 1, { type: "string", value: "was here" })]);
      const state = createState(createWorkbook(sheet));
      const editing = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "enter" });
      const withText = dispatch(editing, { type: "UPDATE_EDIT_TEXT", text: "", caretOffset: 0, selectionEnd: 0 });
      const next = dispatch(withText, { type: "COMMIT_CELL_EDIT" });

      expect(next.editing).toBeUndefined();
      const updatedSheet = next.workbookHistory.present.sheets[0];
      expect(getCellValue(updatedSheet, addr(1, 1))).toEqual({ type: "empty" });
    });

    it("commits boolean TRUE", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const editing = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "enter" });
      const withText = dispatch(editing, { type: "UPDATE_EDIT_TEXT", text: "TRUE", caretOffset: 4, selectionEnd: 4 });
      const next = dispatch(withText, { type: "COMMIT_CELL_EDIT" });

      const sheet = next.workbookHistory.present.sheets[0];
      expect(getCellValue(sheet, addr(1, 1))).toEqual({ type: "boolean", value: true });
    });

    it("pushes history on commit", () => {
      const wb = createWorkbook(createWorksheet([]));
      const state = createState(wb);
      const editing = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "enter" });
      const withText = dispatch(editing, { type: "UPDATE_EDIT_TEXT", text: "X", caretOffset: 1, selectionEnd: 1 });
      const next = dispatch(withText, { type: "COMMIT_CELL_EDIT" });

      expect(next.workbookHistory.past).toHaveLength(1);
      expect(next.workbookHistory.past[0]).toBe(wb);
    });

    it("returns unchanged state when not editing", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const next = dispatch(state, { type: "COMMIT_CELL_EDIT" });
      expect(next).toBe(state);
    });

    it("commits to editing sheet even when active sheet has changed", () => {
      // 2-sheet workbook: start editing on Sheet1, switch to Sheet2, then commit
      const sheet1 = createWorksheet([]);
      const sheet2Cells: Cell[] = [];
      const sheet2: XlsxWorksheet = {
        ...createWorksheet(sheet2Cells),
        name: "Sheet2",
        sheetId: 2,
        xmlPath: "xl/worksheets/sheet2.xml",
      };
      const wb: XlsxWorkbook = {
        dateSystem: "1900",
        sheets: [{ ...sheet1, name: "Sheet1" }, sheet2],
        styles: createDefaultStyleSheet(),
        sharedStrings: [],
      };

      const state = createState(wb, { activeSheetIndex: 0 });
      // Enter editing on Sheet1
      const s1 = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "enter" });
      expect(s1.editing!.editingSheetIndex).toBe(0);

      // Simulate sheet switch: activeSheetIndex → 1 (preserving editing in formula mode)
      const s2 = dispatch(s1, { type: "UPDATE_EDIT_TEXT", text: "=", caretOffset: 1, selectionEnd: 1 });
      const switched: XlsxEditorState = { ...s2, activeSheetIndex: 1 };

      // Type a value
      const s3 = dispatch(switched, { type: "UPDATE_EDIT_TEXT", text: "=42", caretOffset: 3, selectionEnd: 3 });
      // Commit
      const s4 = dispatch(s3, { type: "COMMIT_CELL_EDIT" });

      expect(s4.editing).toBeUndefined();
      // Written to Sheet1 (editingSheetIndex=0), not Sheet2
      const committedSheet = s4.workbookHistory.present.sheets[0];
      const cell = committedSheet.rows[0]?.cells[0];
      expect(cell?.formula?.expression).toBe("42");
      // activeSheetIndex restored to editing sheet
      expect(s4.activeSheetIndex).toBe(0);
    });
  });

  // =========================================================================
  // EXIT_CELL_EDIT
  // =========================================================================

  describe("EXIT_CELL_EDIT", () => {
    it("clears editing state", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const editing = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "enter" });
      expect(editing.editing).toBeDefined();

      const next = dispatch(editing, { type: "EXIT_CELL_EDIT" });
      expect(next.editing).toBeUndefined();
    });

    it("does not push history (cancel is not an edit)", () => {
      const wb = createWorkbook(createWorksheet([]));
      const state = createState(wb);
      const editing = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "enter" });
      const withText = dispatch(editing, { type: "UPDATE_EDIT_TEXT", text: "discarded", caretOffset: 9, selectionEnd: 9 });
      const next = dispatch(withText, { type: "EXIT_CELL_EDIT" });

      expect(next.editing).toBeUndefined();
      expect(next.workbookHistory.past).toHaveLength(0);
    });
  });

  // =========================================================================
  // SET_COMPOSITION
  // =========================================================================

  describe("SET_COMPOSITION", () => {
    it("sets IME composition state", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const editing = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "enter" });

      const composition: CellEditComposition = {
        isComposing: true,
        text: "にほ",
        startOffset: 0,
      };
      const next = dispatch(editing, { type: "SET_COMPOSITION", composition });

      expect(next.editing!.composition).toEqual(composition);
    });

    it("clears composition when done", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const editing = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "enter" });

      const composing: CellEditComposition = { isComposing: true, text: "にほん", startOffset: 0 };
      const mid = dispatch(editing, { type: "SET_COMPOSITION", composition: composing });
      expect(mid.editing!.composition.isComposing).toBe(true);

      const next = dispatch(mid, { type: "SET_COMPOSITION", composition: createIdleComposition() });
      expect(next.editing!.composition).toEqual(createIdleComposition());
    });

    it("preserves other editing fields", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const editing = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "enter" });
      const withText = dispatch(editing, { type: "UPDATE_EDIT_TEXT", text: "abc", caretOffset: 3, selectionEnd: 3 });

      const composition: CellEditComposition = { isComposing: true, text: "か", startOffset: 3 };
      const next = dispatch(withText, { type: "SET_COMPOSITION", composition });

      expect(next.editing!.text).toBe("abc");
      expect(next.editing!.caretOffset).toBe(3);
      expect(next.editing!.address).toEqual(addr(1, 1));
    });

    it("returns unchanged state when not editing", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const next = dispatch(state, { type: "SET_COMPOSITION", composition: createIdleComposition() });
      expect(next).toBe(state);
    });
  });

  // =========================================================================
  // INSERT_CELL_REFERENCE
  // =========================================================================

  describe("INSERT_CELL_REFERENCE", () => {
    it("inserts reference at caret position", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const editing = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "replace", initialChar: "=" });
      const next = dispatch(editing, { type: "INSERT_CELL_REFERENCE", refText: "B2" });

      expect(next.editing!.text).toBe("=B2");
      expect(next.editing!.caretOffset).toBe(3);
      expect(next.editing!.selectionEnd).toBe(3);
      expect(next.editing!.isFormulaMode).toBe(true);
    });

    it("inserts reference in the middle of existing text", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const editing = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "enter" });
      const withText = dispatch(editing, {
        type: "UPDATE_EDIT_TEXT",
        text: "=SUM()",
        caretOffset: 5, // between ( and )
        selectionEnd: 5,
      });
      const next = dispatch(withText, { type: "INSERT_CELL_REFERENCE", refText: "A1:A10" });

      expect(next.editing!.text).toBe("=SUM(A1:A10)");
      expect(next.editing!.caretOffset).toBe(11); // 5 + "A1:A10".length
      expect(next.editing!.selectionEnd).toBe(11);
    });

    it("inserts cross-sheet reference", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const editing = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "replace", initialChar: "=" });
      const next = dispatch(editing, { type: "INSERT_CELL_REFERENCE", refText: "Sheet2!C3" });

      expect(next.editing!.text).toBe("=Sheet2!C3");
      expect(next.editing!.caretOffset).toBe(10);
    });

    it("returns unchanged state when not editing", () => {
      const state = createState(createWorkbook(createWorksheet([])));
      const next = dispatch(state, { type: "INSERT_CELL_REFERENCE", refText: "A1" });
      expect(next).toBe(state);
    });
  });

  // =========================================================================
  // Round-trip: enter → edit → commit
  // =========================================================================

  describe("round-trip editing", () => {
    it("enter → update → commit writes correct value", () => {
      const state = createState(createWorkbook(createWorksheet([])));

      const s1 = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(3, 5), entryMode: "enter" });
      const s2 = dispatch(s1, { type: "UPDATE_EDIT_TEXT", text: "3.14", caretOffset: 4, selectionEnd: 4 });
      const s3 = dispatch(s2, { type: "COMMIT_CELL_EDIT" });

      expect(s3.editing).toBeUndefined();
      const sheet = s3.workbookHistory.present.sheets[0];
      expect(getCellValue(sheet, addr(3, 5))).toEqual({ type: "number", value: 3.14 });
      expect(s3.workbookHistory.past).toHaveLength(1);
    });

    it("enter → update → cancel does not write", () => {
      const wb = createWorkbook(createWorksheet([]));
      const state = createState(wb);

      const s1 = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "enter" });
      const s2 = dispatch(s1, { type: "UPDATE_EDIT_TEXT", text: "discarded", caretOffset: 9, selectionEnd: 9 });
      const s3 = dispatch(s2, { type: "EXIT_CELL_EDIT" });

      expect(s3.editing).toBeUndefined();
      expect(s3.workbookHistory.present).toBe(wb);
      expect(s3.workbookHistory.past).toHaveLength(0);
    });

    it("replace mode → commit writes the typed character", () => {
      const state = createState(createWorkbook(createWorksheet([])));

      const s1 = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(2, 2), entryMode: "replace", initialChar: "5" });
      const s2 = dispatch(s1, { type: "COMMIT_CELL_EDIT" });

      expect(s2.editing).toBeUndefined();
      const sheet = s2.workbookHistory.present.sheets[0];
      expect(getCellValue(sheet, addr(2, 2))).toEqual({ type: "number", value: 5 });
    });

    it("formula bar enter → switch origin → commit works", () => {
      const state = createState(createWorkbook(createWorksheet([])));

      const s1 = dispatch(state, { type: "ENTER_CELL_EDIT", address: addr(1, 1), entryMode: "formulaBar" });
      expect(s1.editing!.origin).toBe("formulaBar");

      const s2 = dispatch(s1, { type: "SET_EDIT_ORIGIN", origin: "cell" });
      expect(s2.editing!.origin).toBe("cell");

      const s3 = dispatch(s2, { type: "UPDATE_EDIT_TEXT", text: "=A2+A3", caretOffset: 6, selectionEnd: 6 });
      const s4 = dispatch(s3, { type: "COMMIT_CELL_EDIT" });

      expect(s4.editing).toBeUndefined();
      const sheet = s4.workbookHistory.present.sheets[0];
      const cell = sheet.rows[0]?.cells[0];
      expect(cell?.formula?.expression).toBe("A2+A3");
    });
  });
});
