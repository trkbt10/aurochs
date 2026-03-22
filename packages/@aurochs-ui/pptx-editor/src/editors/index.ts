/**
 * @file Editors exports
 *
 * Only pptx-specific editors.
 * Shared editors: import from @aurochs-ui/editor-controls/editors
 * SlideLayoutEditor / TransitionEditor: @aurochs-ui/ooxml-components/presentation-theme-layout
 */

// Color editors (pptx-specific: FillEditor with BlipFill support)
export {
  FillEditor,
  type FillEditorProps,
} from "./color";

// Text editors
export {
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
} from "./text";

// Shape editors
export {
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
} from "./shape";

// Table editors
export {
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
} from "./table";

// Slide-level editors (layout/size SoT: @aurochs-ui/ooxml-components/presentation-theme-layout)
export {
  BackgroundEditor,
  createDefaultBackground,
  type BackgroundEditorProps,
} from "./slide";

// OLE object editors
export {
  OleObjectEditor,
  createDefaultOleReference,
  type OleObjectEditorProps,
} from "./ole";
