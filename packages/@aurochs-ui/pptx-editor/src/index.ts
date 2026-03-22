/**
 * @file PPTX Editor - React-based editor components for PPTX domain types
 *
 * This module provides editor components for editing PPTX domain objects.
 * Each editor is designed to be context-agnostic and can be used in
 * various mounting contexts (inline, popup, sidebar, context menu, etc.).
 *
 * @example
 * ```tsx
 * import { TransformEditor, ColorEditor } from "@aurochs-ui/editor-controls/editors";
 * import { EditorConfigProvider } from "@aurochs-ui/editor-controls/editor-config";
 *
 * function ShapePanel({ shape, onUpdate }) {
 *   return (
 *     <EditorConfigProvider config={{ compactMode: true }}>
 *       <TransformEditor
 *         value={shape.transform}
 *         onChange={(t) => onUpdate({ ...shape, transform: t })}
 *       />
 *     </EditorConfigProvider>
 *   );
 * }
 * ```
 */

// PPTX-specific editors: import directly from @aurochs-ui/pptx-editors
// Slide canvas, state, shape utilities: import directly from @aurochs-ui/pptx-slide-canvas
// Shared editors: import from @aurochs-ui/editor-controls/editors

// Panels (remain in pptx-editor — they compose canvas + editors)
export { PropertyPanel, type PropertyPanelProps } from "./panels/PropertyPanel";
export { ShapeToolbar, type ShapeToolbarProps } from "./panels/ShapeToolbar";
export { LayerPanel, type LayerPanelProps } from "./panels/LayerPanel";

// Presentation Editor Types
export type {
  PresentationEditorState,
  PresentationEditorAction,
  PresentationEditorContextValue,
} from "./context/presentation/editor/types";

// Presentation Editor Context
export {
  PresentationEditorProvider,
  usePresentationEditor,
  usePresentationEditorOptional,
} from "./context/presentation/PresentationEditorContext";
export {
  PresentationPreviewProvider,
  usePresentationPreview,
  usePresentationPreviewOptional,
  type PresentationPreviewContextValue,
} from "./context/presentation/PresentationPreviewContext";

// Presentation Editor Reducer
export {
  presentationEditorReducer,
  createPresentationEditorState,
} from "./context/presentation/editor/reducer/reducer";

// Presentation Editor Components
export { PresentationEditor, type PresentationEditorProps } from "./presentation/PresentationEditor";
export { SlideThumbnailPanel } from "./panels";

// Export Components
export { ExportButton, type ExportButtonProps } from "./presentation/components";

// Export Hooks
export {
  useExportPresentation,
  useDragHandlers,
  useKeyboardShortcuts,
  type ExportState,
  type UseExportPresentationOptions,
  type UseExportPresentationResult,
  type UseDragHandlersParams,
  type UseKeyboardShortcutsParams,
} from "./presentation/hooks";

// Context Menu Types: import directly from @aurochs-ui/pptx-slide-canvas
// Viewer Components and Hooks: import directly from @aurochs-ui/pptx-viewer
