/**
 * @file Public API barrel for editor-controls
 */

// Formatting adapter (bidirectional type conversion)
export type { FormattingAdapter } from "./formatting-adapter";
// Mixed-state (multi-selection field tracking)
export type { MixedContext } from "./mixed-state";
export { isMixedField } from "./mixed-state";

// Text editors
export { TextFormattingEditor, type TextFormattingEditorProps } from "./text";
export { ParagraphFormattingEditor, type ParagraphFormattingEditorProps } from "./text";
export type {
  TextFormatting,
  TextFormattingFeatures,
  HorizontalAlignment,
  ParagraphFormatting,
  ParagraphFormattingFeatures,
} from "./text";

// Surface editors
export { FillFormattingEditor, type FillFormattingEditorProps } from "./surface";
export { OutlineFormattingEditor, type OutlineFormattingEditorProps } from "./surface";
export type {
  FillFormatting,
  FillFormattingFeatures,
  OutlineFormatting,
  BorderEdges,
  OutlineFormattingFeatures,
} from "./surface";

// Table editors
export { TableStyleBandsEditor, type TableStyleBandsEditorProps } from "./table";
export { CellFormattingEditor, type CellFormattingEditorProps } from "./table";
export type {
  TableStyleBands,
  TableBandFeatures,
  VerticalAlignment,
  CellFormatting,
  CellFormattingFeatures,
} from "./table";

// Font (catalog types, context, component, hooks)
export type { FontCatalog, FontCatalogFamilyRecord } from "./font";
export { FontCatalogProvider, useFontCatalog, type FontCatalogProviderProps } from "./font";
export { FontFamilySelect, type FontFamilySelectProps } from "./font";
export { useDocumentFontFamilies } from "./font";
export { useFontCatalogFamilies, type FontCatalogFamiliesState } from "./font";

// Zoom controls
export type { ZoomMode, ZoomControlsProps } from "./zoom";
export {
  ZOOM_STEPS,
  FIT_ZOOM_VALUE,
  getClosestZoomIndex,
  getNextZoomValue,
  getZoomOptions,
  isFitMode,
  ZoomControls,
} from "./zoom";

// Editor shell (responsive 3-panel layout)
export type { EditorLayoutMode, EditorLayoutBreakpoints, EditorPanel, EditorShellProps } from "./editor-shell";
export {
  EditorShell,
  CanvasArea,
  resolveEditorLayoutMode,
  DEFAULT_EDITOR_LAYOUT_BREAKPOINTS,
  useContainerWidth,
  editorContainerStyle,
  toolbarStyle,
  gridContainerStyle,
} from "./editor-shell";
export type { CanvasAreaProps } from "./editor-shell";
