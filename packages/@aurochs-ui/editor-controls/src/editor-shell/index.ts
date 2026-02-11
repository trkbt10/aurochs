/**
 * @file Editor shell barrel exports
 */

export type { EditorLayoutMode, EditorLayoutBreakpoints, EditorPanel, EditorShellProps } from "./types";
export { resolveEditorLayoutMode, DEFAULT_EDITOR_LAYOUT_BREAKPOINTS } from "./responsive-layout";
export { useContainerWidth } from "./useContainerWidth";
export { CanvasArea, type CanvasAreaProps } from "./CanvasArea";
export { editorContainerStyle, toolbarStyle, gridContainerStyle, bottomBarStyle } from "./editor-styles";
export { EditorShell } from "./EditorShell";
