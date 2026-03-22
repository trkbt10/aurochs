/**
 * @file potx-editor entry point
 *
 * PowerPoint Template (POTX) editor shell and theme document state.
 * Theme part UI (color/font/clrMap/background/presets/…) is implemented in
 * `@aurochs-ui/ooxml-components/presentation-theme-layout`.
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
  ImportedThemeData,
} from "./context";

// =============================================================================
// Panels (POTX-only: layout shape UI / overlays)
// =============================================================================
export { LayoutShapePanel, NoShapeSelected, ShapeInfoOverlay } from "./panels";
export type { LayoutShapePanelProps, ShapeInfoOverlayProps } from "./panels";

// Theme extraction/export: import directly from SoT packages
// - extractThemeFromBuffer, ThemeExtractionResult: @aurochs-office/pptx/app
// - ExtractedTheme, ThemeExtractionInput: @aurochs-office/pptx/domain
// - exportThemeAsPotx, buildThemeXml, ThemeExportOptions: @aurochs-builder/pptx/builders
// - theme UI: @aurochs-ui/ooxml-components/presentation-theme-layout
