/**
 * @file Rotation utilities
 *
 * Local wrappers around @aurochs-ui/editor-core/geometry rotation functions.
 */

import type {
  Point as CorePoint,
  RotationResult as CoreRotationResult,
} from "@aurochs-ui/editor-core/geometry";
import {
  normalizeAngle as coreNormalizeAngle,
  degreesToRadians as coreDegreesToRadians,
  radiansToDegrees as coreRadiansToDegrees,
  calculateAngleFromCenter as coreCalculateAngleFromCenter,
  snapAngle as coreSnapAngle,
  rotatePointAroundCenter as coreRotatePointAroundCenter,
  calculateShapeCenter as coreCalculateShapeCenter,
  getRotatedCorners as coreGetRotatedCorners,
  getSvgRotationTransform as coreGetSvgRotationTransform,
  getSvgRotationTransformForBounds as coreGetSvgRotationTransformForBounds,
  rotateShapeAroundCenter as coreRotateShapeAroundCenter,
  calculateRotationDelta as coreCalculateRotationDelta,
} from "@aurochs-ui/editor-core/geometry";

/** Point in 2D space */
export type Point = CorePoint;

/** Rotation result for a shape */
export type RotationResult = CoreRotationResult;

/** Normalize angle to 0-360 range */
export function normalizeAngle(angle: number): number {
  return coreNormalizeAngle(angle);
}

/** Convert degrees to radians */
export function degreesToRadians(degrees: number): number {
  return coreDegreesToRadians(degrees);
}

/** Convert radians to degrees */
export function radiansToDegrees(radians: number): number {
  return coreRadiansToDegrees(radians);
}

/** Calculate the angle (in degrees) from a center point to another point */
export function calculateAngleFromCenter(
  args: { readonly centerX: number; readonly centerY: number; readonly pointX: number; readonly pointY: number },
): number {
  return coreCalculateAngleFromCenter(args);
}

/** Default snap angles (every 45 degrees) */
export const DEFAULT_SNAP_ANGLES: readonly number[] = [0, 45, 90, 135, 180, 225, 270, 315];

/** Default snap threshold in degrees */
export const DEFAULT_SNAP_THRESHOLD = 5;

/** Snap angle to nearest snap point if within threshold */
export function snapAngle(
  angle: number,
  snapAngles: readonly number[] = DEFAULT_SNAP_ANGLES,
  threshold: number = DEFAULT_SNAP_THRESHOLD,
): number {
  return coreSnapAngle(angle, snapAngles, threshold);
}

/** Rotate a point around a center point */
export function rotatePointAroundCenter(point: Point, center: Point, angleRad: number): Point {
  return coreRotatePointAroundCenter(point, center, angleRad);
}

/** Calculate the center point of a shape given its bounds */
export function calculateShapeCenter(
  args: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): Point {
  return coreCalculateShapeCenter(args);
}

/** Get the four corners of a rotated rectangle */
export function getRotatedCorners(
  args: { readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly rotation: number },
): readonly Point[] {
  return coreGetRotatedCorners(args);
}

/** Generate SVG transform attribute string for rotation */
export function getSvgRotationTransform(
  rotation: number,
  centerX: number,
  centerY: number,
): string | undefined {
  return coreGetSvgRotationTransform(rotation, centerX, centerY);
}

/** Generate SVG transform attribute string for rotation around a shape's center */
export function getSvgRotationTransformForBounds(
  args: { readonly rotation: number; readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): string | undefined {
  return coreGetSvgRotationTransformForBounds(args);
}

/** Calculate new position and rotation for a shape when rotating around a combined center */
export function rotateShapeAroundCenter(args: {
  readonly shapeX: number;
  readonly shapeY: number;
  readonly shapeWidth: number;
  readonly shapeHeight: number;
  readonly initialRotation: number;
  readonly combinedCenterX: number;
  readonly combinedCenterY: number;
  readonly deltaAngleDeg: number;
}): RotationResult {
  return coreRotateShapeAroundCenter(args);
}

/** Calculate rotation delta from initial angle to current pointer position */
export function calculateRotationDelta(args: {
  readonly centerX: number;
  readonly centerY: number;
  readonly currentX: number;
  readonly currentY: number;
  readonly startAngle: number;
}): number {
  return coreCalculateRotationDelta(args);
}
