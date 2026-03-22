/**
 * @file ooxml-components entry point
 *
 * Aggregates purpose-scoped modules:
 * - `presentation-theme-layout` — theme, layout metadata, thumbnails, transitions
 * - `presentation-slide-creation` — canvas creation mode, toolbar, shape factory
 * - `pptx-slide-pipeline` — transform / render helpers for slide shapes
 * - `presentation-canvas` — EditorCanvas selection & drag wiring
 * - `opc-embedded-assets` — embedded media browser (PresentationML / PPTX discovery today)
 *
 * Prefer subpath imports (`@aurochs-ui/ooxml-components/presentation-theme-layout`, etc.) when
 * only one area is needed.
 */

export type { ThemeColorScheme, ThemePreset } from "./presentation-theme-layout";

export {
  THEME_PRESETS,
  OFFICE_THEME,
  ThemeImportExportSection,
  type ThemeImportExportSectionProps,
  ThemeNameSection,
  type ThemeNameSectionProps,
  SLIDE_LAYOUT_TYPE_LABELS,
  SLIDE_LAYOUT_TYPE_UI_ORDER,
  SLIDE_LAYOUT_OPTIONAL_BOOLEAN_SELECT_OPTIONS,
  slideLayoutOptionalBooleanToSelectValue,
  slideLayoutSelectValueToOptionalBoolean,
  slideLayoutTrimmedOptionalString,
  slideLayoutTypeSelectOptions,
  type SlideLayoutOptionalBooleanSelectValue,
  LayoutThumbnail,
  type LayoutThumbnailProps,
  LayoutThumbnailPickerGrid,
  type LayoutThumbnailPickerGridProps,
  useLayoutThumbnails,
  loadLayoutWithContext,
  type UseLayoutThumbnailsOptions,
  type LayoutThumbnailData,
  type LoadedLayoutData,
  TransitionEditor,
  createDefaultTransition,
  type TransitionEditorProps,
  TransitionPreview,
  type TransitionPreviewProps,
  LayoutSelector,
  type LayoutSelectorProps,
  SlideLayoutEditor,
  type SlideLayoutEditorProps,
  LayoutInfoPanel,
  type LayoutInfoPanelProps,
  ThemeViewerPanel,
  type ThemeViewerPanelProps,
  ColorSchemeEditor,
  type ColorSchemeEditorProps,
  FontSchemeEditor,
  type FontSchemeEditorProps,
  ColorMapEditor,
  type ColorMapEditorProps,
  MasterBackgroundEditor,
  type MasterBackgroundEditorProps,
  ThemePresetSelector,
  type ThemePresetSelectorProps,
  CustomColorsEditor,
  type CustomColorsEditorProps,
  ExtraColorSchemesEditor,
  type ExtraColorSchemesEditorProps,
  FormatSchemeEditor,
  type FormatSchemeEditorProps,
  ObjectDefaultsEditor,
  type ObjectDefaultsEditorProps,
  MasterTextStylesEditor,
  type MasterTextStylesEditorProps,
  SampleSlidePreview,
  type SampleSlidePreviewProps,
  SlideLayoutAttributesPanel,
  type SlideLayoutAttributesPanelProps,
  SlideLayoutChromeEditors,
  type SlideLayoutChromeEditorsProps,
  LAYOUT_CHROME_COLOR_MAP_OVERRIDE_TITLE,
  LAYOUT_CHROME_TRANSITION_DEFAULT_EXPANDED,
  LAYOUT_CHROME_TRANSITION_SECTION_TITLE,
  SlideSizeEditor,
  createDefaultSlideSize,
  type SlideSizeEditorProps,
  ThemeSchemeEditorsSection,
  type ThemeSchemeEditorsSectionProps,
} from "./presentation-theme-layout";

export type {
  CreationPresetShape,
  CreationChartType,
  CreationDiagramType,
  SmoothingLevel,
  CreationMode,
  ShapeBounds,
} from "./presentation-slide-creation";
export {
  createSelectMode,
  isSameMode,
  getCursorForCreationMode,
  createSpShape,
  createTextBox,
  createConnector,
  createPicShape,
  createBoundsFromDrag,
  getDefaultBoundsForMode,
  generateShapeId,
  resetShapeCounter,
  createShapeFromMode,
  useCreationDrag,
  type UseCreationDragOptions,
  type UseCreationDragResult,
  CreationToolbar,
  type CreationToolbarProps,
} from "./presentation-slide-creation";

export {
  withUpdatedTransform,
  getAbsoluteBounds,
  hasEditableTransform,
  pptxTransformResolver,
  getFillColor,
  getStrokeColor,
  getStrokeWidth,
  pptxRenderResolver,
  collectPptxShapeRenderData,
} from "./pptx-slide-pipeline";

export {
  useCanvasHandlers,
  type UseCanvasHandlersOptions,
  type CanvasHandlers,
  type CanvasSelectionCallbacks,
  type CanvasDragCallbacks,
} from "./presentation-canvas";

export {
  AssetPanel,
  ASSET_DRAG_TYPE,
  type AssetPanelProps,
  type AssetInfo,
} from "./opc-embedded-assets";
