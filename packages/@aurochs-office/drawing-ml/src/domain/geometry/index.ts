/**
 * @file Geometry module exports for DrawingML
 *
 * @see ECMA-376 Part 1, Section 20.1.9 - DrawingML Shapes
 */

// Basic types
export type { Point, Size, Bounds, EffectExtent, Transform, GroupTransform } from "./types";

// Path types
export type {
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
} from "./path";

// Shape geometry types
export type {
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
} from "./shape";

// Guide engine
export type { GuideContext } from "./guide-engine";
export {
  createGuideContext,
  evaluateGuides,
  evaluateExpression,
  angleUnitsToDegrees,
  degreesToAngleUnits,
  normalizeAngle,
} from "./guide-engine";
