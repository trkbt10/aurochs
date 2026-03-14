/**
 * @file Shape alignment and distribution
 *
 * Pure functions for calculating shape alignment and distribution positions.
 * Format-agnostic — works with any objects that have bounds (x, y, width, height).
 */

import type { SimpleBounds } from "./geometry/types";

// =============================================================================
// Types
// =============================================================================

/**
 * Shape bounds with ID for alignment operations.
 */
export type BoundsWithId<TId = string> = {
  readonly id: TId;
  readonly bounds: SimpleBounds;
};

/**
 * Result of alignment/distribution calculation.
 */
export type AlignmentUpdate<TId = string> = {
  readonly id: TId;
  readonly bounds: SimpleBounds;
};

/**
 * Horizontal alignment target.
 */
export type HorizontalAlignment = "left" | "center" | "right";

/**
 * Vertical alignment target.
 */
export type VerticalAlignment = "top" | "middle" | "bottom";

/**
 * All alignment types including distribution.
 */
export type AlignmentType = HorizontalAlignment | VerticalAlignment | "distributeH" | "distributeV";

// =============================================================================
// Alignment Operations
// =============================================================================

/**
 * Calculate positions for horizontal alignment.
 */
export function alignHorizontal<TId>(
  shapes: readonly BoundsWithId<TId>[],
  alignment: HorizontalAlignment,
): readonly AlignmentUpdate<TId>[] {
  if (shapes.length < 2) { return []; }

  const toUpdate = (s: BoundsWithId<TId>, x: number): AlignmentUpdate<TId> => ({
    id: s.id,
    bounds: { x, y: s.bounds.y, width: s.bounds.width, height: s.bounds.height },
  });

  switch (alignment) {
    case "left": {
      const minX = Math.min(...shapes.map((s) => s.bounds.x));
      return shapes.map((s) => toUpdate(s, minX));
    }
    case "center": {
      const centers = shapes.map((s) => s.bounds.x + s.bounds.width / 2);
      const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;
      return shapes.map((s) => toUpdate(s, avgCenter - s.bounds.width / 2));
    }
    case "right": {
      const maxRight = Math.max(...shapes.map((s) => s.bounds.x + s.bounds.width));
      return shapes.map((s) => toUpdate(s, maxRight - s.bounds.width));
    }
  }
}

/**
 * Calculate positions for vertical alignment.
 */
export function alignVertical<TId>(
  shapes: readonly BoundsWithId<TId>[],
  alignment: VerticalAlignment,
): readonly AlignmentUpdate<TId>[] {
  if (shapes.length < 2) { return []; }

  const toUpdate = (s: BoundsWithId<TId>, y: number): AlignmentUpdate<TId> => ({
    id: s.id,
    bounds: { x: s.bounds.x, y, width: s.bounds.width, height: s.bounds.height },
  });

  switch (alignment) {
    case "top": {
      const minY = Math.min(...shapes.map((s) => s.bounds.y));
      return shapes.map((s) => toUpdate(s, minY));
    }
    case "middle": {
      const centers = shapes.map((s) => s.bounds.y + s.bounds.height / 2);
      const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;
      return shapes.map((s) => toUpdate(s, avgCenter - s.bounds.height / 2));
    }
    case "bottom": {
      const maxBottom = Math.max(...shapes.map((s) => s.bounds.y + s.bounds.height));
      return shapes.map((s) => toUpdate(s, maxBottom - s.bounds.height));
    }
  }
}

// =============================================================================
// Distribution Operations
// =============================================================================

/**
 * Calculate positions for horizontal distribution.
 * Distributes shapes evenly between leftmost and rightmost shapes.
 */
export function distributeHorizontal<TId>(shapes: readonly BoundsWithId<TId>[]): readonly AlignmentUpdate<TId>[] {
  if (shapes.length < 3) { return []; }

  const sorted = [...shapes].sort((a, b) => a.bounds.x - b.bounds.x);
  const startX = sorted[0].bounds.x;
  const endX = sorted[sorted.length - 1].bounds.x + sorted[sorted.length - 1].bounds.width;
  const totalWidth = sorted.reduce((sum, s) => sum + s.bounds.width, 0);
  const gapSize = (endX - startX - totalWidth) / (sorted.length - 1);

  const updates = sorted.reduce<{ updates: AlignmentUpdate<TId>[]; currentX: number }>(
    (acc, s) => {
      acc.updates.push({
        id: s.id,
        bounds: { x: acc.currentX, y: s.bounds.y, width: s.bounds.width, height: s.bounds.height },
      });
      return { updates: acc.updates, currentX: acc.currentX + s.bounds.width + gapSize };
    },
    { updates: [], currentX: startX },
  );

  return updates.updates;
}

/**
 * Calculate positions for vertical distribution.
 * Distributes shapes evenly between topmost and bottommost shapes.
 */
export function distributeVertical<TId>(shapes: readonly BoundsWithId<TId>[]): readonly AlignmentUpdate<TId>[] {
  if (shapes.length < 3) { return []; }

  const sorted = [...shapes].sort((a, b) => a.bounds.y - b.bounds.y);
  const startY = sorted[0].bounds.y;
  const endY = sorted[sorted.length - 1].bounds.y + sorted[sorted.length - 1].bounds.height;
  const totalHeight = sorted.reduce((sum, s) => sum + s.bounds.height, 0);
  const gapSize = (endY - startY - totalHeight) / (sorted.length - 1);

  const updates = sorted.reduce<{ updates: AlignmentUpdate<TId>[]; currentY: number }>(
    (acc, s) => {
      acc.updates.push({
        id: s.id,
        bounds: { x: s.bounds.x, y: acc.currentY, width: s.bounds.width, height: s.bounds.height },
      });
      return { updates: acc.updates, currentY: acc.currentY + s.bounds.height + gapSize };
    },
    { updates: [], currentY: startY },
  );

  return updates.updates;
}

// =============================================================================
// Nudge Operations
// =============================================================================

/**
 * Calculate positions after nudging shapes by delta.
 */
export function nudgeShapes<TId>(shapes: readonly BoundsWithId<TId>[], dx: number, dy: number): readonly AlignmentUpdate<TId>[] {
  return shapes.map((s) => ({
    id: s.id,
    bounds: { x: s.bounds.x + dx, y: s.bounds.y + dy, width: s.bounds.width, height: s.bounds.height },
  }));
}

/**
 * Dispatch alignment by type string.
 */
export function calculateAlignment<TId>(
  shapes: readonly BoundsWithId<TId>[],
  alignment: AlignmentType,
): readonly AlignmentUpdate<TId>[] {
  switch (alignment) {
    case "left":
    case "center":
    case "right":
      return alignHorizontal(shapes, alignment);
    case "top":
    case "middle":
    case "bottom":
      return alignVertical(shapes, alignment);
    case "distributeH":
      return distributeHorizontal(shapes);
    case "distributeV":
      return distributeVertical(shapes);
  }
}
