/**
 * @file Canvas selection components
 *
 * Shared SVG components for shape selection UI:
 * - SelectionBox: Bounding box around selected shape(s) with variant support
 * - ResizeHandle: Draggable handle for resizing
 * - RotateHandle: Draggable handle for rotation
 */

export type { SelectionBoxVariant } from "./types";

export { SelectionBox } from "./SelectionBox";
export type { SelectionBoxProps } from "./SelectionBox";

export { ResizeHandle } from "./ResizeHandle";
export type { ResizeHandleProps } from "./ResizeHandle";

export { RotateHandle } from "./RotateHandle";
export type { RotateHandleProps } from "./RotateHandle";

// Canvas interaction hooks
export type { HitTestBounds, CanvasSize } from "./use-canvas-interaction";
export { findItemAtPoint, useCanvasCoords, useGlobalDragListeners } from "./use-canvas-interaction";

// Canvas ruler
export { CanvasRuler, type CanvasRulerProps } from "./CanvasRuler";

// Editor canvas
export {
  EditorCanvas,
  type EditorCanvasHandle,
  type EditorCanvasProps,
  type EditorCanvasDrag,
  type EditorCanvasItemBounds,
  type CanvasPageCoords,
} from "./EditorCanvas";

// Canvas backgrounds
export { slideCanvasBackground } from "./SlideCanvasBackground";

// Viewport management (pan/zoom)
export { useSvgViewport, type UseSvgViewportOptions, type UseSvgViewportResult, type ViewportClampFn } from "./use-svg-viewport";
export { SvgRulers, type SvgRulersProps } from "./SvgRulers";
export { ViewportOverlay, type ViewportOverlayProps } from "./ViewportOverlay";
