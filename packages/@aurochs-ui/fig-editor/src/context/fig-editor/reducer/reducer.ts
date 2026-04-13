/**
 * @file Fig editor reducer
 *
 * Main reducer that composes all domain handlers.
 * Uses the handler-map pattern for O(1) dispatch.
 */

import type { FigDesignDocument, FigNodeId } from "@aurochs/fig/domain";
import type { FigEditorState, FigEditorAction } from "../types";
import { createSelectMode, createInactiveTextEditState } from "../types";
import type { HandlerMap, ActionHandler } from "./handler-types";
import { createHistory } from "@aurochs-ui/editor-core/history";
import { createEmptySelection } from "@aurochs-ui/editor-core/selection";
import { createIdleDragState } from "@aurochs-ui/editor-core/drag-state";

import { PAGE_HANDLERS } from "./page-handlers";
import { NODE_HANDLERS } from "./node-handlers";
import { SELECTION_HANDLERS } from "./selection-handlers";
import { DRAG_HANDLERS } from "./drag-handlers";
import { HISTORY_HANDLERS } from "./history-handlers";
import { CLIPBOARD_HANDLERS } from "./clipboard-handlers";
import { CREATION_HANDLERS } from "./creation-handlers";
import { TEXT_EDIT_HANDLERS } from "./text-edit-handlers";

/**
 * Combined handler map from all domains.
 */
const ALL_HANDLERS: HandlerMap = {
  ...PAGE_HANDLERS,
  ...NODE_HANDLERS,
  ...SELECTION_HANDLERS,
  ...DRAG_HANDLERS,
  ...HISTORY_HANDLERS,
  ...CLIPBOARD_HANDLERS,
  ...CREATION_HANDLERS,
  ...TEXT_EDIT_HANDLERS,
};

/**
 * Create the initial fig editor state from a document.
 */
export function createFigEditorState(document: FigDesignDocument): FigEditorState {
  const firstPageId = document.pages[0]?.id;
  return {
    documentHistory: createHistory(document),
    activePageId: firstPageId,
    nodeSelection: createEmptySelection<FigNodeId>(),
    drag: createIdleDragState(),
    clipboard: undefined,
    creationMode: createSelectMode(),
    textEdit: createInactiveTextEditState(),
    drillDownScope: undefined,
  };
}

/**
 * Fig editor reducer.
 *
 * Uses handler lookup for O(1) dispatch.
 */
export function figEditorReducer(
  state: FigEditorState,
  action: FigEditorAction,
): FigEditorState {
  const handler = ALL_HANDLERS[action.type] as ActionHandler | undefined;
  if (handler) {
    return handler(state, action);
  }
  return state;
}
