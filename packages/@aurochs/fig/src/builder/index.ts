/**
 * @file Builder module exports
 *
 * Note: For compression utilities, import from "@aurochs/fig/compression"
 * Note: For constants and types, import from "@aurochs/fig/constants"
 */

// Header utilities (from header/)
export { buildFigHeader, buildFigFile } from "./header";
// Schema (from schema/)
export { createTextSchema, TEXT_SCHEMA_INDICES } from "./schema";

// Common types (from types/)
export type { Color, Paint, StackPadding, ValueWithUnits, FontName } from "./types";

// Text node builder (from text/)
export {
  type TextNodeBuilder,
  textNode,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_LETTER_SPACING,
  DEFAULT_AUTO_RESIZE,
  type TextNodeData,
  type DerivedTextNodeData,
  type DerivedGlyphData,
  type DerivedBaselineData,
} from "./text";

// Frame node builder (from frame/)
export {
  type FrameNodeBuilder,
  frameNode,
  DEFAULT_SVG_EXPORT_SETTINGS,
  type FrameNodeData,
  type ExportSettings,
} from "./frame";

// Symbol and Instance builders (from symbol/)
export {
  type SymbolNodeBuilder,
  type InstanceNodeBuilder,
  symbolNode,
  instanceNode,
  type SymbolNodeData,
  type InstanceNodeData,
} from "./symbol";

// Effect builders (from effect/)
export {
  // Builders
  type DropShadowBuilder,
  type InnerShadowBuilder,
  type LayerBlurBuilder,
  type BackgroundBlurBuilder,
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
} from "./effect";

// Paint builders (from paint/)
export {
  // Builders
  type SolidPaintBuilder,
  type LinearGradientBuilder,
  type RadialGradientBuilder,
  type AngularGradientBuilder,
  type DiamondGradientBuilder,
  type ImagePaintBuilder,
  type StrokeBuilder,
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
} from "./paint";

// Shape builders (from shape/)
export {
  // Builders
  type EllipseNodeBuilder,
  type LineNodeBuilder,
  type StarNodeBuilder,
  type PolygonNodeBuilder,
  type VectorNodeBuilder,
  type RectangleNodeBuilder,
  type RoundedRectangleNodeBuilder,
  // Factory functions
  ellipseNode,
  lineNode,
  starNode,
  polygonNode,
  vectorNode,
  rectNode,
  roundedRectNode,
  // Types
  type EllipseNodeData,
  type LineNodeData,
  type StarNodeData,
  type PolygonNodeData,
  type VectorNodeData,
  type RectangleNodeData,
  type RoundedRectangleNodeData,
  type BaseShapeNodeData,
  type ArcData,
} from "./shape";
export type { Stroke } from "./types";

// Fig file builder (from node/)
export { type FigFileBuilder, createFigFile } from "./node";

// Container node builders (from node/)
export {
  type GroupNodeBuilder,
  groupNode,
  type SectionNodeBuilder,
  sectionNode,
  type BooleanOperationNodeBuilder,
  booleanNode,
  BOOLEAN_OPERATION_TYPE_VALUES,
  type GroupNodeData,
  type SectionNodeData,
  type BooleanOperationNodeData,
  type BooleanOperationType,
} from "./node";

// Blob encoder (for fillGeometry/strokeGeometry)
export {
  createBlobBuilder,
  createRectBlob,
  createRoundedRectBlob,
  createEllipseBlob,
  createFillGeometry,
  type FigBlob,
} from "./blob-encoder";

// Note: Constants and enum types should be imported from "@aurochs/fig/constants"
// Examples:
//   import { PAINT_TYPE_VALUES, type PaintType } from "@aurochs/fig/constants";
//   import { STACK_MODE_VALUES, type StackMode } from "@aurochs/fig/constants";
