/**
 * @file Editing handlers
 *
 * Handlers for inline cell editing state and commit behavior.
 */

import type { XlsxEditorAction, XlsxEditorState } from "../types";
import type { HandlerMap } from "./handler-types";
import { pushHistory } from "../../state/history";
import { updateCell } from "../../../../cell/mutation";
import { updateWorksheetInWorkbook } from "../../utils/worksheet-updater";

type EnterCellEditAction = Extract<XlsxEditorAction, { type: "ENTER_CELL_EDIT" }>;
type CommitCellEditAction = Extract<
  XlsxEditorAction,
  { type: "COMMIT_CELL_EDIT" }
>;

function handleEnterCellEdit(
  state: XlsxEditorState,
  action: EnterCellEditAction,
): XlsxEditorState {
  return {
    ...state,
    editingCell: action.address,
  };
}

function handleCommitCellEdit(
  state: XlsxEditorState,
  action: CommitCellEditAction,
): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    throw new Error("activeSheetIndex is required to commit cell edit");
  }

  const address = state.editingCell;
  if (!address) {
    throw new Error("editingCell is required to commit cell edit");
  }

  const updatedWorkbook = updateWorksheetInWorkbook(
    state.workbookHistory.present,
    sheetIndex,
    (worksheet) => updateCell(worksheet, address, action.value),
  );

  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
    editingCell: undefined,
  };
}

export const editingHandlers: HandlerMap = {
  ENTER_CELL_EDIT: handleEnterCellEdit,
  EXIT_CELL_EDIT: (state) => ({ ...state, editingCell: undefined }),
  COMMIT_CELL_EDIT: handleCommitCellEdit,
};

