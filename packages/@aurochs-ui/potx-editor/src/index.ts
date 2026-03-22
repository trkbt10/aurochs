/**
 * @file potx-editor entry point
 *
 * PowerPoint Template (POTX) editor package.
 * Provides theme editing UI independent of pptx-editor.
 */

// =============================================================================
// Main Component
// =============================================================================
export { PotxEditor } from "./PotxEditor";
export type { PotxEditorProps } from "./PotxEditor";

// =============================================================================
// Context
// =============================================================================
export {
  ThemeEditorProvider,
  useThemeEditor,
  useThemeEditorOptional,
} from "./context";
export type {
  ThemeEditorContextValue,
  ThemeEditorProviderProps,
  ThemeEditorState,
  ThemeEditorAction,
  ThemeEditorInitProps,
  LayoutEditState,
  LayoutListEntry,
  LayoutDragState,
  ImportedThemeData,
} from "./context";

// =============================================================================
// Panels
// =============================================================================
export {
  ColorSchemeEditor,
  FontSchemeEditor,
  ThemePresetSelector,
  SampleSlidePreview,
  LayoutAttributesSection,
  THEME_PRESETS,
  OFFICE_THEME,
} from "./panels";
export type {
  ColorSchemeEditorProps,
  FontSchemeEditorProps,
  ThemePresetSelectorProps,
  SampleSlidePreviewProps,
  LayoutAttributesSectionProps,
  ThemeColorScheme,
  ThemePreset,
} from "./panels";
// Theme extraction/export: import directly from SoT packages
// - extractThemeFromBuffer, ThemeExtractionResult: @aurochs-office/pptx/app
// - ExtractedTheme, ThemeExtractionInput: @aurochs-office/pptx/domain
// - exportThemeAsPotx, buildThemeXml, ThemeExportOptions: @aurochs-builder/pptx/builders
