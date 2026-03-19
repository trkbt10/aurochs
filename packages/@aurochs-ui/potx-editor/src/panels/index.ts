/**
 * @file Theme panel exports
 */

export { ColorSchemeEditor } from "./ColorSchemeEditor";
export type { ColorSchemeEditorProps } from "./ColorSchemeEditor";
export { FontSchemeEditor } from "./FontSchemeEditor";
export type { FontSchemeEditorProps } from "./FontSchemeEditor";
export { ThemePresetSelector } from "./ThemePresetSelector";
export type { ThemePresetSelectorProps } from "./ThemePresetSelector";
export { SampleSlidePreview } from "./SampleSlidePreview";
export type { SampleSlidePreviewProps } from "./SampleSlidePreview";
export { LayoutAttributesSection } from "./LayoutAttributesSection";
export type { LayoutAttributesSectionProps } from "./LayoutAttributesSection";
export { ColorMapEditor, DEFAULT_COLOR_MAPPING } from "./ColorMapEditor";
export type { ColorMapEditorProps } from "./ColorMapEditor";
export { MasterBackgroundEditor } from "./MasterBackgroundEditor";
export type { MasterBackgroundEditorProps, BackgroundState } from "./MasterBackgroundEditor";
export { CustomColorsEditor } from "./CustomColorsEditor";
export type { CustomColorsEditorProps } from "./CustomColorsEditor";
export { ExtraColorSchemesEditor } from "./ExtraColorSchemesEditor";
export type { ExtraColorSchemesEditorProps } from "./ExtraColorSchemesEditor";
export { FormatSchemeEditor } from "./FormatSchemeEditor";
export type { FormatSchemeEditorProps } from "./FormatSchemeEditor";
export { ObjectDefaultsEditor } from "./ObjectDefaultsEditor";
export type { ObjectDefaultsEditorProps } from "./ObjectDefaultsEditor";
export { MasterTextStylesEditor } from "./MasterTextStylesEditor";
export type { MasterTextStylesEditorProps } from "./MasterTextStylesEditor";

export { THEME_PRESETS, OFFICE_THEME } from "./presets/office-themes";
export { extractThemeFromPptx } from "./theme-importer";
export type { ThemeExtractionResult } from "./theme-importer";
export { exportThemeAsPotx, getThemeFileName } from "./theme-exporter";
export type { ThemeExportOptions } from "./theme-exporter";
export type {
  ThemeColorScheme,
  ThemeFontScheme,
  ThemePreset,
} from "./types";
export { COLOR_LABELS, COLOR_SCHEME_KEYS } from "./types";
