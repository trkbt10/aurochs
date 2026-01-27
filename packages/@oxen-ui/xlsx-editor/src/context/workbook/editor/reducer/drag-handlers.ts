/**
 * @file Drag operation handlers
 *
 * Handlers for spreadsheet drag operations: start, preview, commit, end.
 *
 * Drag operations follow a 3-stage pattern:
 * START → PREVIEW → COMMIT (history push)
 */

import type { XlsxEditorAction, XlsxEditorState } from "../types";
import type { HandlerMap } from "./handler-types";
import { pushHistory } from "../../state/history";
import { createRangeSelection, createSingleCellSelection } from "../../state/selection";
import {
  startRangeSelectDrag,
  updateRangeSelectDrag,
  startFillDrag,
  updateFillDrag,
  startRowResizeDrag,
  startColumnResizeDrag,
  endDrag,
} from "../../state/drag";
import { applyAutofillToWorksheet } from "../../../../cell/autofill";
import { setColumnWidth, setRowHeight } from "../../../../row-col/mutation";
import { updateWorksheetInWorkbook } from "../../utils/worksheet-updater";

type StartRangeSelectAction = Extract<
  XlsxEditorAction,
  { type: "START_RANGE_SELECT" }
>;
type PreviewRangeSelectAction = Extract<
  XlsxEditorAction,
  { type: "PREVIEW_RANGE_SELECT" }
>;
type StartFillDragAction = Extract<XlsxEditorAction, { type: "START_FILL_DRAG" }>;
type PreviewFillDragAction = Extract<
  XlsxEditorAction,
  { type: "PREVIEW_FILL_DRAG" }
>;
type StartRowResizeAction = Extract<
  XlsxEditorAction,
  { type: "START_ROW_RESIZE" }
>;
type PreviewRowResizeAction = Extract<
  XlsxEditorAction,
  { type: "PREVIEW_ROW_RESIZE" }
>;
type StartColumnResizeAction = Extract<
  XlsxEditorAction,
  { type: "START_COLUMN_RESIZE" }
>;
type PreviewColumnResizeAction = Extract<
  XlsxEditorAction,
  { type: "PREVIEW_COLUMN_RESIZE" }
>;

function handleStartRangeSelect(
  state: XlsxEditorState,
  action: StartRangeSelectAction,
): XlsxEditorState {
  return {
    ...state,
    drag: startRangeSelectDrag(action.startCell),
    cellSelection: createSingleCellSelection(action.startCell),
  };
}

function handlePreviewRangeSelect(
  state: XlsxEditorState,
  action: PreviewRangeSelectAction,
): XlsxEditorState {
  const updatedDrag = updateRangeSelectDrag(state.drag, action.currentCell);
  if (updatedDrag === state.drag || updatedDrag.type !== "rangeSelect") {
    return state;
  }

  const range = { start: updatedDrag.startCell, end: updatedDrag.currentCell };
  return {
    ...state,
    drag: updatedDrag,
    cellSelection: createRangeSelection(range, updatedDrag.startCell),
  };
}

function handleEndRangeSelect(state: XlsxEditorState): XlsxEditorState {
  const { drag } = state;
  if (drag.type !== "rangeSelect") {
    return state;
  }

  const range = { start: drag.startCell, end: drag.currentCell };
  return {
    ...state,
    drag: endDrag(),
    cellSelection: createRangeSelection(range, drag.startCell),
  };
}

function handleStartFillDrag(
  state: XlsxEditorState,
  action: StartFillDragAction,
): XlsxEditorState {
  return {
    ...state,
    drag: startFillDrag(action.sourceRange),
    cellSelection: createRangeSelection(action.sourceRange),
  };
}

function handlePreviewFillDrag(
  state: XlsxEditorState,
  action: PreviewFillDragAction,
): XlsxEditorState {
  const updatedDrag = updateFillDrag(state.drag, action.targetRange);
  if (updatedDrag === state.drag || updatedDrag.type !== "fill") {
    return state;
  }

  return {
    ...state,
    drag: updatedDrag,
    cellSelection: createRangeSelection(action.targetRange),
  };
}

