/**
 * @file Rotation calculation utilities
 *
 * Pure functions for calculating shape rotation transformations.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Point in 2D space
 */
export type Point = {
  readonly x: number;
  readonly y: number;
};

/**
 * Rotation result for a shape
 */
export type RotationResult = {
  /** New X position (top-left) */
  readonly x: number;
  /** New Y position (top-left) */
  readonly y: number;
  /** New rotation angle in degrees */
  readonly rotation: number;
};

// =============================================================================
// Angle Utilities
// =============================================================================

/**
 * Normalize angle to 0-360 range.
 */
export function normalizeAngle(angle: number): number {
  const remainder = angle % 360;
  const normalized = remainder < 0 ? remainder + 360 : remainder;
  // Handle -0 edge case
  return normalized === 0 ? 0 : normalized;
}

/**
 * Convert degrees to radians.
 */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees.
 */
export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculate the angle (in degrees) from a center point to another point.
 */
export function calculateAngleFromCenter(
  args: { readonly centerX: number; readonly centerY: number; readonly pointX: number; readonly pointY: number }
): number {
  const { centerX, centerY, pointX, pointY } = args;
  return radiansToDegrees(Math.atan2(pointY - centerY, pointX - centerX));
}

// =============================================================================
// Angle Snapping
// =============================================================================

/**
 * Default snap angles (every 45 degrees).
 */
export const DEFAULT_SNAP_ANGLES: readonly number[] = [
  0, 45, 90, 135, 180, 225, 270, 315,
];

/**
 * Default snap threshold in degrees.
 */
export const DEFAULT_SNAP_THRESHOLD = 5;

/**
 * Snap angle to nearest snap point if within threshold.
 *
 * @param angle - The angle to potentially snap
 * @param snapAngles - Array of angles to snap to
 * @param threshold - Maximum distance from snap point to trigger snapping
 * @returns The snapped angle, or original if not within threshold of any snap point
 */
export function snapAngle(
  angle: number,
  snapAngles: readonly number[] = DEFAULT_SNAP_ANGLES,
  threshold: number = DEFAULT_SNAP_THRESHOLD
): number {
  for (const snapAngleValue of snapAngles) {
    const diff = Math.abs(normalizeAngle(angle - snapAngleValue));
    // Check both sides of the 0/360 boundary
    if (diff < threshold || diff > 360 - threshold) {
      return snapAngleValue;
    }
  }
  return angle;
}

// =============================================================================
// Point Rotation
// =============================================================================

/**
 * Rotate a point around a center point.
 *
 * @param point - The point to rotate
 * @param center - The center of rotation
 * @param angleRad - Rotation angle in radians
 * @returns The rotated point
 */
export function rotatePointAroundCenter(
  point: Point,
  center: Point,
  angleRad: number
): Point {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/**
 * Calculate the center point of a shape given its bounds.
 */
export function calculateShapeCenter(
  args: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
): Point {
  const { x, y, width, height } = args;
  return {
    x: x + width / 2,
    y: y + height / 2,
  };
}

/**
 * Get the four corners of a rotated rectangle.
 *
 * Returns corners in order: top-left, top-right, bottom-right, bottom-left
 * after rotation around the rectangle's center.
 */
export function getRotatedCorners(
  args: { readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly rotation: number }
): readonly Point[] {
  const { x, y, width, height, rotation } = args;
  const center = calculateShapeCenter({ x, y, width, height });
  const rad = degreesToRadians(rotation);

  const corners: Point[] = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];

  return corners.map((corner) => rotatePointAroundCenter(corner, center, rad));
}

/**
 * Generate SVG transform attribute string for rotation.
 *
 * @returns SVG rotate transform string, or undefined if rotation is 0
 */
export function getSvgRotationTransform(
  rotation: number,
  centerX: number,
  centerY: number
): string | undefined {
  if (rotation === 0) {
    return undefined;
  }
  return `rotate(${rotation}, ${centerX}, ${centerY})`;
}

/**
 * Generate SVG transform attribute string for rotation around a shape's center.
 *
 * Convenience function that calculates the center from bounds.
 *
 * @returns SVG rotate transform string, or undefined if rotation is 0
 */
export function getSvgRotationTransformForBounds(
  args: { readonly rotation: number; readonly x: number; readonly y: number; readonly width: number; readonly height: number }
): string | undefined {
  const { rotation, x, y, width, height } = args;
  if (rotation === 0) {
    return undefined;
  }
  const center = calculateShapeCenter({ x, y, width, height });
  return `rotate(${rotation}, ${center.x}, ${center.y})`;
}

// =============================================================================
// Multi-Selection Rotation
// =============================================================================

/**
 * Calculate new position and rotation for a shape when rotating around a combined center.
 *
 * Used for multi-selection rotation where each shape rotates around the group center.
 *
 * @param shapeX - Shape's initial X position (top-left)
 * @param shapeY - Shape's initial Y position (top-left)
 * @param shapeWidth - Shape's width
 * @param shapeHeight - Shape's height
 * @param initialRotation - Shape's initial rotation in degrees
 * @param combinedCenterX - X coordinate of the combined rotation center
 * @param combinedCenterY - Y coordinate of the combined rotation center
 * @param deltaAngleDeg - Rotation delta in degrees
 * @returns New position and rotation for the shape
 */
export function rotateShapeAroundCenter(
  args: {
    readonly shapeX: number;
    readonly shapeY: number;
    readonly shapeWidth: number;
    readonly shapeHeight: number;
    readonly initialRotation: number;
    readonly combinedCenterX: number;
    readonly combinedCenterY: number;
    readonly deltaAngleDeg: number;
  }
): RotationResult {
  const { shapeX, shapeY, shapeWidth, shapeHeight, initialRotation, combinedCenterX, combinedCenterY, deltaAngleDeg } = args;
  // Calculate shape center
  const shapeCenter = calculateShapeCenter({ x: shapeX, y: shapeY, width: shapeWidth, height: shapeHeight });

  // Rotate shape center around combined center
  const deltaRad = degreesToRadians(deltaAngleDeg);
  const newCenter = rotatePointAroundCenter(
    shapeCenter,
    { x: combinedCenterX, y: combinedCenterY },
    deltaRad
  );

  // Calculate new top-left position
  const newX = newCenter.x - shapeWidth / 2;
  const newY = newCenter.y - shapeHeight / 2;

  // Update the shape's individual rotation
  const newRotation = normalizeAngle(initialRotation + deltaAngleDeg);

  return {
    x: newX,
    y: newY,
    rotation: newRotation,
  };
}

/**
 * Calculate rotation delta from initial angle to current pointer position.
 *
 * @param centerX - X coordinate of rotation center
 * @param centerY - Y coordinate of rotation center
 * @param currentX - Current pointer X coordinate
 * @param currentY - Current pointer Y coordinate
 * @param startAngle - Initial angle when drag started
 * @returns Delta angle in degrees
 */
export function calculateRotationDelta(
  args: { readonly centerX: number; readonly centerY: number; readonly currentX: number; readonly currentY: number; readonly startAngle: number }
): number {
  const { centerX, centerY, currentX, currentY, startAngle } = args;
  const currentAngle = calculateAngleFromCenter({ centerX, centerY, pointX: currentX, pointY: currentY });
  return currentAngle - startAngle;
}
