/**
 * @file Shape bounds
 *
 * Bounding box and geometry operations for shapes.
 * Generic geometry functions are re-exported from @aurochs-ui/editor-core/geometry.
 */

import type { Shape } from "@aurochs-office/pptx/domain";
import type { Bounds, ShapeId } from "@aurochs-office/pptx/domain/types";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { getShapeTransform } from "@aurochs-renderer/pptx/svg";
import { findShapeById } from "./query";

import type {
  RotatedBoundsInput as CoreRotatedBoundsInput,
  SimpleBounds as CoreSimpleBounds,
} from "@aurochs-ui/editor-core/geometry";
import { getCombinedBoundsWithRotation as coreCombinedBoundsWithRotation } from "@aurochs-ui/editor-core/geometry";

/**
 * Input for rotation-aware bounding box calculation
 */
export type RotatedBoundsInput = CoreRotatedBoundsInput;

/**
 * Simple axis-aligned bounding box
 */
export type SimpleBounds = CoreSimpleBounds;

/**
 * Calculate combined axis-aligned bounding box considering rotated shapes
 */
export function getCombinedBoundsWithRotation(inputs: readonly RotatedBoundsInput[]): SimpleBounds | undefined {
  return coreCombinedBoundsWithRotation(inputs);
}

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
  return shapes.map(getShapeBounds).filter((b): b is Bounds => b !== undefined);
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

/**
 * Collect bounds for specified shape IDs
 * Returns a Map from ShapeId to Bounds for shapes that have valid bounds.
 */
export function collectBoundsForIds(shapes: readonly Shape[], ids: readonly ShapeId[]): Map<ShapeId, Bounds> {
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
export function getCombinedCenter(boundsMap: Map<ShapeId, Bounds>): { centerX: number; centerY: number } | undefined {
  if (boundsMap.size === 0) {
    return undefined;
  }

  const centers = Array.from(boundsMap.values()).map(boundsCenter);
  const total = centers.reduce((acc, c) => ({ x: acc.x + c.x, y: acc.y + c.y }), { x: 0, y: 0 });

  return {
    centerX: total.x / boundsMap.size,
    centerY: total.y / boundsMap.size,
  };
}
