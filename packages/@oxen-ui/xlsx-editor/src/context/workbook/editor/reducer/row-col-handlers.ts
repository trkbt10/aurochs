/**
 * @file Row/Column mutation handlers
 *
 * Handlers for row/column operations on the active worksheet.
 */

import type { XlsxEditorAction, XlsxEditorState } from "../types";
import type { HandlerMap } from "./handler-types";
import { pushHistory } from "../../state/history";
import {
  insertRows,
  deleteRows,
  insertColumns,
  deleteColumns,
  setRowHeight,
  setColumnWidth,
  hideRows,
  unhideRows,
  hideColumns,
  unhideColumns,
} from "../../../../row-col/mutation";
import { updateWorksheetInWorkbook } from "../../utils/worksheet-updater";

type InsertRowsAction = Extract<XlsxEditorAction, { type: "INSERT_ROWS" }>;
type DeleteRowsAction = Extract<XlsxEditorAction, { type: "DELETE_ROWS" }>;
type InsertColumnsAction = Extract<XlsxEditorAction, { type: "INSERT_COLUMNS" }>;
type DeleteColumnsAction = Extract<XlsxEditorAction, { type: "DELETE_COLUMNS" }>;
type SetRowHeightAction = Extract<XlsxEditorAction, { type: "SET_ROW_HEIGHT" }>;
type SetColumnWidthAction = Extract<XlsxEditorAction, { type: "SET_COLUMN_WIDTH" }>;
type HideRowsAction = Extract<XlsxEditorAction, { type: "HIDE_ROWS" }>;
type UnhideRowsAction = Extract<XlsxEditorAction, { type: "UNHIDE_ROWS" }>;
type HideColumnsAction = Extract<XlsxEditorAction, { type: "HIDE_COLUMNS" }>;
type UnhideColumnsAction = Extract<XlsxEditorAction, { type: "UNHIDE_COLUMNS" }>;

function handleInsertRows(
  state: XlsxEditorState,
  action: InsertRowsAction,
): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return state;
  }

  const updatedWorkbook = updateWorksheetInWorkbook(
    state.workbookHistory.present,
    sheetIndex,
    (worksheet) => insertRows(worksheet, action.startRow, action.count),
  );

  return { ...state, workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook) };
}

function handleDeleteRows(
  state: XlsxEditorState,
  action: DeleteRowsAction,
): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return state;
  }

  const updatedWorkbook = updateWorksheetInWorkbook(
    state.workbookHistory.present,
    sheetIndex,
    (worksheet) => deleteRows(worksheet, action.startRow, action.count),
  );

  return { ...state, workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook) };
}

function handleInsertColumns(
  state: XlsxEditorState,
  action: InsertColumnsAction,
): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return state;
  }

  const updatedWorkbook = updateWorksheetInWorkbook(
    state.workbookHistory.present,
    sheetIndex,
    (worksheet) => insertColumns(worksheet, action.startCol, action.count),
  );

  return { ...state, workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook) };
}

function handleDeleteColumns(
  state: XlsxEditorState,
  action: DeleteColumnsAction,
): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return state;
  }

  const updatedWorkbook = updateWorksheetInWorkbook(
    state.workbookHistory.present,
    sheetIndex,
    (worksheet) => deleteColumns(worksheet, action.startCol, action.count),
  );

  return { ...state, workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook) };
}

function handleSetRowHeight(
  state: XlsxEditorState,
  action: SetRowHeightAction,
): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return state;
  }

  const updatedWorkbook = updateWorksheetInWorkbook(
    state.workbookHistory.present,
    sheetIndex,
    (worksheet) => setRowHeight(worksheet, action.rowIndex, action.height),
  );

  return { ...state, workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook) };
}

function handleSetColumnWidth(
  state: XlsxEditorState,
  action: SetColumnWidthAction,
): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return state;
  }

  const updatedWorkbook = updateWorksheetInWorkbook(
    state.workbookHistory.present,
    sheetIndex,
    (worksheet) => setColumnWidth(worksheet, action.colIndex, action.width),
  );

  return { ...state, workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook) };
}

function handleHideRows(
  state: XlsxEditorState,
  action: HideRowsAction,
): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return state;
  }

  const updatedWorkbook = updateWorksheetInWorkbook(
    state.workbookHistory.present,
    sheetIndex,
    (worksheet) => hideRows(worksheet, action.startRow, action.count),
  );

  return { ...state, workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook) };
}

function handleUnhideRows(
  state: XlsxEditorState,
  action: UnhideRowsAction,
): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return state;
  }

  const updatedWorkbook = updateWorksheetInWorkbook(
    state.workbookHistory.present,
    sheetIndex,
    (worksheet) => unhideRows(worksheet, action.startRow, action.count),
  );

  return { ...state, workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook) };
}

function handleHideColumns(
  state: XlsxEditorState,
  action: HideColumnsAction,
): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return state;
  }

  const updatedWorkbook = updateWorksheetInWorkbook(
    state.workbookHistory.present,
    sheetIndex,
    (worksheet) => hideColumns(worksheet, action.startCol, action.count),
  );

  return { ...state, workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook) };
}

function handleUnhideColumns(
  state: XlsxEditorState,
  action: UnhideColumnsAction,
): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return state;
  }

  const updatedWorkbook = updateWorksheetInWorkbook(
    state.workbookHistory.present,
    sheetIndex,
    (worksheet) => unhideColumns(worksheet, action.startCol, action.count),
  );

  return { ...state, workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook) };
}

export const rowColHandlers: HandlerMap = {
  INSERT_ROWS: handleInsertRows,
  DELETE_ROWS: handleDeleteRows,
  INSERT_COLUMNS: handleInsertColumns,
  DELETE_COLUMNS: handleDeleteColumns,
  SET_ROW_HEIGHT: handleSetRowHeight,
  SET_COLUMN_WIDTH: handleSetColumnWidth,
  HIDE_ROWS: handleHideRows,
  UNHIDE_ROWS: handleUnhideRows,
  HIDE_COLUMNS: handleHideColumns,
  UNHIDE_COLUMNS: handleUnhideColumns,
};

