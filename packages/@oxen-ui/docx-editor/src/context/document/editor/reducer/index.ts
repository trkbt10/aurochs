/**
 * @file DOCX Editor Reducer Module Index
 *
 * Re-exports all reducer-related types and functions.
 */

// Main reducer
export {
  reducer,
  createInitialState,
  createEmptyEditorState,
  ALL_HANDLERS,
} from "./reducer";

// Handler types
export {
  type ActionHandler,
  type HandlerMap,
  createHandler,
  combineHandlers,
} from "./handler-types";

// Individual handler maps (for testing/extension)
export { historyHandlers } from "./history-handlers";
export { selectionHandlers } from "./selection-handlers";
export { dragHandlers } from "./drag-handlers";
export { clipboardHandlers } from "./clipboard-handlers";
export { textEditHandlers } from "./text-edit-handlers";
export { formatHandlers } from "./format-handlers";
export { documentHandlers } from "./document-handlers";
