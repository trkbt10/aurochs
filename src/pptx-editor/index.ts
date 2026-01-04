/**
 * @file PPTX Editor - React-based editor components for PPTX domain types
 *
 * This module provides editor components for editing PPTX domain objects.
 * Each editor is designed to be context-agnostic and can be used in
 * various mounting contexts (inline, popup, sidebar, context menu, etc.).
 *
 * @example
 * ```tsx
 * import { TransformEditor, ColorEditor, EditorConfigProvider } from "@lib/pptx-editor";
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

// Types
export type {
  EditorProps,
  EditorState,
  EditorAction,
  InputType,
  ButtonVariant,
  SelectOption,
} from "./types";

// Context - EditorConfig
export {
  EditorConfigProvider,
  useEditorConfig,
  type EditorConfig,
} from "./context/EditorConfigContext";

// UI Primitives
export {
  Button,
  Input,
  Popover,
  Select,
  Slider,
  Tabs,
  Toggle,
  type ButtonProps,
  type InputProps,
  type PopoverProps,
  type SelectProps,
  type SliderProps,
  type TabItem,
  type TabsProps,
  type ToggleProps,
} from "./ui/primitives";

// UI Layout
export {
  Accordion,
  FieldGroup,
  FieldRow,
  Panel,
  type AccordionProps,
  type FieldGroupProps,
  type FieldRowProps,
  type PanelProps,
} from "./ui/layout";

// UI Color
export {
  FillPreview,
  type FillPreviewProps,
} from "./ui/color";

// Editors
export {
  // Primitives
  PixelsEditor,
  DegreesEditor,
  PercentEditor,
  PointsEditor,
  TransformEditor,
  createDefaultTransform,
  type PixelsEditorProps,
  type DegreesEditorProps,
  type PercentEditorProps,
  type PointsEditorProps,
  type TransformEditorProps,
  // Color
  ColorSpecEditor,
  ColorTransformEditor,
  ColorEditor,
  FillEditor,
  LineEditor,
  createDefaultSrgbColor,
  createDefaultColor,
  createDefaultSolidFill,
  createNoFill,
  createDefaultLine,
  type ColorSpecEditorProps,
  type ColorTransformEditorProps,
  type ColorEditorProps,
  type FillEditorProps,
  type LineEditorProps,
  // Text
  RunPropertiesEditor,
  LineSpacingEditor,
  BulletStyleEditor,
  ParagraphPropertiesEditor,
  TextBodyEditor,
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
  // Chart
  DataLabelsEditor,
  LegendEditor,
  AxisEditor,
  ChartSeriesEditor,
  ChartEditor,
  createDefaultDataLabels,
  createDefaultLegend,
  createDefaultAxis,
  createDefaultCategoryAxis,
  createDefaultValueAxis,
  createDefaultChartSeries,
  createDefaultBarChartSeries,
  createDefaultChart,
  type DataLabelsEditorProps,
  type LegendEditorProps,
  type AxisEditorProps,
  type ChartSeriesEditorProps,
  type ChartEditorProps,
  // Diagram
  DiagramEditor,
  DiagramPointEditor,
  DiagramConnectionEditor,
  createDefaultDiagramDataModel,
  createDefaultDiagramPoint,
  createDefaultDiagramConnection,
  type DiagramEditorProps,
  type DiagramPointEditorProps,
  type DiagramConnectionEditorProps,
  // Slide-level
  BackgroundEditor,
  TransitionEditor,
  createDefaultBackground,
  createDefaultTransition,
  type BackgroundEditorProps,
  type TransitionEditorProps,
  // OLE object
  OleObjectEditor,
  createDefaultOleReference,
  type OleObjectEditorProps,
} from "./editors";

// Shape Types (re-export from domain)
export type { ShapeId } from "../pptx/domain/types";

// State Types (from state module)
export type {
  SelectionState,
  ResizeHandlePosition,
  DragState,
  UndoRedoHistory,
  ClipboardContent,
} from "./state";
export {
  createEmptySelection,
  createIdleDragState,
  createHistory,
  pushHistory,
  undoHistory,
  redoHistory,
} from "./state";

// Slide Editor Types
export type {
  SlideEditorState,
  SlideEditorAction,
} from "./slide/types";
export { createSlideEditorState } from "./slide/types";

// Slide Editor Reducer
export { slideEditorReducer } from "./slide/reducer";

// Slide Editor Components
export { SlideCanvas, type SlideCanvasProps } from "./slide/SlideCanvas";
export { PropertyPanel, type PropertyPanelProps } from "./panels/PropertyPanel";
export { ShapeToolbar, type ShapeToolbarProps } from "./panels/ShapeToolbar";
export { LayerPanel, type LayerPanelProps } from "./panels/LayerPanel";

// Slide Editor Sub-components
export { SelectionBox, type SelectionBoxProps, type SelectionBoxVariant } from "./selection/SelectionBox";
export { ResizeHandle, type ResizeHandleProps } from "./selection/ResizeHandle";
export { RotateHandle, type RotateHandleProps } from "./selection/RotateHandle";

// Shape identity utilities
export { getShapeId, hasShapeId } from "./shape/identity";

// Shape query utilities
export { findShapeById, findShapeByIdWithParents, getTopLevelShapeIds, isTopLevelShape } from "./shape/query";

// Shape bounds utilities
export { getShapeBounds, getCombinedBounds } from "./shape/bounds";

// Shape transform utilities
export {
  getShapeTransform,
  withUpdatedTransform,
  hasEditableTransform,
  getAbsoluteBounds,
  type AbsoluteBounds,
} from "./shape/transform";

// Shape coordinate utilities
export { clientToSlideCoords } from "./shape/coords";

// Shape capabilities
export { getShapeCapabilities, type ShapeCapabilities } from "./shape/capabilities";

// Presentation Editor Types
export type {
  PresentationDocument,
  PresentationEditorState,
  PresentationEditorAction,
  SlideWithId,
  SlideId,
  PresentationEditorContextValue,
} from "./presentation/types";

// Presentation Editor Context
export {
  PresentationEditorProvider,
  usePresentationEditor,
  usePresentationEditorOptional,
} from "./presentation/context";

// Presentation Editor Reducer
export {
  presentationEditorReducer,
  createPresentationEditorState,
} from "./presentation/reducer/reducer";

// Presentation Editor Components
export { PresentationEditor, type PresentationEditorProps } from "./presentation/PresentationEditor";
export { SlideThumbnailPanel } from "./panels/SlideThumbnailPanel";

// Context Menu Types
export type { ContextMenuActions } from "./slide/context-menu/SlideContextMenu";
