/**
 * @file DOCX Editor Module Index
 *
 * Re-exports all editor types, state, and reducer.
 */

// Types
export {
  type EditorMode,
  type TextEditState,
  type DocxEditorState,
  type DocxEditorAction,
  type DocxEditorActionType,
  createInitialTextEditState,
} from "./types";

// Reducer
export {
  reducer,
  createInitialState,
  createEmptyEditorState,
  ALL_HANDLERS,
  type ActionHandler,
  type HandlerMap,
  createHandler,
  combineHandlers,
  // Individual handlers for extension
  historyHandlers,
  selectionHandlers,
  dragHandlers,
  clipboardHandlers,
  textEditHandlers,
  formatHandlers,
  documentHandlers,
} from "./reducer";
