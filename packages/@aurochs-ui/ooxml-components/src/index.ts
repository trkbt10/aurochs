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

// Creation types
export type {
  CreationPresetShape,
  CreationChartType,
  CreationDiagramType,
  SmoothingLevel,
  CreationMode,
} from "./creation-types";
export { createSelectMode, isSameMode } from "./creation-types";

// Shape factory
export type { ShapeBounds } from "./shape-factory";
export {
  createSpShape,
  createTextBox,
  createConnector,
  createPicShape,
  createBoundsFromDrag,
  getDefaultBoundsForMode,
  generateShapeId,
  resetShapeCounter,
  createShapeFromMode,
} from "./shape-factory";

// Creation drag hook
export { useCreationDrag, type UseCreationDragOptions, type UseCreationDragResult } from "./use-creation-drag";

// Creation toolbar
export { CreationToolbar, type CreationToolbarProps } from "./CreationToolbar";
