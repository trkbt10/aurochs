/**
 * @file Hyperlink handlers
 *
 * Handlers for cell hyperlink operations.
 */

import type { HandlerMap } from "./handler-types";
import type { XlsxEditorAction, XlsxEditorState } from "../types";
import { pushHistory } from "@aurochs-ui/editor-core/history";
import { setHyperlink, deleteHyperlink } from "../../../../sheet/hyperlink-mutation";

type SetHyperlinkAction = Extract<XlsxEditorAction, { type: "SET_HYPERLINK" }>;
type DeleteHyperlinkAction = Extract<XlsxEditorAction, { type: "DELETE_HYPERLINK" }>;

function handleSetHyperlink(state: XlsxEditorState, action: SetHyperlinkAction): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = setHyperlink(currentWorkbook, action.sheetIndex, action.hyperlink);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

function handleDeleteHyperlink(state: XlsxEditorState, action: DeleteHyperlinkAction): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = deleteHyperlink(currentWorkbook, action.sheetIndex, action.address);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

export const hyperlinkHandlers: HandlerMap = {
  SET_HYPERLINK: handleSetHyperlink,
  DELETE_HYPERLINK: handleDeleteHyperlink,
};
