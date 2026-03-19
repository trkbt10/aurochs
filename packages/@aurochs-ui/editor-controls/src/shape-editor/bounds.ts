/**
 * @file Generic shape bounds utilities
 *
 * Bounding box operations for shapes.
 * Format-specific transform access is handled via callback injection.
 */

import type { ShapeNode } from "./types";
import type { ShapeTransform } from "./transform";
import { findShapeById } from "./query";

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Get bounds from shape transform using a resolver callback.
 */
export function getShapeBounds(
  shape: ShapeNode,
  getTransform: (shape: ShapeNode) => ShapeTransform | undefined,
): { x: number; y: number; width: number; height: number } | undefined {
  const transform = getTransform(shape);
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

function updateExtentsFromBounds(extents: Extents, bounds: { x: number; y: number; width: number; height: number }): Extents {
  return {
    minX: Math.min(extents.minX, bounds.x),
    minY: Math.min(extents.minY, bounds.y),
    maxX: Math.max(extents.maxX, bounds.x + bounds.width),
    maxY: Math.max(extents.maxY, bounds.y + bounds.height),
  };
}

/**
 * Calculate combined bounding box for multiple shapes (without rotation consideration)
 *
 * @deprecated Use getCombinedBoundsWithRotation for rotation-aware AABB calculation
 */
export function getCombinedBounds(
  shapes: readonly ShapeNode[],
  getTransform: (shape: ShapeNode) => ShapeTransform | undefined,
): { x: number; y: number; width: number; height: number } | undefined {
  const boundsList = shapes
    .map((s) => getShapeBounds(s, getTransform))
    .filter((b): b is { x: number; y: number; width: number; height: number } => b !== undefined);
  if (boundsList.length === 0) {
    return undefined;
  }

  const { minX, minY, maxX, maxY } = boundsList.reduce(updateExtentsFromBounds, INITIAL_EXTENTS);

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Collect bounds for specified shape IDs
 */
export function collectBoundsForIds(
  shapes: readonly ShapeNode[],
  ids: readonly string[],
  getTransform: (shape: ShapeNode) => ShapeTransform | undefined,
): Map<string, { x: number; y: number; width: number; height: number }> {
  const result = new Map<string, { x: number; y: number; width: number; height: number }>();
  for (const id of ids) {
    const shape = findShapeById(shapes, id);
    if (shape) {
      const bounds = getShapeBounds(shape, getTransform);
      if (bounds) {
        result.set(id, bounds);
      }
    }
  }
  return result;
}

/**
 * Calculate combined center point for shapes
 */
export function getCombinedCenter(
  boundsMap: ReadonlyMap<string, { x: number; y: number; width: number; height: number }>,
): { centerX: number; centerY: number } | undefined {
  if (boundsMap.size === 0) {
    return undefined;
  }

  const centers = Array.from(boundsMap.values()).map((b) => ({
    x: b.x + b.width / 2,
    y: b.y + b.height / 2,
  }));
  const total = centers.reduce((acc, c) => ({ x: acc.x + c.x, y: acc.y + c.y }), { x: 0, y: 0 });

  return {
    centerX: total.x / boundsMap.size,
    centerY: total.y / boundsMap.size,
  };
}