function handleCommitFillDrag(state: XlsxEditorState): XlsxEditorState {
  const { drag } = state;
  if (drag.type !== "fill") {
    return state;
  }

  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return {
      ...state,
      drag: endDrag(),
      cellSelection: createRangeSelection(drag.targetRange),
    };
  }

  const updatedWorkbook = updateWorksheetInWorkbook(
    state.workbookHistory.present,
    sheetIndex,
    (worksheet) =>
      applyAutofillToWorksheet({
        worksheet,
        baseRange: drag.sourceRange,
        targetRange: drag.targetRange,
      }),
  );

  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
    drag: endDrag(),
    cellSelection: createRangeSelection(drag.targetRange),
  };
}

function handleStartRowResize(
  state: XlsxEditorState,
  action: StartRowResizeAction,
): XlsxEditorState {
  return {
    ...state,
    drag: startRowResizeDrag(action.rowIndex, action.startY, action.originalHeight),
  };
}

function handlePreviewRowResize(
  state: XlsxEditorState,
  action: PreviewRowResizeAction,
): XlsxEditorState {
  const { drag } = state;
  if (drag.type !== "rowResize") {
    return state;
  }

  return {
    ...state,
    drag: { ...drag, originalHeight: action.newHeight },
  };
}

function handleCommitRowResize(state: XlsxEditorState): XlsxEditorState {
  const { drag } = state;
  if (drag.type !== "rowResize") {
    return state;
  }

  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return { ...state, drag: endDrag() };
  }

  const updatedWorkbook = updateWorksheetInWorkbook(
    state.workbookHistory.present,
    sheetIndex,
    (worksheet) => setRowHeight(worksheet, drag.rowIndex, drag.originalHeight),
  );

  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
    drag: endDrag(),
  };
}

function handleStartColumnResize(
  state: XlsxEditorState,
  action: StartColumnResizeAction,
): XlsxEditorState {
  return {
    ...state,
    drag: startColumnResizeDrag(
      action.colIndex,
      action.startX,
      action.originalWidth,
    ),
  };
}

function handlePreviewColumnResize(
  state: XlsxEditorState,
  action: PreviewColumnResizeAction,
): XlsxEditorState {
  const { drag } = state;
  if (drag.type !== "columnResize") {
    return state;
  }

  return {
    ...state,
    drag: { ...drag, originalWidth: action.newWidth },
  };
}

function handleCommitColumnResize(state: XlsxEditorState): XlsxEditorState {
  const { drag } = state;
  if (drag.type !== "columnResize") {
    return state;
  }

  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return { ...state, drag: endDrag() };
  }

  const updatedWorkbook = updateWorksheetInWorkbook(
    state.workbookHistory.present,
    sheetIndex,
    (worksheet) => setColumnWidth(worksheet, drag.colIndex, drag.originalWidth),
  );

  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
    drag: endDrag(),
  };
}

export const dragHandlers: HandlerMap = {
  START_RANGE_SELECT: handleStartRangeSelect,
  PREVIEW_RANGE_SELECT: handlePreviewRangeSelect,
  END_RANGE_SELECT: (state) => handleEndRangeSelect(state),
  START_FILL_DRAG: handleStartFillDrag,
  PREVIEW_FILL_DRAG: handlePreviewFillDrag,
  COMMIT_FILL_DRAG: (state) => handleCommitFillDrag(state),
  START_ROW_RESIZE: handleStartRowResize,
  PREVIEW_ROW_RESIZE: handlePreviewRowResize,
  COMMIT_ROW_RESIZE: (state) => handleCommitRowResize(state),
  START_COLUMN_RESIZE: handleStartColumnResize,
  PREVIEW_COLUMN_RESIZE: handlePreviewColumnResize,
  COMMIT_COLUMN_RESIZE: (state) => handleCommitColumnResize(state),
  END_DRAG: (state) => ({ ...state, drag: endDrag() }),
};
