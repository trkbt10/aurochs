/**
 * @file presentation-theme-layout — barrel exports for theme and slide layout UI
 * @packageDocumentation
 *
 * **presentation-theme-layout** — Shared theme and slide-layout editing UI for PPTX and POTX.
 *
 * - Theme name and POTX import/export (`ThemeNameSection`, `ThemeImportExportSection`)
 * - `ST_SlideLayoutType` UI metadata (`slide-layout-metadata`)
 * - Layout thumbnails (`LayoutThumbnail`, `useLayoutThumbnails`)
 * - Layout picker (`LayoutSelector`) and p:sldLayout fields (`SlideLayoutEditor`, `SlideLayoutAttributesPanel`, `SlideLayoutChromeEditors`)
 * - Slide size (`SlideSizeEditor`, `createDefaultSlideSize`)
 * - Theme colors, fonts, and presets (`ThemeSchemeEditorsSection`)
 * - Inspector layout list (`LayoutInfoPanel`)
 * - Per-layout / per-slide transitions (`TransitionEditor`)
 * - Theme summary (`ThemeViewerPanel`) and theme part editors (colors, fonts, clrMap, backgrounds, presets, …)
 */

export type { ThemeColorScheme, ThemePreset } from "./theme-types";
export { THEME_PRESETS, OFFICE_THEME } from "./presets/office-themes";

export { ThemeImportExportSection, type ThemeImportExportSectionProps } from "./ThemeImportExportSection";
export { ThemeNameSection, type ThemeNameSectionProps } from "./ThemeNameSection";

export {
  SLIDE_LAYOUT_TYPE_LABELS,
  SLIDE_LAYOUT_TYPE_UI_ORDER,
  SLIDE_LAYOUT_OPTIONAL_BOOLEAN_SELECT_OPTIONS,
  slideLayoutOptionalBooleanToSelectValue,
  slideLayoutSelectValueToOptionalBoolean,
  slideLayoutTrimmedOptionalString,
  slideLayoutTypeSelectOptions,
  type SlideLayoutOptionalBooleanSelectValue,
} from "./slide-layout-metadata";

export { LayoutThumbnail, type LayoutThumbnailProps } from "./LayoutThumbnail";
export { LayoutThumbnailPickerGrid, type LayoutThumbnailPickerGridProps } from "./LayoutThumbnailPickerGrid";
export {
  useLayoutThumbnails,
  loadLayoutWithContext,
  type UseLayoutThumbnailsOptions,
  type LayoutThumbnailData,
  type LoadedLayoutData,
} from "./use-layout-thumbnails";

export { TransitionEditor, createDefaultTransition, type TransitionEditorProps } from "./TransitionEditor";
export { TransitionPreview, type TransitionPreviewProps } from "./TransitionPreview";

export { LayoutSelector, type LayoutSelectorProps } from "./LayoutSelector";
export { SlideLayoutEditor, type SlideLayoutEditorProps } from "./SlideLayoutEditor";
export { SlideLayoutAttributesPanel, type SlideLayoutAttributesPanelProps } from "./SlideLayoutAttributesPanel";
export { SlideLayoutChromeEditors, type SlideLayoutChromeEditorsProps } from "./SlideLayoutChromeEditors";
export {
  LAYOUT_CHROME_COLOR_MAP_OVERRIDE_TITLE,
  LAYOUT_CHROME_TRANSITION_DEFAULT_EXPANDED,
  LAYOUT_CHROME_TRANSITION_SECTION_TITLE,
} from "./layout-chrome-constants";
export { SlideSizeEditor, createDefaultSlideSize, type SlideSizeEditorProps } from "./SlideSizeEditor";
export { LayoutInfoPanel, type LayoutInfoPanelProps } from "./LayoutInfoPanel";

export { ThemeViewerPanel, type ThemeViewerPanelProps } from "./ThemeViewerPanel";

export { ColorSchemeEditor, type ColorSchemeEditorProps } from "./ColorSchemeEditor";
export { FontSchemeEditor, type FontSchemeEditorProps } from "./FontSchemeEditor";
export { ThemeSchemeEditorsSection, type ThemeSchemeEditorsSectionProps } from "./ThemeSchemeEditorsSection";
export { ColorMapEditor, type ColorMapEditorProps } from "./ColorMapEditor";
export { MasterBackgroundEditor, type MasterBackgroundEditorProps } from "./MasterBackgroundEditor";
export { ThemePresetSelector, type ThemePresetSelectorProps } from "./ThemePresetSelector";
export { CustomColorsEditor, type CustomColorsEditorProps } from "./CustomColorsEditor";
export { ExtraColorSchemesEditor, type ExtraColorSchemesEditorProps } from "./ExtraColorSchemesEditor";
export { FormatSchemeEditor, type FormatSchemeEditorProps } from "./FormatSchemeEditor";
export { ObjectDefaultsEditor, type ObjectDefaultsEditorProps } from "./ObjectDefaultsEditor";
export { MasterTextStylesEditor, type MasterTextStylesEditorProps } from "./MasterTextStylesEditor";
export { SampleSlidePreview, type SampleSlidePreviewProps } from "./SampleSlidePreview";
