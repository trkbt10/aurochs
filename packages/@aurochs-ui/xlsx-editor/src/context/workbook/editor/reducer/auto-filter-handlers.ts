/**
 * @file Auto Filter handlers
 *
 * Handlers for auto filter operations.
 */

import type { HandlerMap } from "./handler-types";
import type { XlsxEditorAction, XlsxEditorState } from "../types";
import { pushHistory } from "@aurochs-ui/editor-core/history";
import { setAutoFilter } from "../../../../sheet/auto-filter-mutation";

type SetAutoFilterAction = Extract<XlsxEditorAction, { type: "SET_AUTO_FILTER" }>;

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

export const autoFilterHandlers: HandlerMap = {
  SET_AUTO_FILTER: handleSetAutoFilter,
};
