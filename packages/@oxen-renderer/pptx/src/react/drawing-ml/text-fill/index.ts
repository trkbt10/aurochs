/**
 * @file Text Fill module exports
 *
 * SVG definition components for DrawingML text fills.
 *
 * Note: These components are format-agnostic and can be migrated to use
 * @oxen-renderer/drawing-ml/text-fill directly. The PPTX-specific types
 * are defined in @oxen-office/pptx/domain/drawing-ml/text-fill.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */

// PPTX-specific implementations (use PPTX text fill types)
export { createTextGradientDef, type TextGradientDefProps } from "./GradientDef";
export {
  createTextPatternDef,
  getTextPatternSize,
  renderTextPatternContent,
} from "./PatternDef";
export { createTextImageFillDef } from "./ImageFillDef";
