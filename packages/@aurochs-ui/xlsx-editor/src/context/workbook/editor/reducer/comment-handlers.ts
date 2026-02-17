/**
 * @file Comment handlers
 *
 * Handlers for cell comment operations.
 */

import type { HandlerMap } from "./handler-types";
import type { XlsxEditorAction, XlsxEditorState } from "../types";
import { pushHistory } from "@aurochs-ui/editor-core/history";
import { setComment, deleteComment } from "../../../../sheet/comment-mutation";

type SetCommentAction = Extract<XlsxEditorAction, { type: "SET_COMMENT" }>;
type DeleteCommentAction = Extract<XlsxEditorAction, { type: "DELETE_COMMENT" }>;

function handleSetComment(state: XlsxEditorState, action: SetCommentAction): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = setComment(currentWorkbook, action.sheetIndex, action.comment);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

function handleDeleteComment(state: XlsxEditorState, action: DeleteCommentAction): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = deleteComment(currentWorkbook, action.sheetIndex, action.address);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

export const commentHandlers: HandlerMap = {
  SET_COMMENT: handleSetComment,
  DELETE_COMMENT: handleDeleteComment,
};
