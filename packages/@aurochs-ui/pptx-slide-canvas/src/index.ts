/**
 * @file pptx-slide-canvas - Interactive slide canvas and shape utilities
 *
 * Provides the interactive editing surface for PPTX slides, including
 * shape selection, drag/resize/rotate, text editing, and context menus.
 */

// State Types
export type { SelectionState, DragState, ClipboardContent } from "./context/slide/state";
export type { ResizeHandlePosition } from "@aurochs-ui/editor-core/drag-state";

// Slide Editor Types
export type { SlideEditorState, SlideEditorAction } from "./context/slide/editor/types";
export { createSlideEditorState } from "./context/slide/editor/types";

// Slide Editor Reducer
export { slideEditorReducer } from "./context/slide/editor/reducer";

// Slide Canvas Component
export { SlideCanvas, type SlideCanvasProps } from "./slide/SlideCanvas";

// Shape identity utilities
export { getShapeId } from "./shape/identity";

// Shape query utilities
export { findShapeById, findShapeByIdWithParents, getTopLevelShapeIds } from "./shape/query";

// Shape bounds utilities
export { getShapeBounds, getCombinedBounds } from "./shape/bounds";

// Shape capabilities
export { getShapeCapabilities, type ShapeCapabilities } from "./shape/capabilities";

// Context Menu Types
export type { ContextMenuActions } from "./slide/context-menu/SlideContextMenu";

// Creation mode guards
export { isPenMode, isPathMode } from "./creation-mode-guards";
