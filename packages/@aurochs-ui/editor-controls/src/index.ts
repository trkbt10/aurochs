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
