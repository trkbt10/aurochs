/**
 * @file Bounds calculation utilities
 *
 * Pure functions for calculating bounding boxes, including rotation-aware AABB.
 */

import type { RotatedBoundsInput, SimpleBounds } from "./types";
import { getRotatedCorners } from "./rotate";

// Re-export types used by consumers
export type { RotatedBoundsInput, SimpleBounds } from "./types";

/**
 * Check if a point is inside a (potentially rotated) bounding box.
 * Applies inverse rotation to test the point in the box's local coordinate space.
 */
export function isPointInBounds(
  x: number,
  y: number,
  bounds: { x: number; y: number; width: number; height: number; rotation: number },
): boolean {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const dx = x - centerX;
  const dy = y - centerY;
  const angle = (-bounds.rotation * Math.PI) / 180;
  const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
  const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);
  const halfWidth = bounds.width / 2;
  const halfHeight = bounds.height / 2;
  return Math.abs(rotatedX) <= halfWidth && Math.abs(rotatedY) <= halfHeight;
}

// =============================================================================
// Internal Helpers
// =============================================================================

type Extents = { minX: number; minY: number; maxX: number; maxY: number };

const INITIAL_EXTENTS: Extents = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

function getPointsForBounds(b: RotatedBoundsInput): readonly { x: number; y: number }[] {
  if (b.rotation !== 0) {
    return getRotatedCorners({ x: b.x, y: b.y, width: b.width, height: b.height, rotation: b.rotation });
  }
  return [
    { x: b.x, y: b.y },
    { x: b.x + b.width, y: b.y + b.height },
  ];
}

function updateExtents(extents: Extents, point: { x: number; y: number }): Extents {
  return {
    minX: Math.min(extents.minX, point.x),
    minY: Math.min(extents.minY, point.y),
    maxX: Math.max(extents.maxX, point.x),
    maxY: Math.max(extents.maxY, point.y),
  };
}

function extentsFromPoints(points: readonly { x: number; y: number }[], initial: Extents): Extents {
  return points.reduce(updateExtents, initial);
}

// =============================================================================
// Public Functions
// =============================================================================

/**
 * Calculate combined bounding box with rotation consideration (AABB)
 *
 * Computes the axis-aligned bounding box that encompasses all rotated rectangles.
 * For each input, calculates the four rotated corners and finds the min/max extents.
 */
export function getCombinedBoundsWithRotation(boundsList: readonly RotatedBoundsInput[]): SimpleBounds | undefined {
  if (boundsList.length === 0) {
    return undefined;
  }

  const { minX, minY, maxX, maxY } = boundsList.reduce(
    (acc, b) => extentsFromPoints(getPointsForBounds(b), acc),
    INITIAL_EXTENTS,
  );

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
