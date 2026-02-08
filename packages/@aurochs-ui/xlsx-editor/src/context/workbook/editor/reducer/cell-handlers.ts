/**
 * @file Cell mutation handlers
 *
 * Handlers for cell operations on the active worksheet.
 */

import type { XlsxEditorAction, XlsxEditorState } from "../types";
import type { HandlerMap } from "./handler-types";
import { pushHistory } from "@aurochs-ui/editor-core/history";
import {
  updateCell,
  deleteCellRange,
  clearCellContents,
  clearCellFormats,
  setCellFormula,
} from "../../../../cell/mutation";
import { updateWorksheetInWorkbook } from "../../utils/worksheet-updater";

type UpdateCellAction = Extract<XlsxEditorAction, { type: "UPDATE_CELL" }>;
type UpdateCellsAction = Extract<XlsxEditorAction, { type: "UPDATE_CELLS" }>;
type DeleteCellsAction = Extract<XlsxEditorAction, { type: "DELETE_CELLS" }>;
type SetCellFormulaAction = Extract<XlsxEditorAction, { type: "SET_CELL_FORMULA" }>;
type ClearCellContentsAction = Extract<XlsxEditorAction, { type: "CLEAR_CELL_CONTENTS" }>;
type ClearCellFormatsAction = Extract<XlsxEditorAction, { type: "CLEAR_CELL_FORMATS" }>;

function handleUpdateCell(state: XlsxEditorState, action: UpdateCellAction): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return state;
  }

  const updatedWorkbook = updateWorksheetInWorkbook(state.workbookHistory.present, sheetIndex, (worksheet) =>
    updateCell(worksheet, action.address, action.value),
  );

  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
  };
}

function handleUpdateCells(state: XlsxEditorState, action: UpdateCellsAction): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return state;
  }

  const updatedWorkbook = updateWorksheetInWorkbook(state.workbookHistory.present, sheetIndex, (worksheet) =>
    action.updates.reduce((current, update) => updateCell(current, update.address, update.value), worksheet),
  );

  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
  };
}

function handleDeleteCells(state: XlsxEditorState, action: DeleteCellsAction): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return state;
  }

  const updatedWorkbook = updateWorksheetInWorkbook(state.workbookHistory.present, sheetIndex, (worksheet) =>
    deleteCellRange(worksheet, action.range),
  );

  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
  };
}

function handleSetCellFormula(state: XlsxEditorState, action: SetCellFormulaAction): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return state;
  }

  const updatedWorkbook = updateWorksheetInWorkbook(state.workbookHistory.present, sheetIndex, (worksheet) =>
    setCellFormula(worksheet, action.address, action.formula),
  );

  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
  };
}

function handleClearCellContents(state: XlsxEditorState, action: ClearCellContentsAction): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return state;
  }

  const updatedWorkbook = updateWorksheetInWorkbook(state.workbookHistory.present, sheetIndex, (worksheet) =>
    clearCellContents(worksheet, action.range),
  );

  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
  };
}

function handleClearCellFormats(state: XlsxEditorState, action: ClearCellFormatsAction): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return state;
  }

  const updatedWorkbook = updateWorksheetInWorkbook(state.workbookHistory.present, sheetIndex, (worksheet) =>
    clearCellFormats(worksheet, action.range),
  );

  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
  };
}

export const cellHandlers: HandlerMap = {
  UPDATE_CELL: handleUpdateCell,
  UPDATE_CELLS: handleUpdateCells,
  DELETE_CELLS: handleDeleteCells,
  SET_CELL_FORMULA: handleSetCellFormula,
  CLEAR_CELL_CONTENTS: handleClearCellContents,
  CLEAR_CELL_FORMATS: handleClearCellFormats,
};
