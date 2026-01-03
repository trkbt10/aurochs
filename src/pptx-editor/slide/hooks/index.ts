/**
 * @file Slide editor hooks exports
 */

export { useSlideState, type UseSlideStateResult, type MultiShapeTransformUpdate } from "./useSlideState";
export { useSelection, type UseSelectionResult } from "./useSelection";
export { useDragMove, type UseDragMoveOptions, type UseDragMoveResult } from "./useDragMove";
export { useDragResize, type UseDragResizeOptions, type UseDragResizeResult } from "./useDragResize";
export { useDragRotate, type UseDragRotateOptions, type UseDragRotateResult } from "./useDragRotate";
export { useClipboard, type UseClipboardResult } from "./useClipboard";
export {
  useKeyboardShortcuts,
  type UseKeyboardShortcutsOptions,
  type UseKeyboardShortcutsResult,
} from "./useKeyboardShortcuts";
export { useAlignmentActions, type AlignmentActions } from "./useAlignmentActions";
export { useContextMenuActions, type ContextMenuActions } from "./useContextMenuActions";
