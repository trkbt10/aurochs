/**
 * @file Presentation editor reducer
 *
 * Main reducer that composes all domain handlers.
 */

import type { PresentationDocument } from "@oxen/pptx/app";
import type { PresentationEditorState, PresentationEditorAction } from "../types";
import { createSelectMode, createSlideEditorMode } from "../types";
import type { HandlerMap, ActionHandler } from "./handler-types";
import {
  createHistory,
  createEmptySelection,
  createIdleDragState,
  createIdlePathDrawState,
  createInactivePathEditState,
} from "../../../slide/state";
import { createInactiveTextEditState } from "../../../../slide/text-edit";

// Import all handlers
import { SLIDE_HANDLERS } from "./slide-handlers";
import { SHAPE_HANDLERS } from "./shape-handlers";
import { SELECTION_HANDLERS } from "./selection-handlers";
import { DRAG_HANDLERS } from "./drag-handlers";
import { HISTORY_HANDLERS } from "./history-handlers";
import { CLIPBOARD_HANDLERS } from "./clipboard-handlers";
import { CREATION_HANDLERS } from "./creation-handlers";
import { TEXT_EDIT_HANDLERS } from "./text-edit-handlers";
import { PATH_DRAW_HANDLERS } from "./path-draw-handlers";
import { PATH_EDIT_HANDLERS } from "./path-edit-handlers";
import { THEME_HANDLERS } from "./theme-handlers";
import { LAYOUT_HANDLERS } from "./layout-handlers";

/**
 * Combined handler map from all domains
 */
const ALL_HANDLERS: HandlerMap = {
  ...SLIDE_HANDLERS,
  ...SHAPE_HANDLERS,
  ...SELECTION_HANDLERS,
  ...DRAG_HANDLERS,
  ...HISTORY_HANDLERS,
  ...CLIPBOARD_HANDLERS,
  ...CREATION_HANDLERS,
  ...TEXT_EDIT_HANDLERS,
  ...PATH_DRAW_HANDLERS,
  ...PATH_EDIT_HANDLERS,
  ...THEME_HANDLERS,
  ...LAYOUT_HANDLERS,
};

/**
 * Create initial presentation editor state
 */
export function createPresentationEditorState(
  document: PresentationDocument
): PresentationEditorState {
  const firstSlideId = document.slides[0]?.id;
  return {
    documentHistory: createHistory(document),
    activeSlideId: firstSlideId,
    shapeSelection: createEmptySelection(),
    drag: createIdleDragState(),
    clipboard: undefined,
    creationMode: createSelectMode(),
    textEdit: createInactiveTextEditState(),
    pathDraw: createIdlePathDrawState(),
    pathEdit: createInactivePathEditState(),
    editorMode: createSlideEditorMode(),
    layoutEdit: {
      activeLayoutPath: undefined,
      layoutShapes: [],
      layoutBundle: undefined,
      layoutSelection: createEmptySelection(),
      layoutDrag: createIdleDragState(),
      isDirty: false,
    },
  };
}

/**
 * Presentation editor reducer
 *
 * Uses handler lookup pattern for O(1) dispatch.
 */
export function presentationEditorReducer(
  state: PresentationEditorState,
  action: PresentationEditorAction
): PresentationEditorState {
  const handler = ALL_HANDLERS[action.type] as ActionHandler | undefined;
  if (handler) {
    return handler(state, action);
  }
  return state;
}
