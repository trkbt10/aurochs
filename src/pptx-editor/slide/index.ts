/**
 * @file Slide editor exports
 */

// Types
export {
  type ShapeId,
  type SelectionState,
  type ResizeHandlePosition,
  type DragState,
  type UndoRedoHistory,
  type ClipboardContent,
  type SlideEditorState,
  type SlideEditorAction,
  type SlideEditorContextValue,
  createEmptySelection,
  createIdleDragState,
  createHistory,
  pushHistory,
  undoHistory,
  redoHistory,
  createSlideEditorState,
} from "./types";

// Hooks
export {
  useSlideState,
  type UseSlideStateResult,
  useSelection,
  type UseSelectionResult,
  useDragMove,
  type UseDragMoveOptions,
  type UseDragMoveResult,
  useDragResize,
  type UseDragResizeOptions,
  type UseDragResizeResult,
  useDragRotate,
  type UseDragRotateOptions,
  type UseDragRotateResult,
  useClipboard,
  type UseClipboardResult,
  useKeyboardShortcuts,
  type UseKeyboardShortcutsOptions,
  type UseKeyboardShortcutsResult,
} from "./hooks";

// Components
export { SlideEditor, type SlideEditorProps } from "./SlideEditor";
export { SlideCanvas, type SlideCanvasProps } from "./SlideCanvas";
export { ShapeSelector, type ShapeSelectorProps } from "./ShapeSelector";
export { PropertyPanel, type PropertyPanelProps } from "./PropertyPanel";
export { ShapeToolbar, type ShapeToolbarProps } from "./ShapeToolbar";

// Sub-components
export {
  SelectionBox,
  type SelectionBoxProps,
  ResizeHandle,
  type ResizeHandleProps,
  RotateHandle,
  type RotateHandleProps,
  MultiSelectionBox,
  type MultiSelectionBoxProps,
} from "./components";
