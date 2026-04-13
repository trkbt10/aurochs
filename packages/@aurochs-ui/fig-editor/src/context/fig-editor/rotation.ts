/**
 * @file Rotation SoT for Figma nodes
 *
 * Figma's rotation model:
 * - The rotation origin is always the center of the node's bounding box.
 * - When rotating, the transform's translation (m02, m12) is adjusted so
 *   the center stays at the same world-space position.
 * - This is not configurable — all rotations use center origin.
 *
 * This module provides the single source of truth for rotation-related
 * calculations. All code that reads or writes rotation must use these
 * functions to avoid discrepancies between:
 * - SVG rendering (uses matrix() transform directly)
 * - Editor selection boxes (uses x/y + rotate(angle, cx, cy))
 * - Rotation commit (updates m00/m01/m10/m11 + adjusts m02/m12)
 * - Transform panel (user edits rotation in degrees)
 */

import type { FigMatrix } from "@aurochs/fig/types";

/**
 * Extract rotation angle in degrees from a transform matrix.
 */
export function extractRotationDeg(m: { readonly m00: number; readonly m10: number }): number {
  return Math.atan2(m.m10, m.m00) * (180 / Math.PI);
}

/**
 * Compute the world-space center of a node given its absolute transform and size.
 *
 * The center in local coordinates is (width/2, height/2).
 * Applying the affine transform gives the world-space center.
 */
export function computeWorldCenter(
  transform: FigMatrix,
  width: number,
  height: number,
): { cx: number; cy: number } {
  const halfW = width / 2;
  const halfH = height / 2;
  return {
    cx: transform.m00 * halfW + transform.m01 * halfH + transform.m02,
    cy: transform.m10 * halfW + transform.m11 * halfH + transform.m12,
  };
}

/**
 * Compute the "pre-rotation top-left" position for EditorCanvas selection boxes.
 *
 * EditorCanvas draws selection boxes by placing a rect at (x, y), then applying
 * `rotate(angle, x+w/2, y+h/2)`. For this to match the SVG renderer's matrix()
 * transform, (x, y) must be the position where the top-left corner would be
 * if the node were not rotated, centered at the same world-space location.
 *
 * This is simply (cx - width/2, cy - height/2).
 */
export function computePreRotationTopLeft(
  transform: FigMatrix,
  width: number,
  height: number,
): { x: number; y: number } {
  const { cx, cy } = computeWorldCenter(transform, width, height);
  return {
    x: cx - width / 2,
    y: cy - height / 2,
  };
}

type BuildRotatedTransformOptions = {
  readonly currentTransform: FigMatrix;
  readonly width: number;
  readonly height: number;
  readonly newAngleDeg: number;
};

/**
 * Build a new transform matrix with the specified rotation angle (in degrees),
 * keeping the node's center at the same world-space position.
 *
 * This is the SoT for all rotation operations (drag commit, panel edit, etc.).
 *
 * @returns New transform matrix with adjusted position
 */
export function buildRotatedTransform(
  { currentTransform, width, height, newAngleDeg }: BuildRotatedTransformOptions,
): FigMatrix {
  const halfW = width / 2;
  const halfH = height / 2;

  // Current center in world space
  const { cx, cy } = computeWorldCenter(currentTransform, width, height);

  // New rotation
  const radians = (newAngleDeg * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  // Derive m02/m12 so that the new matrix maps the local center (halfW, halfH)
  // to the same world-space center (cx, cy).
  //   cx = cos*halfW + (-sin)*halfH + m02  →  m02 = cx - cos*halfW + sin*halfH
  //   cy = sin*halfW + cos*halfH + m12     →  m12 = cy - sin*halfW - cos*halfH
  return {
    m00: cos,
    m01: -sin,
    m02: cx - cos * halfW + sin * halfH,
    m10: sin,
    m11: cos,
    m12: cy - sin * halfW - cos * halfH,
  };
}
