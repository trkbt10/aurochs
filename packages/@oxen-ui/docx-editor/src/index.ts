/**
 * @file DOCX Editor Module Index
 *
 * Main entry point for the DOCX editor module.
 * Provides state management, selection, and editing capabilities.
 */

// State utilities
export {
  type DocxClipboardContent,
  type DocxDragState,
  type DocxSelectionState,
  type ElementId,
  type ElementMoveDragState,
  type ElementSelectionState,
  type IdleDragState,
  type ImageResizeDragState,
  type ParagraphClipboardContent,
  type Point,
  type TableClipboardContent,
  type TableResizeDragState,
  type TextClipboardContent,
  type TextPosition,
  type TextRange,
  type TextSelectDragState,
  type TextSelectionState,
  type UndoRedoHistory,
  addToElementSelection,
  canRedo,
  canUndo,
  clearHistory,
  collapseTextSelection,
  comparePositions,
  createCursorSelection,
  createElementMoveDragState,
  createEmptyDocxSelection,
  createEmptyElementSelection,
  createEmptyTextSelection,
  createHistory,
  createIdleDragState,
  createImageResizeDragState,
  createMultiElementSelection,
  createParagraphClipboard,
  createRangeSelection,
  createSingleElementSelection,
  createTableClipboard,
  createTableResizeDragState,
  createTextClipboard,
  createTextSelectDragState,
  extendTextSelection,
  getClipboardPlainText,
  getDragDelta,
  getElementSelectionCount,
  getResizeDelta,
  isDragElementMove,
  isDragIdle,
  isDragImageResize,
  isDragTableResize,
  isDragTextSelect,
  isDragging,
  isElementSelected,
  isElementSelectionEmpty,
  isParagraphClipboard,
  isPositionInTextSelection,
  isTableClipboard,
  isTextClipboard,
  isTextSelectionEmpty,
  markAsCopy,
  markAsCut,
  pushHistory,
  redoCount,
  redoHistory,
  removeFromElementSelection,
  replacePresent,
  toggleElementSelection,
  switchToElementMode,
  switchToTextMode,
  setElementSelection,
  undoCount,
  undoHistory,
  updateElementMoveDrag,
  updateImageResizeDrag,
  updateTableResizeDrag,
  updateTextSelectDrag,
} from "./context/document/state";

// Editor types and reducer
export {
  type ActionHandler,
  type DocxEditorAction,
  type DocxEditorActionType,
  type DocxEditorState,
  type EditorMode,
  type HandlerMap,
  type TextEditState,
  ALL_HANDLERS,
  clipboardHandlers,
  combineHandlers,
  createEmptyEditorState,
  createHandler,
  createInitialState,
  createInitialTextEditState,
  documentHandlers,
  dragHandlers,
  formatHandlers,
  historyHandlers,
  reducer,
  selectionHandlers,
  textEditHandlers,
} from "./context/document/editor";

// Editor Components
export {
  RunPropertiesEditor,
  createDefaultRunProperties,
  type RunPropertiesEditorProps,
} from "./editors/text/RunPropertiesEditor";

export {
  ParagraphPropertiesEditor,
  createDefaultParagraphProperties,
  type ParagraphPropertiesEditorProps,
} from "./editors/paragraph/ParagraphPropertiesEditor";

export {
  StyleEditor,
  createDefaultStyle,
  type StyleEditorProps,
} from "./editors/style/StyleEditor";

export {
  NumberingLevelEditor,
  createDefaultLevel,
  type NumberingLevelEditorProps,
} from "./editors/numbering/NumberingLevelEditor";

export {
  TablePropertiesEditor,
  createDefaultTableProperties,
  type TablePropertiesEditorProps,
} from "./editors/table/TablePropertiesEditor";

export {
  TableCellPropertiesEditor,
  createDefaultTableCellProperties,
  type TableCellPropertiesEditorProps,
} from "./editors/table/TableCellPropertiesEditor";

// Document Editor (SVG-based)
export {
  ContinuousEditor,
  type ContinuousEditorProps,
} from "./text-edit/ContinuousEditor";

export { type HyperlinkClickEvent } from "./text-edit/DocumentTextOverlay";

// Layout hooks
export {
  useDocumentLayout,
  type UseDocumentLayoutOptions,
  type DocumentLayoutResult,
} from "./document/hooks/use-document-layout";

export {
  useContinuousCursor,
  type UseContinuousCursorOptions,
  type ContinuousCursorResult,
} from "./document/hooks/use-continuous-cursor";
