/**
 * @file Color editors exports
 */

export { ColorSpecEditor, type ColorSpecEditorProps, createDefaultSrgbColor } from "./ColorSpecEditor";
export { ColorTransformEditor, type ColorTransformEditorProps } from "./ColorTransformEditor";
export { ColorEditor, type ColorEditorProps, createDefaultColor } from "./ColorEditor";
export { FillEditor, type FillEditorProps, createDefaultSolidFill, createNoFill } from "./FillEditor";
export {
  GradientStopEditor,
  type GradientStopEditorProps,
  createDefaultGradientStop,
} from "./GradientStopEditor";
export {
  GradientStopsEditor,
  type GradientStopsEditorProps,
  createDefaultGradientStops,
} from "./GradientStopsEditor";

// LineEditor: import directly from "@/pptx-editor/ui/line/LineEditor"
