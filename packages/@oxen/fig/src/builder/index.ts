/**
 * @file Builder module exports
 *
 * Note: For compression utilities, import from "@oxen/fig/compression"
 * Note: For constants and types, import from "@oxen/fig/constants"
 */

export { buildFigHeader, buildFigFile } from "./header";
export { createTextSchema, TEXT_SCHEMA_INDICES } from "./text-schema";
export {
  TextNodeBuilder,
  FrameNodeBuilder,
  textNode,
  frameNode,
  // Default values (Figma's "Auto")
  DEFAULT_LINE_HEIGHT,
  DEFAULT_LETTER_SPACING,
  DEFAULT_AUTO_RESIZE,
  DEFAULT_SVG_EXPORT_SETTINGS,
  // Types defined in text-builder
  type TextNodeData,
  type FrameNodeData,
  type ValueWithUnits,
  type StackPadding,
  type Color,
  type Paint,
  type FontName,
  type ExportSettings,
} from "./text-builder";

// Symbol and Instance builders
export {
  SymbolNodeBuilder,
  InstanceNodeBuilder,
  symbolNode,
  instanceNode,
  type SymbolNodeData,
  type InstanceNodeData,
} from "./symbol-builder";

// Effect builders
export {
  // Builders
  DropShadowBuilder,
  InnerShadowBuilder,
  LayerBlurBuilder,
  BackgroundBlurBuilder,
  // Factory functions
  dropShadow,
  innerShadow,
  layerBlur,
  backgroundBlur,
  effects,
  // Types
  type EffectData,
  type ShadowEffectData,
  type BlurEffectData,
  type BaseEffectData,
} from "./effect-builder";

// Paint builders
export {
  // Builders
  SolidPaintBuilder,
  LinearGradientBuilder,
  RadialGradientBuilder,
  AngularGradientBuilder,
  DiamondGradientBuilder,
  ImagePaintBuilder,
  StrokeBuilder,
  // Factory functions
  solidPaint,
  solidPaintHex,
  linearGradient,
  radialGradient,
  angularGradient,
  diamondGradient,
  imagePaint,
  stroke,
  // Types
  type GradientStop,
  type GradientHandles,
  type GradientPaint,
  type ImagePaint,
  type StrokeData,
} from "./paint-builder";

// Shape builders
export {
  // Builders
  EllipseNodeBuilder,
  LineNodeBuilder,
  StarNodeBuilder,
  PolygonNodeBuilder,
  VectorNodeBuilder,
  RoundedRectangleNodeBuilder,
  // Factory functions
  ellipseNode,
  lineNode,
  starNode,
  polygonNode,
  vectorNode,
  roundedRectNode,
  // Types
  type EllipseNodeData,
  type LineNodeData,
  type StarNodeData,
  type PolygonNodeData,
  type VectorNodeData,
  type RoundedRectangleNodeData,
  type BaseShapeNodeData,
  type ArcData,
  type Stroke,
} from "./shape-builder";

export { FigFileBuilder, createFigFile } from "./fig-builder";

// Note: Constants and enum types should be imported from "@oxen/fig/constants"
// Examples:
//   import { PAINT_TYPE_VALUES, type PaintType } from "@oxen/fig/constants";
//   import { STACK_MODE_VALUES, type StackMode } from "@oxen/fig/constants";
