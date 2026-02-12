/**
 * @file Path command types for DrawingML geometry
 *
 * @see ECMA-376 Part 1, Section 20.1.9 - DrawingML Shapes
 */

import type { Degrees, Pixels } from "../units";
import type { Point } from "./types";

// =============================================================================
// Path Command Types
// =============================================================================

/**
 * Path command types for custom geometry
 */
export type PathCommandType = "moveTo" | "lineTo" | "arcTo" | "quadBezierTo" | "cubicBezierTo" | "close";

/**
 * Move to command
 */
export type MoveToCommand = {
  readonly type: "moveTo";
  readonly point: Point;
};

/**
 * Line to command
 */
export type LineToCommand = {
  readonly type: "lineTo";
  readonly point: Point;
};

/**
 * Arc to command
 * @see ECMA-376 Part 1, Section 20.1.9.1 (arcTo)
 */
export type ArcToCommand = {
  readonly type: "arcTo";
  readonly widthRadius: Pixels;
  readonly heightRadius: Pixels;
  readonly startAngle: Degrees;
  readonly swingAngle: Degrees;
};

/**
 * Quadratic bezier command
 */
export type QuadBezierCommand = {
  readonly type: "quadBezierTo";
  readonly control: Point;
  readonly end: Point;
};

/**
 * Cubic bezier command
 */
export type CubicBezierCommand = {
  readonly type: "cubicBezierTo";
  readonly control1: Point;
  readonly control2: Point;
  readonly end: Point;
};

/**
 * Close path command
 */
export type CloseCommand = {
  readonly type: "close";
};

/**
 * Union of all path commands
 */
export type PathCommand =
  | MoveToCommand
  | LineToCommand
  | ArcToCommand
  | QuadBezierCommand
  | CubicBezierCommand
  | CloseCommand;

// =============================================================================
// Geometry Path
// =============================================================================

/**
 * Geometry path fill mode
 * @see ECMA-376 Part 1, Section 20.1.10.37 (ST_PathFillMode)
 */
export type PathFillMode = "none" | "norm" | "lighten" | "lightenLess" | "darken" | "darkenLess";

/**
 * Geometry path
 * @see ECMA-376 Part 1, Section 20.1.9.15 (path)
 */
export type GeometryPath = {
  readonly width: Pixels;
  readonly height: Pixels;
  readonly fill: PathFillMode;
  readonly stroke: boolean;
  readonly extrusionOk: boolean;
  readonly commands: readonly PathCommand[];
};
