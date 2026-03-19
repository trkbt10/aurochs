/**
 * @file Shape alignment and distribution
 *
 * Delegates to @aurochs-ui/editor-core/alignment for generic algorithms.
 * Provides PPTX-specific wrapper using Shape/Bounds/ShapeId types.
 */

import type { Shape } from "@aurochs-office/pptx/domain";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import { getShapeBounds } from "./bounds";
import {
  type BoundsWithId,
  type AlignmentUpdate as GenericAlignmentUpdate,
  calculateAlignment as genericCalculateAlignment,
} from "@aurochs-ui/editor-core/alignment";

/** Horizontal alignment direction */
export type HorizontalAlignment = "left" | "center" | "right";

/** Vertical alignment direction */
export type VerticalAlignment = "top" | "middle" | "bottom";

/** Combined alignment type for either direction or distribution */
export type AlignmentType = HorizontalAlignment | VerticalAlignment | "distributeH" | "distributeV";

// =============================================================================
// PPTX Types
// =============================================================================

/**
 * Shape bounds with ID for alignment operations
 */
export type ShapeBoundsWithId = BoundsWithId<ShapeId>;

/**
 * Result of alignment/distribution calculation
 */
export type AlignmentUpdate = GenericAlignmentUpdate<ShapeId>;

// =============================================================================
// High-level API (PPTX-specific)
// =============================================================================

/**
 * Calculate aligned bounds for shapes in an array.
 * Convenience wrapper that works with Shape arrays.
 */
export function calculateAlignedBounds(
  shapes: readonly Shape[],
  selectedIds: readonly ShapeId[],
  alignment: AlignmentType,
): Map<ShapeId, { x: number; y: number }> {
  const result = new Map<ShapeId, { x: number; y: number }>();

  const selectedBounds: ShapeBoundsWithId[] = [];
  for (const id of selectedIds) {
    const shape = shapes.find((s) => "nonVisual" in s && s.nonVisual.id === id);
    if (!shape) { continue; }

    const bounds = getShapeBounds(shape);
    if (!bounds) { continue; }

    selectedBounds.push({ id, bounds: { x: bounds.x as number, y: bounds.y as number, width: bounds.width as number, height: bounds.height as number } });
  }

  if (selectedBounds.length < 2) { return result; }

  const updates = genericCalculateAlignment(selectedBounds, alignment);

  for (const update of updates) {
    result.set(update.id, { x: update.bounds.x, y: update.bounds.y });
  }

  return result;
}
