/**
 * @file DrawingML Domain Types
 *
 * Export all DrawingML domain types for colors, fills, lines, effects, and text.
 */

// Units - branded types and constructors
export type { Brand, Pixels, Degrees, Percent, Points, EMU } from "./units";
export { px, deg, pct, pt, emu } from "./units";

// Color types
export type {
  SchemeColorName,
  SchemeColorValue,
  SrgbColor,
  SchemeColor,
  SystemColor,
  PresetColor,
  HslColor,
  ScrgbColor,
  ColorSpec,
  ColorTransform,
  Color,
} from "./color";

// Color context types
export type { ColorScheme, ColorMap, ColorContext, ColorResolveContext } from "./color-context";

// Color resolution
export { resolveColor } from "./color-resolution";

// Fill types
export type {
  NoFill,
  SolidFill,
  GroupFill,
  GradientStop,
  LinearGradient,
  PathGradient,
  GradientFill,
  PatternType,
  PatternFill,
  BlipTileMode,
  BlipFill,
  BaseFill,
} from "./fill";
export { PATTERN_PRESETS } from "./fill";

// Line types
export type { LineEnd, CustomDash, LineCap, CompoundLine, LineJoin, BaseLine } from "./line";

// Effects types
export type { ShadowEffect, GlowEffect, ReflectionEffect, SoftEdgeEffect, Effects } from "./effects";

// Background fill types
export type {
  ResolvedBackgroundGradientStop,
  RadialCenter,
  SolidBackgroundFill,
  GradientBackgroundFill,
  ImageBackgroundFill,
  ResolvedBackgroundFill,
} from "./background-fill";

// Resolved fill types
export type {
  ResolvedColor,
  ResolvedNoFill,
  ResolvedSolidFill,
  ResolvedGradientStop,
  ResolvedGradientFill,
  ResolvedImageFill,
  ResolvedPatternFill,
  ResolvedFill,
  ResolvedLine,
} from "./resolved-fill";

// Text fill types
export type {
  TextGradientStop,
  TextGradientFillConfig,
  TextSolidFillConfig,
  TextNoFillConfig,
  TextPatternFillConfig,
  TextImageFillConfig,
  TextFillConfig,
} from "./text-fill";

// Text effects types
export type {
  TextShadowConfig,
  TextGlowConfig,
  TextSoftEdgeConfig,
  TextReflectionConfig,
  TextEffectsConfig,
} from "./text-effects";

// Geometry types and functions
export type {
  Point,
  Size,
  Bounds,
  EffectExtent,
  Transform,
  GroupTransform,
  PathCommandType,
  MoveToCommand,
  LineToCommand,
  ArcToCommand,
  QuadBezierCommand,
  CubicBezierCommand,
  CloseCommand,
  PathCommand,
  PathFillMode,
  GeometryPath,
  PresetShapeType,
  AdjustValue,
  PresetGeometry,
  AdjustHandle,
  XYAdjustHandle,
  PolarAdjustHandle,
  GeometryGuide,
  ConnectionSite,
  TextRect,
  CustomGeometry,
  Geometry,
  GuideContext,
} from "./geometry";
export {
  createGuideContext,
  evaluateGuides,
  evaluateExpression,
  angleUnitsToDegrees,
  degreesToAngleUnits,
  normalizeAngle,
} from "./geometry";
