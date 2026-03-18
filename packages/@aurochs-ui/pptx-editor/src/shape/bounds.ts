/**
 * @file Shape bounds
 *
 * PPTX-specific bounding box operations.
 * Delegates to editor-controls generic implementation via pptxTransformResolver.
 */

import type { Shape } from "@aurochs-office/pptx/domain";
import type { Bounds, ShapeId } from "@aurochs-office/pptx/domain/types";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { getShapeTransform } from "@aurochs-renderer/pptx/svg";
import { findShapeById } from "./query";
import { pptxTransformResolver } from "./transform";

import {
  getShapeBounds as genericGetShapeBounds,
  getCombinedBounds as genericGetCombinedBounds,
  collectBoundsForIds as genericCollectBoundsForIds,
  getCombinedCenter as genericGetCombinedCenter,
} from "@aurochs-ui/editor-controls/shape-editor";

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
// PPTX-typed Functions
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

/**
 * Calculate combined bounding box for multiple shapes (without rotation consideration)
 *
 * @deprecated Use getCombinedBoundsWithRotation for rotation-aware AABB calculation
 */
export function getCombinedBounds(shapes: readonly Shape[]): Bounds | undefined {
  const result = genericGetCombinedBounds(shapes, pptxTransformResolver.getTransform);
  if (!result) return undefined;
  return {
    x: px(result.x),
    y: px(result.y),
    width: px(result.width),
    height: px(result.height),
  };
}

/**
 * Collect bounds for specified shape IDs
 */
export function collectBoundsForIds(shapes: readonly Shape[], ids: readonly ShapeId[]): Map<ShapeId, Bounds> {
  const generic = genericCollectBoundsForIds(shapes, ids, pptxTransformResolver.getTransform);
  const result = new Map<ShapeId, Bounds>();
  for (const [id, b] of generic) {
    result.set(id as ShapeId, { x: px(b.x), y: px(b.y), width: px(b.width), height: px(b.height) });
  }
  return result;
}

/**
 * Calculate combined center point for shapes
 */
export function getCombinedCenter(boundsMap: Map<ShapeId, Bounds>): { centerX: number; centerY: number } | undefined {
  return genericGetCombinedCenter(boundsMap as ReadonlyMap<string, { x: number; y: number; width: number; height: number }>);
}
