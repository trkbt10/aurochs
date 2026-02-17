/**
 * @file Sheet View handlers
 *
 * Handlers for sheet view operations (freeze panes, split view).
 */

import type { HandlerMap } from "./handler-types";
import type { XlsxEditorAction, XlsxEditorState } from "../types";
import { pushHistory } from "@aurochs-ui/editor-core/history";
import {
  setFreezePane,
  freezeRows,
  freezeColumns,
  freezeRowsAndColumns,
  unfreezePanes,
} from "../../../../sheet/sheet-view-mutation";

type SetFreezePaneAction = Extract<XlsxEditorAction, { type: "SET_FREEZE_PANE" }>;
type FreezeRowsAction = Extract<XlsxEditorAction, { type: "FREEZE_ROWS" }>;
type FreezeColumnsAction = Extract<XlsxEditorAction, { type: "FREEZE_COLUMNS" }>;
type FreezeRowsAndColumnsAction = Extract<XlsxEditorAction, { type: "FREEZE_ROWS_AND_COLUMNS" }>;
type UnfreezePanesAction = Extract<XlsxEditorAction, { type: "UNFREEZE_PANES" }>;

function handleSetFreezePane(
  state: XlsxEditorState,
  action: SetFreezePaneAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = setFreezePane(currentWorkbook, action.sheetIndex, action.pane);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

function handleFreezeRows(
  state: XlsxEditorState,
  action: FreezeRowsAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = freezeRows(currentWorkbook, action.sheetIndex, action.rowCount);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

function handleFreezeColumns(
  state: XlsxEditorState,
  action: FreezeColumnsAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = freezeColumns(currentWorkbook, action.sheetIndex, action.colCount);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

function handleFreezeRowsAndColumns(
  state: XlsxEditorState,
  action: FreezeRowsAndColumnsAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = freezeRowsAndColumns(
    currentWorkbook,
    action.sheetIndex,
    action.rowCount,
    action.colCount,
  );
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

function handleUnfreezePanes(
  state: XlsxEditorState,
  action: UnfreezePanesAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = unfreezePanes(currentWorkbook, action.sheetIndex);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

export const sheetViewHandlers: HandlerMap = {
  SET_FREEZE_PANE: handleSetFreezePane,
  FREEZE_ROWS: handleFreezeRows,
  FREEZE_COLUMNS: handleFreezeColumns,
  FREEZE_ROWS_AND_COLUMNS: handleFreezeRowsAndColumns,
  UNFREEZE_PANES: handleUnfreezePanes,
};
