/**
 * @file Editors exports
 */

// Primitive editors
export {
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
} from "./primitives";

// Color editors
export {
  ColorSpecEditor,
  ColorTransformEditor,
  ColorEditor,
  FillEditor,
  GradientStopsEditor,
  createDefaultSrgbColor,
  createDefaultColor,
  createDefaultSolidFill,
  createNoFill,
  createDefaultGradientStops,
  type ColorSpecEditorProps,
  type ColorTransformEditorProps,
  type ColorEditorProps,
  type FillEditorProps,
  type GradientStopsEditorProps,
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

// Slide-level editors
export {
  BackgroundEditor,
  TransitionEditor,
  SlideLayoutEditor,
  SlideSizeEditor,
  createDefaultBackground,
  createDefaultTransition,
  createDefaultSlideSize,
  type BackgroundEditorProps,
  type TransitionEditorProps,
  type SlideLayoutEditorProps,
  type SlideSizeEditorProps,
} from "./slide";

// OLE object editors
export {
  OleObjectEditor,
  createDefaultOleReference,
  type OleObjectEditorProps,
} from "./ole";
