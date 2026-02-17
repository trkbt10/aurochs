/**
 * @file Conditional Formatting handlers
 *
 * Handlers for conditional formatting operations.
 */

import type { HandlerMap } from "./handler-types";
import type { XlsxEditorAction, XlsxEditorState } from "../types";
import { pushHistory } from "@aurochs-ui/editor-core/history";
import {
  addConditionalFormatting,
  deleteConditionalFormatting,
  clearConditionalFormattings,
} from "../../../../sheet/conditional-formatting-mutation";

type AddConditionalFormattingAction = Extract<XlsxEditorAction, { type: "ADD_CONDITIONAL_FORMATTING" }>;
type DeleteConditionalFormattingAction = Extract<XlsxEditorAction, { type: "DELETE_CONDITIONAL_FORMATTING" }>;
type ClearConditionalFormattingsAction = Extract<XlsxEditorAction, { type: "CLEAR_CONDITIONAL_FORMATTINGS" }>;

function handleAddConditionalFormatting(
  state: XlsxEditorState,
  action: AddConditionalFormattingAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = addConditionalFormatting(currentWorkbook, action.sheetIndex, action.formatting);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

function handleDeleteConditionalFormatting(
  state: XlsxEditorState,
  action: DeleteConditionalFormattingAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = deleteConditionalFormatting(currentWorkbook, action.sheetIndex, action.range);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

function handleClearConditionalFormattings(
  state: XlsxEditorState,
  action: ClearConditionalFormattingsAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = clearConditionalFormattings(currentWorkbook, action.sheetIndex);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

export const conditionalFormattingHandlers: HandlerMap = {
  ADD_CONDITIONAL_FORMATTING: handleAddConditionalFormatting,
  DELETE_CONDITIONAL_FORMATTING: handleDeleteConditionalFormatting,
  CLEAR_CONDITIONAL_FORMATTINGS: handleClearConditionalFormattings,
};
