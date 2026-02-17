/**
 * @file Data Validation handlers
 *
 * Handlers for data validation operations.
 */

import type { HandlerMap } from "./handler-types";
import type { XlsxEditorAction, XlsxEditorState } from "../types";
import { pushHistory } from "@aurochs-ui/editor-core/history";
import {
  setDataValidation,
  deleteDataValidation,
  clearDataValidations,
} from "../../../../sheet/data-validation-mutation";

type SetDataValidationAction = Extract<XlsxEditorAction, { type: "SET_DATA_VALIDATION" }>;
type DeleteDataValidationAction = Extract<XlsxEditorAction, { type: "DELETE_DATA_VALIDATION" }>;
type ClearDataValidationsAction = Extract<XlsxEditorAction, { type: "CLEAR_DATA_VALIDATIONS" }>;

function handleSetDataValidation(
  state: XlsxEditorState,
  action: SetDataValidationAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = setDataValidation(currentWorkbook, action.sheetIndex, action.validation);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

function handleDeleteDataValidation(
  state: XlsxEditorState,
  action: DeleteDataValidationAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = deleteDataValidation(currentWorkbook, action.sheetIndex, action.range);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

function handleClearDataValidations(
  state: XlsxEditorState,
  action: ClearDataValidationsAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = clearDataValidations(currentWorkbook, action.sheetIndex);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

export const dataValidationHandlers: HandlerMap = {
  SET_DATA_VALIDATION: handleSetDataValidation,
  DELETE_DATA_VALIDATION: handleDeleteDataValidation,
  CLEAR_DATA_VALIDATIONS: handleClearDataValidations,
};
