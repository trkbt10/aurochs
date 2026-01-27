/**
 * @file DOCX Editor State Module Index
 *
 * Re-exports all state types and utilities for the DOCX editor.
 */

// History state
export {
  type UndoRedoHistory,
  createHistory,
  pushHistory,
  undoHistory,
  redoHistory,
  canUndo,
  canRedo,
  undoCount,
  redoCount,
  clearHistory,
  replacePresent,
} from "./history";

// Selection state
export {
  type ElementId,
  type TextPosition,
  type TextRange,
  type ElementSelectionState,
  type TextSelectionState,
  type DocxSelectionState,
  // Element selection
  createEmptyElementSelection,
  createSingleElementSelection,
  createMultiElementSelection,
  addToElementSelection,
  removeFromElementSelection,
  toggleElementSelection,
  setElementSelection,
  isElementSelected,
  isElementSelectionEmpty,
  getElementSelectionCount,
  // Text selection
  createEmptyTextSelection,
  createCursorSelection,
  createRangeSelection,
  extendTextSelection,
  collapseTextSelection,
  isTextSelectionEmpty,
  isPositionInTextSelection,
  // Combined selection
  createEmptyDocxSelection,
  switchToElementMode,
  switchToTextMode,
  // Helpers
  comparePositions,
} from "./selection";

// Drag state
export {
  type Point,
  type IdleDragState,
  type TextSelectDragState,
  type ElementMoveDragState,
  type TableResizeDragState,
  type ImageResizeDragState,
  type DocxDragState,
  // Factory functions
  createIdleDragState,
  createTextSelectDragState,
  createElementMoveDragState,
  createTableResizeDragState,
  createImageResizeDragState,
  // Update functions
  updateTextSelectDrag,
  updateElementMoveDrag,
  updateTableResizeDrag,
  updateImageResizeDrag,
  // Type guards
  isDragIdle,
  isDragTextSelect,
  isDragElementMove,
  isDragTableResize,
  isDragImageResize,
  isDragging,
  // Utilities
  getDragDelta,
  getResizeDelta,
} from "./drag";

// Clipboard state
export {
  type ParagraphClipboardContent,
  type TableClipboardContent,
  type TextClipboardContent,
  type DocxClipboardContent,
  // Factory functions
  createParagraphClipboard,
  createTableClipboard,
  createTextClipboard,
  // Type guards
  isParagraphClipboard,
  isTableClipboard,
  isTextClipboard,
  // Utilities
  getClipboardPlainText,
  markAsCut,
  markAsCopy,
} from "./clipboard";
