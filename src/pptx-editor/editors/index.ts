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
  LineEditor,
  createDefaultSrgbColor,
  createDefaultColor,
  createDefaultSolidFill,
  createNoFill,
  createDefaultGradientStops,
  createDefaultLine,
  type ColorSpecEditorProps,
  type ColorTransformEditorProps,
  type ColorEditorProps,
  type FillEditorProps,
  type GradientStopsEditorProps,
  type LineEditorProps,
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

// Chart editors
export {
  DataLabelsEditor,
  LegendEditor,
  AxisEditor,
  ChartSeriesEditor,
  ChartEditor,
  createDefaultDataLabels,
  createDefaultLegend,
  createDefaultAxis,
  createDefaultCategoryAxis,
  createDefaultValueAxis,
  createDefaultChartSeries,
  createDefaultBarChartSeries,
  createDefaultChart,
  type DataLabelsEditorProps,
  type LegendEditorProps,
  type AxisEditorProps,
  type ChartSeriesEditorProps,
  type ChartEditorProps,
} from "./chart";

// Diagram editors
export {
  DiagramEditor,
  DiagramPointEditor,
  DiagramConnectionEditor,
  createDefaultDiagramDataModel,
  createDefaultDiagramPoint,
  createDefaultDiagramConnection,
  type DiagramEditorProps,
  type DiagramPointEditorProps,
  type DiagramConnectionEditorProps,
} from "./diagram";

// Slide-level editors
export {
  BackgroundEditor,
  TransitionEditor,
  SlideLayoutEditor,
  createDefaultBackground,
  createDefaultTransition,
  type BackgroundEditorProps,
  type TransitionEditorProps,
  type SlideLayoutEditorProps,
} from "./slide";

// OLE object editors
export {
  OleObjectEditor,
  createDefaultOleReference,
  type OleObjectEditorProps,
} from "./ole";
