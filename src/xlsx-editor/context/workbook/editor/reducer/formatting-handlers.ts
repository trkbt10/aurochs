/**
 * @file Formatting mutation handlers
 *
 * Handlers for formatting operations like applying styles and merge/unmerge.
 */

import type { XlsxEditorAction, XlsxEditorState } from "../types";
import type { HandlerMap } from "./handler-types";
import { pushHistory } from "../../state/history";
import { updateWorksheetInWorkbook } from "../../utils/worksheet-updater";
import { applyStyleToRange } from "../../../../cell/style-mutation";
import { mergeCells, unmergeCells } from "../../../../sheet/merge-mutation";

type ApplyStyleAction = Extract<XlsxEditorAction, { type: "APPLY_STYLE" }>;
type MergeCellsAction = Extract<XlsxEditorAction, { type: "MERGE_CELLS" }>;
type UnmergeCellsAction = Extract<XlsxEditorAction, { type: "UNMERGE_CELLS" }>;

function handleApplyStyle(
  state: XlsxEditorState,
  action: ApplyStyleAction,
): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return state;
  }

  const updatedWorkbook = updateWorksheetInWorkbook(
    state.workbookHistory.present,
    sheetIndex,
    (worksheet) => applyStyleToRange(worksheet, action.range, action.styleId),
  );

  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
  };
}

export const formattingHandlers: HandlerMap = {
  APPLY_STYLE: handleApplyStyle,
  MERGE_CELLS: (state: XlsxEditorState, action: MergeCellsAction) => {
    const sheetIndex = state.activeSheetIndex;
    if (sheetIndex === undefined) {
      return state;
    }

    const updatedWorkbook = updateWorksheetInWorkbook(
      state.workbookHistory.present,
      sheetIndex,
      (worksheet) => mergeCells(worksheet, action.range),
    );

    return {
      ...state,
      workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
    };
  },
  UNMERGE_CELLS: (state: XlsxEditorState, action: UnmergeCellsAction) => {
    const sheetIndex = state.activeSheetIndex;
    if (sheetIndex === undefined) {
      return state;
    }

    const updatedWorkbook = updateWorksheetInWorkbook(
      state.workbookHistory.present,
      sheetIndex,
      (worksheet) => unmergeCells(worksheet, action.range),
    );

    return {
      ...state,
      workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
    };
  },
};
