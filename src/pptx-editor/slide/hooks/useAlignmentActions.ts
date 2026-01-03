/**
 * @file Alignment actions hook
 *
 * Provides alignment and distribution operations for selected shapes.
 */

import { useCallback, useMemo } from "react";
import { px, type Pixels } from "../../../pptx/domain/types";
import { useSlideEditor, findShapeByIdWithParents } from "../../context/SlideEditorContext";
import { getAbsoluteBounds, type AbsoluteBounds } from "../../utils/shape-transform";
import type { MultiShapeTransformUpdate } from "./useSlideState";
import { useSlideState } from "./useSlideState";

// =============================================================================
// Types
// =============================================================================

export type AlignmentActions = {
  /** Align selected shapes to the left edge of the leftmost shape */
  readonly alignLeft: () => void;
  /** Align selected shapes to the horizontal center */
  readonly alignCenter: () => void;
  /** Align selected shapes to the right edge of the rightmost shape */
  readonly alignRight: () => void;
  /** Align selected shapes to the top edge of the topmost shape */
  readonly alignTop: () => void;
  /** Align selected shapes to the vertical center */
  readonly alignMiddle: () => void;
  /** Align selected shapes to the bottom edge of the bottommost shape */
  readonly alignBottom: () => void;
  /** Distribute selected shapes evenly horizontally */
  readonly distributeHorizontally: () => void;
  /** Distribute selected shapes evenly vertically */
  readonly distributeVertically: () => void;
  /** Whether alignment is possible (2+ shapes selected) */
  readonly canAlign: boolean;
  /** Whether distribution is possible (3+ shapes selected) */
  readonly canDistribute: boolean;
};

// =============================================================================
// Internal Types
// =============================================================================

type ShapeBoundsInfo = {
  readonly id: string;
  readonly bounds: AbsoluteBounds;
};

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for shape alignment and distribution operations.
 *
 * Alignment: Aligns 2+ selected shapes to a common edge or center.
 * Distribution: Distributes 3+ shapes evenly between the outermost shapes.
 */
