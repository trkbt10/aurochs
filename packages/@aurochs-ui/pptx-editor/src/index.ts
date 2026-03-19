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

// Context - EditorConfig: import from @aurochs-ui/editor-controls/editor-config

// UI Color types: import FillPreview from @aurochs-ui/color-editor

// UI Line
export { LineEditor, createDefaultLine, type LineEditorProps } from "./ui/line";

// Shared editors: import from @aurochs-ui/editor-controls/editors
// TransitionEditor: import from @aurochs-ui/ooxml-components

// PPTX-specific editors
export {
  // Color (pptx-specific FillEditor with BlipFill)
  FillEditor,
  createDefaultSolidFill,
  createNoFill,
  type FillEditorProps,
  // Text
  RunPropertiesEditor,
  LineSpacingEditor,
  BulletStyleEditor,
  ParagraphPropertiesEditor,
  TextBodyEditor,
  MixedTextBodyEditor,
  MixedRunPropertiesEditor,
  MixedParagraphPropertiesEditor,
  createDefaultRunProperties,
  createDefaultLineSpacing,
  createDefaultBulletStyle,
  createDefaultParagraphProperties,
  createDefaultTextBody,
  type RunPropertiesEditorProps,
  type LineSpacingEditorProps,
  type BulletStyleEditorProps,
  type ParagraphPropertiesEditorProps,
  type TextBodyEditorProps,
  type MixedTextBodyEditorProps,
  type MixedRunPropertiesEditorProps,
  type MixedParagraphPropertiesEditorProps,
  // Shape
  NonVisualPropertiesEditor,
  EffectsEditor,
  GeometryEditor,
  ShapePropertiesEditor,
  createDefaultNonVisualProperties,
  createDefaultEffects,
  createDefaultGeometry,
  createDefaultShapeProperties,
  type NonVisualPropertiesEditorProps,
  type EffectsEditorProps,
  type GeometryEditorProps,
  type ShapePropertiesEditorProps,
  // Table
  TableCellPropertiesEditor,
  TableCellEditor,
  TablePropertiesEditor,
  TableEditor,
  createDefaultCellBorders,
  createAllEdgeBorders,
  createDefaultCell3d,
  createDefaultBevel,
  createDefaultLightRig,
  createDefaultCellMargins,
  createDefaultTableCellProperties,
  createDefaultTableCell,
  createEmptyTableCell,
  createDefaultTableProperties,
  createDefaultTable,
  createTable,
  type TableCellPropertiesEditorProps,
  type TableCellEditorProps,
  type TablePropertiesEditorProps,
  type TableEditorProps,
  // Slide-level
  BackgroundEditor,
  createDefaultBackground,
  type BackgroundEditorProps,
  // OLE object
  OleObjectEditor,
  createDefaultOleReference,
  type OleObjectEditorProps,
} from "./editors";

// Shape Types (re-export from domain)
// State Types (from state module)
export type { SelectionState, ResizeHandlePosition, DragState, ClipboardContent } from "./context/slide/state";
export { createEmptySelection, createIdleDragState } from "./context/slide/state";

// Slide Editor Types
export type { SlideEditorState, SlideEditorAction } from "./context/slide/editor/types";
export { createSlideEditorState } from "./context/slide/editor/types";

// Slide Editor Reducer
export { slideEditorReducer } from "./context/slide/editor/reducer";

// Slide Editor Components
export { SlideCanvas, type SlideCanvasProps } from "./slide/SlideCanvas";
export { PropertyPanel, type PropertyPanelProps } from "./panels/PropertyPanel";
export { ShapeToolbar, type ShapeToolbarProps } from "./panels/ShapeToolbar";
export { LayerPanel, type LayerPanelProps } from "./panels/LayerPanel";

// Slide Editor Sub-components: import from @aurochs-ui/editor-controls/canvas

// Shape identity utilities
export { getShapeId, hasShapeId } from "./shape/identity";

// Shape query utilities
export { findShapeById, findShapeByIdWithParents, getTopLevelShapeIds, isTopLevelShape } from "./shape/query";

// Shape bounds utilities
export { getShapeBounds, getCombinedBounds } from "./shape/bounds";

// Shape transform utilities
export { withUpdatedTransform, hasEditableTransform, getAbsoluteBounds, type AbsoluteBounds } from "./shape/transform";

// Shape coordinate utilities
export { clientToSlideCoords } from "./shape/coords";

// Shape capabilities
export { getShapeCapabilities, type ShapeCapabilities } from "./shape/capabilities";

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
  type ExportState,
  type UseExportPresentationOptions,
  type UseExportPresentationResult,
} from "./presentation/hooks";

// Context Menu Types
export type { ContextMenuActions } from "./slide/context-menu/SlideContextMenu";

// Viewer Components and Hooks
export {
  // Hooks
  useSlideNavigation,
  useViewerKeyboard,
  useSlideshowMode,
  // Primitive Components
  SlideIndicator,
  ProgressBar,
  KeyboardHints,
  NavigationControls,
  SlidePreview,
  ViewerControls,
  // Composite Components
  PresentationSlideshow,
  PresentationViewer,
  EmbeddableSlide,
  SlideShareViewer,
  // Types - Hooks
  type UseSlideNavigationOptions,
  type SlideNavigationResult,
  type ViewerKeyboardActions,
  type UseSlideshowModeOptions,
  type SlideshowModeResult,
  // Types - Primitives
  type SlideIndicatorProps,
  type SlideIndicatorVariant,
  type ProgressBarProps,
  type ProgressBarVariant,
  type KeyboardHintsProps,
  type KeyboardHintsVariant,
  type KeyboardHint,
  type NavigationControlsProps,
  type NavigationControlsVariant,
  type SlidePreviewProps,
  type ViewerControlsProps,
  type ControlAction,
  type NavigationState,
  type PositionState,
  // Types - Composites
  type PresentationSlideshowProps,
  type SlideshowSlideContent,
  type PresentationViewerProps,
  type EmbeddableSlideProps,
  type SlideShareViewerProps,
} from "./viewer";
