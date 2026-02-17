/**
 * @file Table handlers
 *
 * Handlers for table (ListObject) operations.
 */

import type { HandlerMap } from "./handler-types";
import type { XlsxEditorAction, XlsxEditorState } from "../types";
import { pushHistory } from "@aurochs-ui/editor-core/history";
import {
  createTable,
  deleteTable,
  deleteTableAtRange,
  updateTableStyle,
} from "../../../../sheet/table-mutation";

type CreateTableAction = Extract<XlsxEditorAction, { type: "CREATE_TABLE" }>;
type DeleteTableAction = Extract<XlsxEditorAction, { type: "DELETE_TABLE" }>;
type DeleteTableAtRangeAction = Extract<XlsxEditorAction, { type: "DELETE_TABLE_AT_RANGE" }>;
type UpdateTableStyleAction = Extract<XlsxEditorAction, { type: "UPDATE_TABLE_STYLE" }>;

function handleCreateTable(
  state: XlsxEditorState,
  action: CreateTableAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  try {
    const newWorkbook = createTable(currentWorkbook, action.sheetIndex, action.range, {
      name: action.name,
      hasHeaderRow: action.hasHeaderRow,
    });
    return {
      ...state,
      workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
    };
  } catch {
    // Table creation failed (e.g., overlapping tables)
    return state;
  }
}

function handleDeleteTable(
  state: XlsxEditorState,
  action: DeleteTableAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = deleteTable(currentWorkbook, action.tableName);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

function handleDeleteTableAtRange(
  state: XlsxEditorState,
  action: DeleteTableAtRangeAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = deleteTableAtRange(currentWorkbook, action.sheetIndex, action.range);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

function handleUpdateTableStyle(
  state: XlsxEditorState,
  action: UpdateTableStyleAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = updateTableStyle(currentWorkbook, action.tableName, action.styleInfo);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

export const tableHandlers: HandlerMap = {
  CREATE_TABLE: handleCreateTable,
  DELETE_TABLE: handleDeleteTable,
  DELETE_TABLE_AT_RANGE: handleDeleteTableAtRange,
  UPDATE_TABLE_STYLE: handleUpdateTableStyle,
};
