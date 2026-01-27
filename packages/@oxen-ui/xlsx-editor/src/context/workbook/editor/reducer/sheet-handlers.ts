/**
 * @file Sheet management handlers
 *
 * Handlers for workbook sheet operations: set workbook, add/delete/rename/move/duplicate, select.
 */

import type { HandlerMap } from "./handler-types";
import type { XlsxEditorAction, XlsxEditorState } from "../types";
import { createEmptyCellSelection, createIdleDragState } from "../types";
import { createHistory, pushHistory } from "../../state/history";
import {
  addSheet,
  deleteSheet,
  renameSheet,
  moveSheet,
  duplicateSheet,
} from "../../../../sheet/mutation";

type SetWorkbookAction = Extract<XlsxEditorAction, { type: "SET_WORKBOOK" }>;
type AddSheetAction = Extract<XlsxEditorAction, { type: "ADD_SHEET" }>;
type DeleteSheetAction = Extract<XlsxEditorAction, { type: "DELETE_SHEET" }>;
type RenameSheetAction = Extract<XlsxEditorAction, { type: "RENAME_SHEET" }>;
type SelectSheetAction = Extract<XlsxEditorAction, { type: "SELECT_SHEET" }>;
type MoveSheetAction = Extract<XlsxEditorAction, { type: "MOVE_SHEET" }>;
type DuplicateSheetAction = Extract<XlsxEditorAction, { type: "DUPLICATE_SHEET" }>;

function getActiveSheetIndexAfterDelete(
  currentActiveIndex: number | undefined,
  deletedIndex: number,
  newSheetCount: number,
): number | undefined {
  if (newSheetCount <= 0) {
    return undefined;
  }
  if (currentActiveIndex === undefined) {
    return 0;
  }
  if (currentActiveIndex === deletedIndex) {
    return Math.min(deletedIndex, newSheetCount - 1);
  }
  if (currentActiveIndex > deletedIndex) {
    return currentActiveIndex - 1;
  }
  return currentActiveIndex;
}

function getActiveSheetIndexAfterMove(
  currentActiveIndex: number | undefined,
  fromIndex: number,
  toIndex: number,
): number | undefined {
  if (currentActiveIndex === undefined) {
    return undefined;
  }
  if (fromIndex === toIndex) {
    return currentActiveIndex;
  }
  if (currentActiveIndex === fromIndex) {
    return toIndex;
  }

  if (fromIndex < toIndex) {
    if (currentActiveIndex > fromIndex && currentActiveIndex <= toIndex) {
      return currentActiveIndex - 1;
    }
    return currentActiveIndex;
  }

  if (currentActiveIndex >= toIndex && currentActiveIndex < fromIndex) {
    return currentActiveIndex + 1;
  }
  return currentActiveIndex;
}

function assertValidSheetIndex(state: XlsxEditorState, sheetIndex: number): void {
  if (!Number.isInteger(sheetIndex)) {
    throw new Error(`sheetIndex must be an integer: ${sheetIndex}`);
  }
  const count = state.workbookHistory.present.sheets.length;
  if (sheetIndex < 0 || sheetIndex >= count) {
    throw new Error(`sheetIndex out of range: ${sheetIndex}`);
  }
}

function handleSetWorkbook(
  state: XlsxEditorState,
  action: SetWorkbookAction,
): XlsxEditorState {
  return {
    ...state,
    workbookHistory: createHistory(action.workbook),
    activeSheetIndex: action.workbook.sheets.length > 0 ? 0 : undefined,
    cellSelection: createEmptyCellSelection(),
    drag: createIdleDragState(),
    clipboard: undefined,
    editingCell: undefined,
  };
}

function handleAddSheet(
  state: XlsxEditorState,
  action: AddSheetAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = addSheet(currentWorkbook, action.name, action.afterIndex);
  const insertIndex = action.afterIndex === undefined ? currentWorkbook.sheets.length : action.afterIndex + 1;

  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
    activeSheetIndex: insertIndex,
    cellSelection: createEmptyCellSelection(),
    drag: createIdleDragState(),
    editingCell: undefined,
  };
}

function handleDeleteSheet(
  state: XlsxEditorState,
  action: DeleteSheetAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  if (currentWorkbook.sheets.length <= 1) {
    return state;
  }

  const wasActiveSheetDeleted = state.activeSheetIndex === action.sheetIndex;
  const newWorkbook = deleteSheet(currentWorkbook, action.sheetIndex);
  const newActiveSheetIndex = getActiveSheetIndexAfterDelete(
    state.activeSheetIndex,
    action.sheetIndex,
    newWorkbook.sheets.length,
  );

  const cellSelection = wasActiveSheetDeleted ? createEmptyCellSelection() : state.cellSelection;
  const drag = wasActiveSheetDeleted ? createIdleDragState() : state.drag;
  const editingCell = wasActiveSheetDeleted ? undefined : state.editingCell;

  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
    activeSheetIndex: newActiveSheetIndex,
    cellSelection,
    drag,
    editingCell,
  };
}

function handleRenameSheet(
  state: XlsxEditorState,
  action: RenameSheetAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const currentName = currentWorkbook.sheets[action.sheetIndex]?.name;
  if (currentName === action.name) {
    return state;
  }

  const newWorkbook = renameSheet(currentWorkbook, action.sheetIndex, action.name);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

function handleSelectSheet(
  state: XlsxEditorState,
  action: SelectSheetAction,
): XlsxEditorState {
  assertValidSheetIndex(state, action.sheetIndex);
  if (state.activeSheetIndex === action.sheetIndex) {
    return state;
  }
  return {
    ...state,
    activeSheetIndex: action.sheetIndex,
    cellSelection: createEmptyCellSelection(),
    drag: createIdleDragState(),
    editingCell: undefined,
  };
}

function handleMoveSheet(
  state: XlsxEditorState,
  action: MoveSheetAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = moveSheet(currentWorkbook, action.fromIndex, action.toIndex);
  if (newWorkbook === currentWorkbook) {
    return state;
  }

  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
    activeSheetIndex: getActiveSheetIndexAfterMove(
      state.activeSheetIndex,
      action.fromIndex,
      action.toIndex,
    ),
  };
}

function handleDuplicateSheet(
  state: XlsxEditorState,
  action: DuplicateSheetAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = duplicateSheet(currentWorkbook, action.sheetIndex);
  const newActiveIndex = action.sheetIndex + 1;

  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
    activeSheetIndex: newActiveIndex,
    cellSelection: createEmptyCellSelection(),
    drag: createIdleDragState(),
    editingCell: undefined,
  };
}

export const sheetHandlers: HandlerMap = {
  SET_WORKBOOK: handleSetWorkbook,
  ADD_SHEET: handleAddSheet,
  DELETE_SHEET: handleDeleteSheet,
  RENAME_SHEET: handleRenameSheet,
  SELECT_SHEET: handleSelectSheet,
  MOVE_SHEET: handleMoveSheet,
  DUPLICATE_SHEET: handleDuplicateSheet,
};
