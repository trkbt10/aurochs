/**
 * @file ooxml-components entry point
 *
 * Shared UI components and hooks for OOXML document editors.
 */

export {
  useCanvasHandlers,
  type UseCanvasHandlersOptions,
  type CanvasHandlers,
  type CanvasSelectionCallbacks,
  type CanvasDragCallbacks,
} from "./use-canvas-handlers";

export { LayoutThumbnail, type LayoutThumbnailProps } from "./LayoutThumbnail";
export {
  useLayoutThumbnails,
  loadLayoutWithContext,
  type UseLayoutThumbnailsOptions,
  type LayoutThumbnailData,
  type LoadedLayoutData,
} from "./use-layout-thumbnails";

export { TransitionEditor, createDefaultTransition, type TransitionEditorProps } from "./TransitionEditor";
export { TransitionPreview, type TransitionPreviewProps } from "./TransitionPreview";
