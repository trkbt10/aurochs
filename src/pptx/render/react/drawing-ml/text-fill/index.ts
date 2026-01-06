/**
 * @file Text Fill module exports
 *
 * SVG definition components for DrawingML text fills.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */

export { createTextGradientDef, type TextGradientDefProps } from "./GradientDef";
export {
  createTextPatternDef,
  getTextPatternSize,
  renderTextPatternContent,
} from "./PatternDef";
export { createTextImageFillDef } from "./ImageFillDef";
