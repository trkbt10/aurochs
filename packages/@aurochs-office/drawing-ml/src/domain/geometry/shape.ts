/**
 * @file Shape geometry types for DrawingML
 *
 * @see ECMA-376 Part 1, Section 20.1.9 - DrawingML Shapes
 */

import type { Degrees } from "../units";
import type { Point } from "./types";
import type { GeometryPath } from "./path";

// =============================================================================
// Preset Geometry
// =============================================================================

/**
 * Preset shape type
 * @see ECMA-376 Part 1, Section 20.1.10.55 (ST_ShapeType)
 */
export type PresetShapeType = string; // "rect", "ellipse", "roundRect", etc.

/**
 * Shape adjustment value (guide value for parametric shapes)
 */
export type AdjustValue = {
  readonly name: string;
  readonly value: number;
};

/**
 * Preset geometry
 * @see ECMA-376 Part 1, Section 20.1.9.18 (prstGeom)
 */
export type PresetGeometry = {
  readonly type: "preset";
  readonly preset: PresetShapeType;
  readonly adjustValues: readonly AdjustValue[];
};

// =============================================================================
// Custom Geometry
// =============================================================================

/**
 * Adjust handle definitions for custom geometry
 * @see ECMA-376 Part 1, Section 20.1.9.1 (ahLst)
 */
export type AdjustHandle = XYAdjustHandle | PolarAdjustHandle;

/**
 * XY adjust handle
 * @see ECMA-376 Part 1, Section 20.1.9.3 (ahXY)
 */
export type XYAdjustHandle = {
  readonly type: "xy";
  readonly position: Point;
  readonly guideX?: string;
  readonly guideY?: string;
  readonly minX?: number;
  readonly maxX?: number;
  readonly minY?: number;
  readonly maxY?: number;
};

/**
 * Polar adjust handle
 * @see ECMA-376 Part 1, Section 20.1.9.2 (ahPolar)
 */
export type PolarAdjustHandle = {
  readonly type: "polar";
  readonly position: Point;
  readonly guideAngle?: string;
  readonly guideRadius?: string;
  readonly minAngle?: Degrees | string;
  readonly maxAngle?: Degrees | string;
  readonly minRadius?: number;
  readonly maxRadius?: number;
};

/**
 * Geometry guide for calculations
 * @see ECMA-376 Part 1, Section 20.1.9.11 (gd)
 */
export type GeometryGuide = {
  readonly name: string;
  readonly formula: string;
};

/**
 * Connection site for connectors
 * @see ECMA-376 Part 1, Section 20.1.9.7 (cxn)
 */
export type ConnectionSite = {
  readonly angle: Degrees;
  readonly position: Point;
};

/**
 * Text rectangle within custom geometry
 * @see ECMA-376 Part 1, Section 20.1.9.22 (rect)
 */
export type TextRect = {
  readonly left: string; // Formula or value
  readonly top: string;
  readonly right: string;
  readonly bottom: string;
};

/**
 * Custom geometry
 * Only pathLst is required per ECMA-376
 * @see ECMA-376 Part 1, Section 20.1.9.8 (custGeom)
 */
export type CustomGeometry = {
  readonly type: "custom";
  readonly paths: readonly GeometryPath[]; // Required (pathLst)
  readonly adjustValues?: readonly AdjustValue[]; // Optional (avLst)
  readonly adjustHandles?: readonly AdjustHandle[]; // Optional (ahLst)
  readonly guides?: readonly GeometryGuide[]; // Optional (gdLst)
  readonly connectionSites?: readonly ConnectionSite[]; // Optional (cxnLst)
  readonly textRect?: TextRect; // Optional (rect)
};

// =============================================================================
// Geometry Union
// =============================================================================

/**
 * Union of geometry types
 */
export type Geometry = PresetGeometry | CustomGeometry;
