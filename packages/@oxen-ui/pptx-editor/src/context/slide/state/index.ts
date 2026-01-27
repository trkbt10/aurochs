/**
 * @file State module entry point
 *
 * Editor state management utilities.
 * This module provides generic state management primitives
 * used across slide and presentation editors.
 */

// =============================================================================
// History
// =============================================================================
export {
  createHistory,
  pushHistory,
  undoHistory,
  redoHistory,
  canUndo,
  canRedo,
} from "./history";
export type { UndoRedoHistory } from "./history";

// =============================================================================
// Selection
// =============================================================================
export {
  createEmptySelection,
  createSingleSelection,
  createMultiSelection,
  addToSelection,
  removeFromSelection,
  toggleSelection,
  isSelected,
  isSelectionEmpty,
} from "./selection";
export type { SelectionState } from "./selection";

// =============================================================================
// Drag
// =============================================================================
export {
  createIdleDragState,
  isDragIdle,
  isDragMove,
  isDragResize,
  isDragRotate,
  isDragCreate,
} from "./drag";
export type {
  ResizeHandlePosition,
  PreviewDelta,
  IdleDragState,
  MoveDragState,
  ResizeDragState,
  RotateDragState,
  CreateDragState,
  DragState,
} from "./drag";

// =============================================================================
// Clipboard
// =============================================================================
export { createClipboardContent, incrementPasteCount } from "./clipboard";
export type { ClipboardContent } from "./clipboard";

// =============================================================================
// Path Draw
// =============================================================================
export {
  createIdlePathDrawState,
  createDrawingPathDrawState,
  createPencilDrawingState,
  isPathDrawIdle,
  isPathDrawDrawing,
  isPathDrawDraggingHandle,
  isPathDrawPencil,
  updateDrawingPath,
  setHoverPointIndex,
  setPreviewPoint,
  startHandleDrag,
  updateHandleDrag,
  addPencilPoint,
} from "./path-draw";
export type {
  IdlePathDrawState,
  DrawingPathDrawState,
  HandleDragPathDrawState,
  PencilDrawingPathDrawState,
  PathDrawState,
  PathDrawAction,
} from "./path-draw";

// =============================================================================
// Path Edit
// =============================================================================
export {
  createInactivePathEditState,
  createActivePathEditState,
  createDefaultPathEditTool,
  isPathEditInactive,
  isPathEditActive,
  isPathEditMovingPoints,
  isPathEditMovingHandle,
  isPathEditEditing,
  updatePathSelection,
  updatePathEditTool,
  startMovingPoints,
  updateMovingPointsPreview,
  startMovingHandle,
  updateMovingHandle,
  returnToActiveState,
} from "./path-edit";
export type {
  InactivePathEditState,
  ActivePathEditState,
  MovingPointsPathEditState,
  MovingHandlePathEditState,
  PathEditState,
  PathEditTool,
  PathEditAction,
} from "./path-edit";
