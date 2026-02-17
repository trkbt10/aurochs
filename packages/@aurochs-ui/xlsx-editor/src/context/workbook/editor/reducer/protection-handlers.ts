/**
 * @file Protection handlers
 *
 * Handlers for workbook and sheet protection operations.
 */

import type { HandlerMap } from "./handler-types";
import type { XlsxEditorAction, XlsxEditorState } from "../types";
import { pushHistory } from "@aurochs-ui/editor-core/history";
import { setWorkbookProtection, setSheetProtection } from "../../../../sheet/protection-mutation";

type SetWorkbookProtectionAction = Extract<XlsxEditorAction, { type: "SET_WORKBOOK_PROTECTION" }>;
type SetSheetProtectionAction = Extract<XlsxEditorAction, { type: "SET_SHEET_PROTECTION" }>;

function handleSetWorkbookProtection(
  state: XlsxEditorState,
  action: SetWorkbookProtectionAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = setWorkbookProtection(currentWorkbook, action.protection);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

function handleSetSheetProtection(
  state: XlsxEditorState,
  action: SetSheetProtectionAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = setSheetProtection(currentWorkbook, action.sheetIndex, action.protection);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

export const protectionHandlers: HandlerMap = {
  SET_WORKBOOK_PROTECTION: handleSetWorkbookProtection,
  SET_SHEET_PROTECTION: handleSetSheetProtection,
};