export function useAlignmentActions(): AlignmentActions {
  const { selectedShapes, slide } = useSlideEditor();
  const { updateMultipleShapeTransforms } = useSlideState();

  // Build bounds info for all selected shapes
  const boundsInfos = useMemo((): readonly ShapeBoundsInfo[] => {
    const result: ShapeBoundsInfo[] = [];

    for (const shape of selectedShapes) {
      if (!("nonVisual" in shape)) continue;

      const id = shape.nonVisual.id;
      const found = findShapeByIdWithParents(slide.shapes, id);
      if (!found) continue;

      const bounds = getAbsoluteBounds(shape, found.parentGroups);
      if (!bounds) continue;

      result.push({ id, bounds });
    }

    return result;
  }, [selectedShapes, slide.shapes]);

  const canAlign = boundsInfos.length >= 2;
  const canDistribute = boundsInfos.length >= 3;

  // Helper to calculate delta for alignment
  const calculateUpdates = useCallback(
    (
      calculateNewPosition: (bounds: AbsoluteBounds, target: number) => { dx: number; dy: number }
    ): readonly MultiShapeTransformUpdate[] => {
      return boundsInfos.map(({ id, bounds }) => {
        const delta = calculateNewPosition(bounds, 0);
        return {
          id,
          bounds: {
            x: px(bounds.x + delta.dx),
            y: px(bounds.y + delta.dy),
            width: px(bounds.width),
            height: px(bounds.height),
          },
        };
      });
    },
    [boundsInfos]
  );

  // ==========================================================================
  // Alignment Operations
  // ==========================================================================

  const alignLeft = useCallback(() => {
    if (!canAlign) return;

    const minX = Math.min(...boundsInfos.map((b) => b.bounds.x));
    const updates = boundsInfos.map(({ id, bounds }) => ({
      id,
      bounds: {
        x: px(minX) as Pixels,
        y: px(bounds.y) as Pixels,
        width: px(bounds.width) as Pixels,
        height: px(bounds.height) as Pixels,
      },
    }));

    updateMultipleShapeTransforms(updates);
  }, [canAlign, boundsInfos, updateMultipleShapeTransforms]);

  const alignCenter = useCallback(() => {
    if (!canAlign) return;

    const centers = boundsInfos.map((b) => b.bounds.x + b.bounds.width / 2);
    const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;

    const updates = boundsInfos.map(({ id, bounds }) => ({
      id,
      bounds: {
        x: px(avgCenter - bounds.width / 2) as Pixels,
        y: px(bounds.y) as Pixels,
        width: px(bounds.width) as Pixels,
        height: px(bounds.height) as Pixels,
      },
    }));

    updateMultipleShapeTransforms(updates);
  }, [canAlign, boundsInfos, updateMultipleShapeTransforms]);

  const alignRight = useCallback(() => {
    if (!canAlign) return;

    const maxRight = Math.max(...boundsInfos.map((b) => b.bounds.x + b.bounds.width));
    const updates = boundsInfos.map(({ id, bounds }) => ({
      id,
      bounds: {
        x: px(maxRight - bounds.width) as Pixels,
        y: px(bounds.y) as Pixels,
        width: px(bounds.width) as Pixels,
        height: px(bounds.height) as Pixels,
      },
    }));

    updateMultipleShapeTransforms(updates);
  }, [canAlign, boundsInfos, updateMultipleShapeTransforms]);

  const alignTop = useCallback(() => {
    if (!canAlign) return;

    const minY = Math.min(...boundsInfos.map((b) => b.bounds.y));
    const updates = boundsInfos.map(({ id, bounds }) => ({
      id,
      bounds: {
        x: px(bounds.x) as Pixels,
        y: px(minY) as Pixels,
        width: px(bounds.width) as Pixels,
        height: px(bounds.height) as Pixels,
      },
    }));

    updateMultipleShapeTransforms(updates);
  }, [canAlign, boundsInfos, updateMultipleShapeTransforms]);

  const alignMiddle = useCallback(() => {
    if (!canAlign) return;

    const centers = boundsInfos.map((b) => b.bounds.y + b.bounds.height / 2);
    const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;

    const updates = boundsInfos.map(({ id, bounds }) => ({
      id,
      bounds: {
        x: px(bounds.x) as Pixels,
        y: px(avgCenter - bounds.height / 2) as Pixels,
        width: px(bounds.width) as Pixels,
        height: px(bounds.height) as Pixels,
      },
    }));

    updateMultipleShapeTransforms(updates);
  }, [canAlign, boundsInfos, updateMultipleShapeTransforms]);

  const alignBottom = useCallback(() => {
    if (!canAlign) return;

    const maxBottom = Math.max(...boundsInfos.map((b) => b.bounds.y + b.bounds.height));
    const updates = boundsInfos.map(({ id, bounds }) => ({
      id,
      bounds: {
        x: px(bounds.x) as Pixels,
        y: px(maxBottom - bounds.height) as Pixels,
        width: px(bounds.width) as Pixels,
        height: px(bounds.height) as Pixels,
      },
    }));

    updateMultipleShapeTransforms(updates);
  }, [canAlign, boundsInfos, updateMultipleShapeTransforms]);

  // ==========================================================================
  // Distribution Operations
  // ==========================================================================

  const distributeHorizontally = useCallback(() => {
    if (!canDistribute) return;

    // Sort by X position
    const sorted = [...boundsInfos].sort((a, b) => a.bounds.x - b.bounds.x);
    const leftmost = sorted[0];
    const rightmost = sorted[sorted.length - 1];

    // Calculate total width of all shapes
    const totalWidth = sorted.reduce((sum, b) => sum + b.bounds.width, 0);

    // Calculate available space for gaps
    const startX = leftmost.bounds.x;
    const endX = rightmost.bounds.x + rightmost.bounds.width;
    const totalSpace = endX - startX;
    const gapSpace = totalSpace - totalWidth;
    const gapSize = gapSpace / (sorted.length - 1);

    // Calculate new positions
    let currentX = startX;
    const updates = sorted.map(({ id, bounds }) => {
      const update = {
        id,
        bounds: {
          x: px(currentX) as Pixels,
          y: px(bounds.y) as Pixels,
          width: px(bounds.width) as Pixels,
          height: px(bounds.height) as Pixels,
        },
      };
      currentX += bounds.width + gapSize;
      return update;
    });

    updateMultipleShapeTransforms(updates);
  }, [canDistribute, boundsInfos, updateMultipleShapeTransforms]);

  const distributeVertically = useCallback(() => {
    if (!canDistribute) return;

    // Sort by Y position
    const sorted = [...boundsInfos].sort((a, b) => a.bounds.y - b.bounds.y);
    const topmost = sorted[0];
    const bottommost = sorted[sorted.length - 1];

    // Calculate total height of all shapes
    const totalHeight = sorted.reduce((sum, b) => sum + b.bounds.height, 0);

    // Calculate available space for gaps
    const startY = topmost.bounds.y;
    const endY = bottommost.bounds.y + bottommost.bounds.height;
    const totalSpace = endY - startY;
    const gapSpace = totalSpace - totalHeight;
    const gapSize = gapSpace / (sorted.length - 1);

    // Calculate new positions
    let currentY = startY;
    const updates = sorted.map(({ id, bounds }) => {
      const update = {
        id,
        bounds: {
          x: px(bounds.x) as Pixels,
          y: px(currentY) as Pixels,
          width: px(bounds.width) as Pixels,
          height: px(bounds.height) as Pixels,
        },
      };
      currentY += bounds.height + gapSize;
      return update;
    });

    updateMultipleShapeTransforms(updates);
  }, [canDistribute, boundsInfos, updateMultipleShapeTransforms]);

  return useMemo(
    () => ({
      alignLeft,
      alignCenter,
      alignRight,
      alignTop,
      alignMiddle,
      alignBottom,
      distributeHorizontally,
      distributeVertically,
      canAlign,
      canDistribute,
    }),
    [
      alignLeft,
      alignCenter,
      alignRight,
      alignTop,
      alignMiddle,
      alignBottom,
      distributeHorizontally,
      distributeVertically,
      canAlign,
      canDistribute,
    ]
  );
}
