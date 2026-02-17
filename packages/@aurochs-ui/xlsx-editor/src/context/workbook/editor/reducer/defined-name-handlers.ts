/**
 * @file Defined Name handlers
 *
 * Handlers for defined name operations.
 */

import type { HandlerMap } from "./handler-types";
import type { XlsxEditorAction, XlsxEditorState } from "../types";
import { pushHistory } from "@aurochs-ui/editor-core/history";
import {
  addDefinedName,
  updateDefinedName,
  deleteDefinedName,
} from "../../../../sheet/defined-name-mutation";

type AddDefinedNameAction = Extract<XlsxEditorAction, { type: "ADD_DEFINED_NAME" }>;
type UpdateDefinedNameAction = Extract<XlsxEditorAction, { type: "UPDATE_DEFINED_NAME" }>;
type DeleteDefinedNameAction = Extract<XlsxEditorAction, { type: "DELETE_DEFINED_NAME" }>;

function handleAddDefinedName(
  state: XlsxEditorState,
  action: AddDefinedNameAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  try {
    const newWorkbook = addDefinedName(currentWorkbook, action.definedName);
    return {
      ...state,
      workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
    };
  } catch {
    // Name already exists
    return state;
  }
}

function handleUpdateDefinedName(
  state: XlsxEditorState,
  action: UpdateDefinedNameAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  try {
    const newWorkbook = updateDefinedName(
      currentWorkbook,
      action.oldName,
      action.oldLocalSheetId,
      action.definedName,
    );
    return {
      ...state,
      workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
    };
  } catch {
    // Name conflict
    return state;
  }
}

function handleDeleteDefinedName(
  state: XlsxEditorState,
  action: DeleteDefinedNameAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = deleteDefinedName(currentWorkbook, action.name, action.localSheetId);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

export const definedNameHandlers: HandlerMap = {
  ADD_DEFINED_NAME: handleAddDefinedName,
  UPDATE_DEFINED_NAME: handleUpdateDefinedName,
  DELETE_DEFINED_NAME: handleDeleteDefinedName,
};
