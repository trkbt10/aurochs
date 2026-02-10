/**
 * @file Editing handlers
 *
 * Handlers for unified cell editing state: enter, update, commit, cancel, IME composition,
 * origin switching, and reference insertion. The `CellEditingState` serves as the single
 * source of truth shared by both the formula bar and the inline cell editor.
 */

import type { XlsxEditorAction, XlsxEditorState } from "../types";
import { createIdleComposition } from "../types";
import type { HandlerMap } from "./handler-types";
import { pushHistory } from "@aurochs-ui/editor-core/history";
import { updateCell } from "../../../../cell/mutation";
import { setCellFormula } from "../../../../cell/mutation";
import { updateWorksheetInWorkbook } from "../../utils/worksheet-updater";
import { formatCellEditText } from "../../../../components/cell-input/format-cell-edit-text";
import { parseCellUserInput } from "../../../../components/cell-input/parse-cell-user-input";

type EnterCellEditAction = Extract<XlsxEditorAction, { type: "ENTER_CELL_EDIT" }>;
type UpdateEditTextAction = Extract<XlsxEditorAction, { type: "UPDATE_EDIT_TEXT" }>;
type SetEditOriginAction = Extract<XlsxEditorAction, { type: "SET_EDIT_ORIGIN" }>;
type SetCompositionAction = Extract<XlsxEditorAction, { type: "SET_COMPOSITION" }>;
type InsertCellReferenceAction = Extract<XlsxEditorAction, { type: "INSERT_CELL_REFERENCE" }>;

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

  const isReplace = action.entryMode === "replace";
  // eslint-disable-next-line no-restricted-syntax -- assigned conditionally
  let text: string;
  if (isReplace && action.initialChar !== undefined) {
    text = action.initialChar;
  } else {
    text = formatCellEditText(sheet, action.address);
  }

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

function handleCommitCellEdit(state: XlsxEditorState): XlsxEditorState {
  const editing = state.editing;
  if (!editing) {
    return state;
  }

  const sheetIndex = editing.editingSheetIndex;

  const result = parseCellUserInput(editing.text);

  // eslint-disable-next-line no-restricted-syntax -- assigned conditionally per parse result type
  let updatedWorkbook;
  if (result.type === "formula") {
    updatedWorkbook = updateWorksheetInWorkbook(state.workbookHistory.present, sheetIndex, (worksheet) =>
      setCellFormula(worksheet, editing.address, result.formula),
    );
  } else {
    updatedWorkbook = updateWorksheetInWorkbook(state.workbookHistory.present, sheetIndex, (worksheet) =>
      updateCell(worksheet, editing.address, result.value),
    );
  }

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
