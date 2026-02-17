/**
 * @file XLSX Editor Reducer
 *
 * Main reducer for the xlsx-editor state management.
 */

import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import { createHistory } from "@aurochs-ui/editor-core/history";
import type { XlsxEditorState, XlsxEditorAction } from "../types";
import { createEmptyCellSelection, createIdleDragState } from "../types";
import type { HandlerMap } from "./handler-types";
import { cellHandlers } from "./cell-handlers";
import { selectionHandlers } from "./selection-handlers";
import { dragHandlers } from "./drag-handlers";
import { sheetHandlers } from "./sheet-handlers";
import { clipboardHandlers } from "./clipboard-handlers";
import { undoRedoHandlers } from "./undo-redo-handlers";
import { editingHandlers } from "./editing-handlers";
import { rowColHandlers } from "./row-col-handlers";
import { formattingHandlers } from "./formatting-handlers";
import { pageSetupHandlers } from "./page-setup-handlers";
import { commentHandlers } from "./comment-handlers";
import { hyperlinkHandlers } from "./hyperlink-handlers";
import { protectionHandlers } from "./protection-handlers";
import { autoFilterHandlers } from "./auto-filter-handlers";
import { dataValidationHandlers } from "./data-validation-handlers";
import { conditionalFormattingHandlers } from "./conditional-formatting-handlers";
import { sheetViewHandlers } from "./sheet-view-handlers";
import { tableHandlers } from "./table-handlers";
import { definedNameHandlers } from "./defined-name-handlers";

const handlers: HandlerMap = {
  ...cellHandlers,
  ...selectionHandlers,
  ...dragHandlers,
  ...sheetHandlers,
  ...rowColHandlers,
  ...formattingHandlers,
  ...clipboardHandlers,
  ...undoRedoHandlers,
  ...editingHandlers,
  ...pageSetupHandlers,
  ...commentHandlers,
  ...hyperlinkHandlers,
  ...protectionHandlers,
  ...autoFilterHandlers,
  ...dataValidationHandlers,
  ...conditionalFormattingHandlers,
  ...sheetViewHandlers,
  ...tableHandlers,
  ...definedNameHandlers,
};

/**
 * XLSX Editor Reducer
 */
export function xlsxEditorReducer(state: XlsxEditorState, action: XlsxEditorAction): XlsxEditorState {
  const handler = handlers[action.type];
  if (handler) {
    return handler(state, action as never);
  }
  return state;
}

/**
 * Create initial editor state
 */
export function createInitialState(workbook: XlsxWorkbook): XlsxEditorState {
  return {
    workbookHistory: createHistory(workbook),
    activeSheetIndex: workbook.sheets.length > 0 ? 0 : undefined,
    cellSelection: createEmptyCellSelection(),
    drag: createIdleDragState(),
    clipboard: undefined,
    editing: undefined,
  };
}
