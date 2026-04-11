/**
 * @file Shared editors exports
 *
 * Format-agnostic editors shared between pptx-editor and potx-editor.
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
  BaseFillEditor,
  createDefaultSrgbColor,
  createDefaultColor,
  createDefaultSolidFill,
  createNoFill,
  type ColorSpecEditorProps,
  type ColorTransformEditorProps,
  type ColorEditorProps,
  type BaseFillEditorProps,
  type FillTypeExtension,
  type ExtensionRenderProps,
  schemeColorNameOptions,
  schemeColorValueOptions,
  patternPresetOptions,
  GradientStopEditor,
  GradientStopsEditor,
  createDefaultGradientStops,
  type GradientStopEditorProps,
  type GradientStopsEditorProps,
} from "./color";
