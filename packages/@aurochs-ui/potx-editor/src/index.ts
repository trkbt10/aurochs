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
  extractThemeFromPptx,
  exportThemeAsPotx,
  getThemeFileName,
  COLOR_LABELS,
  COLOR_SCHEME_KEYS,
} from "./panels";
export type {
  ColorSchemeEditorProps,
  FontSchemeEditorProps,
  ThemePresetSelectorProps,
  SampleSlidePreviewProps,
  LayoutAttributesSectionProps,
  ThemeExtractionResult,
  ThemeExportOptions,
  ThemeColorScheme,
  ThemeFontScheme,
  ThemePreset,
} from "./panels";
