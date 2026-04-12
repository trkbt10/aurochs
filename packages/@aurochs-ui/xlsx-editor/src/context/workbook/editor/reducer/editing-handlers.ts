/**
 * @file Editing handlers
 *
 * Handlers for unified cell editing state: enter, update, commit, cancel, IME composition,
 * origin switching, and reference insertion. The `CellEditingState` serves as the single
 * source of truth shared by both the formula bar and the inline cell editor.
 */

import type { XlsxWorkbook, XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import type { CellAddress } from "@aurochs-office/xlsx/domain/cell/address";
import type { XlsxEditorAction, XlsxEditorState } from "../types";
import { createIdleComposition } from "../types";
import type { HandlerMap } from "./handler-types";
import { pushHistory } from "@aurochs-ui/editor-core/history";
import { updateCell } from "@aurochs-office/xlsx/domain/mutation/cell";
import { setCellFormula } from "@aurochs-office/xlsx/domain/mutation/cell";
import { updateWorksheetInWorkbook } from "../../utils/worksheet-updater";
import { formatCellEditText } from "../../../../components/cell-input/format-cell-edit-text";
import { parseCellUserInput, type ParseCellUserInputResult } from "../../../../components/cell-input/parse-cell-user-input";

type EnterCellEditAction = Extract<XlsxEditorAction, { type: "ENTER_CELL_EDIT" }>;
type UpdateEditTextAction = Extract<XlsxEditorAction, { type: "UPDATE_EDIT_TEXT" }>;
type SetEditOriginAction = Extract<XlsxEditorAction, { type: "SET_EDIT_ORIGIN" }>;
type SetCompositionAction = Extract<XlsxEditorAction, { type: "SET_COMPOSITION" }>;
type InsertCellReferenceAction = Extract<XlsxEditorAction, { type: "INSERT_CELL_REFERENCE" }>;

/** Resolve initial text for a cell edit based on entry mode. */
function resolveInitialEditText(action: EnterCellEditAction, sheet: XlsxWorksheet): string {
  if (action.entryMode === "replace" && action.initialChar !== undefined) {
    return action.initialChar;
  }
  return formatCellEditText(sheet, action.address);
}

function getActiveSheet(state: XlsxEditorState) {
  if (state.activeSheetIndex === undefined) {
    return undefined;
  }
  return state.workbookHistory.present.sheets[state.activeSheetIndex];
}

function handleEnterCellEdit(state: XlsxEditorState, action: EnterCellEditAction): XlsxEditorState {
  const sheet = getActiveSheet(state);
  if (!sheet) {
    return state;
  }

  const text = resolveInitialEditText(action, sheet);

  const caretOffset = text.length;

  return {
    ...state,
    editing: {
      address: action.address,
      entryMode: action.entryMode,
      origin: action.entryMode === "formulaBar" ? "formulaBar" : "cell",
      text,
      caretOffset,
      selectionEnd: caretOffset,
      isFormulaMode: text.startsWith("="),
      composition: createIdleComposition(),
      editingSheetIndex: state.activeSheetIndex!,
    },
  };
}

function handleUpdateEditText(state: XlsxEditorState, action: UpdateEditTextAction): XlsxEditorState {
  if (!state.editing) {
    return state;
  }
  return {
    ...state,
    editing: {
      ...state.editing,
      text: action.text,
      caretOffset: action.caretOffset,
      selectionEnd: action.selectionEnd,
      isFormulaMode: action.text.startsWith("="),
    },
  };
}

function handleSetEditOrigin(state: XlsxEditorState, action: SetEditOriginAction): XlsxEditorState {
  if (!state.editing) {
    return state;
  }
  return {
    ...state,
    editing: {
      ...state.editing,
      origin: action.origin,
    },
  };
}

/** Apply a parsed cell input (value or formula) to the workbook. */
function applyParsedCellInput(params: {
  readonly workbook: XlsxWorkbook;
  readonly sheetIndex: number;
  readonly address: CellAddress;
  readonly result: ParseCellUserInputResult;
}): XlsxWorkbook {
  const { workbook, sheetIndex, address, result } = params;
  if (result.type === "formula") {
    return updateWorksheetInWorkbook(workbook, sheetIndex, (ws) => setCellFormula(ws, address, result.formula));
  }
  return updateWorksheetInWorkbook(workbook, sheetIndex, (ws) => updateCell(ws, address, result.value));
}

function handleCommitCellEdit(state: XlsxEditorState): XlsxEditorState {
  const editing = state.editing;
  if (!editing) {
    return state;
  }

  const sheetIndex = editing.editingSheetIndex;

  const result = parseCellUserInput(editing.text);

  const updatedWorkbook = applyParsedCellInput({
    workbook: state.workbookHistory.present,
    sheetIndex,
    address: editing.address,
    result,
  });

  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
    editing: undefined,
    activeSheetIndex: editing.editingSheetIndex,
  };
}

function handleSetComposition(state: XlsxEditorState, action: SetCompositionAction): XlsxEditorState {
  if (!state.editing) {
    return state;
  }
  return {
    ...state,
    editing: {
      ...state.editing,
      composition: action.composition,
    },
  };
}

function handleInsertCellReference(state: XlsxEditorState, action: InsertCellReferenceAction): XlsxEditorState {
  if (!state.editing) {
    return state;
  }

  const { text, caretOffset } = state.editing;
  const before = text.slice(0, caretOffset);
  const after = text.slice(caretOffset);
  const newText = before + action.refText + after;
  const newCaretOffset = caretOffset + action.refText.length;

  return {
    ...state,
    editing: {
      ...state.editing,
      text: newText,
      caretOffset: newCaretOffset,
      selectionEnd: newCaretOffset,
      isFormulaMode: newText.startsWith("="),
    },
  };
}

export const editingHandlers: HandlerMap = {
  ENTER_CELL_EDIT: handleEnterCellEdit,
  EXIT_CELL_EDIT: (state) => ({ ...state, editing: undefined }),
  COMMIT_CELL_EDIT: handleCommitCellEdit,
  UPDATE_EDIT_TEXT: handleUpdateEditText,
  SET_EDIT_ORIGIN: handleSetEditOrigin,
  SET_COMPOSITION: handleSetComposition,
  INSERT_CELL_REFERENCE: handleInsertCellReference,
};
