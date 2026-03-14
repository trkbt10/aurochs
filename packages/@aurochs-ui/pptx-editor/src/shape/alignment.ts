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
  alignHorizontal as genericAlignH,
  alignVertical as genericAlignV,
  distributeHorizontal as genericDistributeH,
  distributeVertical as genericDistributeV,
  nudgeShapes as genericNudge,
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
// PPTX-typed Wrappers
// =============================================================================

/** Align shapes horizontally (left, center, or right) */
export function alignHorizontal(shapes: readonly ShapeBoundsWithId[], alignment: HorizontalAlignment): readonly AlignmentUpdate[] {
  return genericAlignH(shapes, alignment);
}

/** Align shapes vertically (top, middle, or bottom) */
export function alignVertical(shapes: readonly ShapeBoundsWithId[], alignment: VerticalAlignment): readonly AlignmentUpdate[] {
  return genericAlignV(shapes, alignment);
}

/** Distribute shapes evenly along the horizontal axis */
export function distributeHorizontal(shapes: readonly ShapeBoundsWithId[]): readonly AlignmentUpdate[] {
  return genericDistributeH(shapes);
}

/** Distribute shapes evenly along the vertical axis */
export function distributeVertical(shapes: readonly ShapeBoundsWithId[]): readonly AlignmentUpdate[] {
  return genericDistributeV(shapes);
}

/** Nudge shapes by a given delta */
export function nudgeShapes(shapes: readonly ShapeBoundsWithId[], dx: number, dy: number): readonly AlignmentUpdate[] {
  return genericNudge(shapes, dx, dy);
}

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
