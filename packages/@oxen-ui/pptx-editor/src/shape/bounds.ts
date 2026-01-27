/**
 * @file Shape bounds
 *
 * Bounding box and geometry operations for shapes.
 */

import type { Shape } from "@oxen/pptx/domain";
import type { Bounds, ShapeId } from "@oxen/pptx/domain/types";
import { px } from "@oxen/ooxml/domain/units";
import { getShapeTransform } from "@oxen/pptx-render/svg";
import { findShapeById } from "./query";
import { getRotatedCorners } from "./rotate";

// =============================================================================
// Types
// =============================================================================

/**
 * Input for rotation-aware bounds calculation
 */
export type RotatedBoundsInput = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
};

/**
 * Simple numeric bounds (not branded with Pixels)
 */
export type SimpleBounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Get bounds from shape transform
 */
export function getShapeBounds(shape: Shape): Bounds | undefined {
  const transform = getShapeTransform(shape);
  if (!transform) {
    return undefined;
  }
  return {
    x: transform.x,
    y: transform.y,
    width: transform.width,
    height: transform.height,
  };
}

// =============================================================================
// Combined Bounds Helpers
// =============================================================================

type Extents = { minX: number; minY: number; maxX: number; maxY: number };

const INITIAL_EXTENTS: Extents = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

function updateExtentsFromBounds(extents: Extents, bounds: Bounds): Extents {
  return {
    minX: Math.min(extents.minX, bounds.x as number),
    minY: Math.min(extents.minY, bounds.y as number),
    maxX: Math.max(extents.maxX, (bounds.x as number) + (bounds.width as number)),
    maxY: Math.max(extents.maxY, (bounds.y as number) + (bounds.height as number)),
  };
}

function collectShapeBounds(shapes: readonly Shape[]): readonly Bounds[] {
  return shapes
    .map(getShapeBounds)
    .filter((b): b is Bounds => b !== undefined);
}

/**
 * Calculate combined bounding box for multiple shapes (without rotation consideration)
 *
 * @deprecated Use getCombinedBoundsWithRotation for rotation-aware AABB calculation
 */
export function getCombinedBounds(shapes: readonly Shape[]): Bounds | undefined {
  const boundsList = collectShapeBounds(shapes);
  if (boundsList.length === 0) {
    return undefined;
  }

  const { minX, minY, maxX, maxY } = boundsList.reduce(updateExtentsFromBounds, INITIAL_EXTENTS);

  return {
    x: px(minX),
    y: px(minY),
    width: px(maxX - minX),
    height: px(maxY - minY),
  };
}

function getPointsForBounds(b: RotatedBoundsInput): readonly { x: number; y: number }[] {
  if (b.rotation !== 0) {
    return getRotatedCorners(b.x, b.y, b.width, b.height, b.rotation);
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

/**
 * Calculate combined bounding box with rotation consideration (AABB)
 *
 * Computes the axis-aligned bounding box that encompasses all rotated rectangles.
 * For each input, calculates the four rotated corners and finds the min/max extents.
 */
export function getCombinedBoundsWithRotation(
  boundsList: readonly RotatedBoundsInput[]
): SimpleBounds | undefined {
  if (boundsList.length === 0) {
    return undefined;
  }

  const initial: Extents = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const { minX, minY, maxX, maxY } = boundsList.reduce(
    (acc, b) => extentsFromPoints(getPointsForBounds(b), acc),
    initial
  );

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Collect bounds for specified shape IDs
 * Returns a Map from ShapeId to Bounds for shapes that have valid bounds.
 */
export function collectBoundsForIds(
  shapes: readonly Shape[],
  ids: readonly ShapeId[]
): Map<ShapeId, Bounds> {
  const result = new Map<ShapeId, Bounds>();
  for (const id of ids) {
    const shape = findShapeById(shapes, id);
    if (shape) {
      const bounds = getShapeBounds(shape);
      if (bounds) {
        result.set(id, bounds);
      }
    }
  }
  return result;
}

function boundsCenter(bounds: Bounds): { x: number; y: number } {
  return {
    x: (bounds.x as number) + (bounds.width as number) / 2,
    y: (bounds.y as number) + (bounds.height as number) / 2,
  };
}

/**
 * Calculate combined center point for shapes
 */
export function getCombinedCenter(
  boundsMap: Map<ShapeId, Bounds>
): { centerX: number; centerY: number } | undefined {
  if (boundsMap.size === 0) {
    return undefined;
  }

  const centers = Array.from(boundsMap.values()).map(boundsCenter);
  const total = centers.reduce(
    (acc, c) => ({ x: acc.x + c.x, y: acc.y + c.y }),
    { x: 0, y: 0 }
  );

  return {
    centerX: total.x / boundsMap.size,
    centerY: total.y / boundsMap.size,
  };
}
