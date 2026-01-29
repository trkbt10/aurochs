/**
 * @file @oxen-ui/editor-core public exports
 */

export type { UndoRedoHistory } from "./history";
export {
  canRedo,
  canUndo,
  clearHistory,
  createHistory,
  pushHistory,
  redoCount,
  redoHistory,
  replacePresent,
  undoCount,
  undoHistory,
} from "./history";

export type { SelectionPrimaryFallback, SelectionState } from "./selection";
export {
  addToSelection,
  createEmptySelection,
  createMultiSelection,
  createSingleSelection,
  isSelected,
  isSelectionEmpty,
  removeFromSelection,
  toggleSelection,
} from "./selection";

export type { ClipboardContent } from "./clipboard";
export {
  createClipboardContent,
  incrementPasteCount,
  markAsCopy,
  markAsCut,
} from "./clipboard";

export type { IdleDragState } from "./drag-state";
export { createIdleDragState, isDragIdle } from "./drag-state";

export type { PrimaryMouseEventLike, PrimaryPointerEventLike, TextareaSelectionLike } from "./pointer-utils";
export { applySelectionRange, getSelectionAnchor, isPrimaryMouseAction, isPrimaryPointerAction } from "./pointer-utils";
