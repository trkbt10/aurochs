/**
 * @file Auto Filter handlers
 *
 * Handlers for auto filter operations.
 */

import type { HandlerMap } from "./handler-types";
import type { XlsxEditorAction, XlsxEditorState } from "../types";
import { pushHistory } from "@aurochs-ui/editor-core/history";
import {
  setAutoFilter,
  setFilterColumn,
  applySort,
  clearAllFilters,
} from "../../../../sheet/auto-filter-mutation";

type SetAutoFilterAction = Extract<XlsxEditorAction, { type: "SET_AUTO_FILTER" }>;
type SetFilterColumnAction = Extract<XlsxEditorAction, { type: "SET_FILTER_COLUMN" }>;
type ApplySortAction = Extract<XlsxEditorAction, { type: "APPLY_SORT" }>;
type ClearAllFiltersAction = Extract<XlsxEditorAction, { type: "CLEAR_ALL_FILTERS" }>;

function handleSetAutoFilter(
  state: XlsxEditorState,
  action: SetAutoFilterAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = setAutoFilter(currentWorkbook, action.sheetIndex, action.autoFilter);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

function handleSetFilterColumn(
  state: XlsxEditorState,
  action: SetFilterColumnAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = setFilterColumn(currentWorkbook, action.sheetIndex, action.colId, action.filter);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

function handleApplySort(
  state: XlsxEditorState,
  action: ApplySortAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = applySort(currentWorkbook, action.sheetIndex, action.sortCondition);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

function handleClearAllFilters(
  state: XlsxEditorState,
  action: ClearAllFiltersAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = clearAllFilters(currentWorkbook, action.sheetIndex);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

export const autoFilterHandlers: HandlerMap = {
  SET_AUTO_FILTER: handleSetAutoFilter,
  SET_FILTER_COLUMN: handleSetFilterColumn,
  APPLY_SORT: handleApplySort,
  CLEAR_ALL_FILTERS: handleClearAllFilters,
};
