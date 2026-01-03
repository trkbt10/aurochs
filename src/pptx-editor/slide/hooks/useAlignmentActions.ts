/**
 * @file Alignment actions hook
 *
 * Provides alignment and distribution operations for selected shapes.
 */

import { useCallback, useMemo } from "react";
import { px } from "../../../pptx/domain/types";
import { useSlideEditor } from "../context";
import { findShapeByIdWithParents } from "../shape/query";
import { getAbsoluteBounds } from "../shape/transform";
import {
  alignHorizontal,
  alignVertical,
  distributeHorizontal,
  distributeVertical,
  type ShapeBoundsWithId,
} from "../shape/alignment";
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
  const boundsInfos = useMemo((): readonly ShapeBoundsWithId[] => {
    const result: ShapeBoundsWithId[] = [];

    for (const shape of selectedShapes) {
      if (!("nonVisual" in shape)) continue;

      const id = shape.nonVisual.id;
      const found = findShapeByIdWithParents(slide.shapes, id);
      if (!found) continue;

      const absoluteBounds = getAbsoluteBounds(shape, found.parentGroups);
      if (!absoluteBounds) continue;

      // Convert AbsoluteBounds (numbers) to Bounds (Pixels)
      result.push({
        id,
        bounds: {
          x: px(absoluteBounds.x),
          y: px(absoluteBounds.y),
          width: px(absoluteBounds.width),
          height: px(absoluteBounds.height),
        },
      });
    }

    return result;
  }, [selectedShapes, slide.shapes]);

  const canAlign = boundsInfos.length >= 2;
  const canDistribute = boundsInfos.length >= 3;

  // ==========================================================================
  // Alignment Operations (delegated to pure functions)
  // ==========================================================================

  const alignLeft = useCallback(() => {
    const updates = alignHorizontal(boundsInfos, "left");
    if (updates.length > 0) updateMultipleShapeTransforms(updates);
  }, [boundsInfos, updateMultipleShapeTransforms]);

  const alignCenter = useCallback(() => {
    const updates = alignHorizontal(boundsInfos, "center");
    if (updates.length > 0) updateMultipleShapeTransforms(updates);
  }, [boundsInfos, updateMultipleShapeTransforms]);

  const alignRight = useCallback(() => {
    const updates = alignHorizontal(boundsInfos, "right");
    if (updates.length > 0) updateMultipleShapeTransforms(updates);
  }, [boundsInfos, updateMultipleShapeTransforms]);

  const alignTop = useCallback(() => {
    const updates = alignVertical(boundsInfos, "top");
    if (updates.length > 0) updateMultipleShapeTransforms(updates);
  }, [boundsInfos, updateMultipleShapeTransforms]);

  const alignMiddle = useCallback(() => {
    const updates = alignVertical(boundsInfos, "middle");
    if (updates.length > 0) updateMultipleShapeTransforms(updates);
  }, [boundsInfos, updateMultipleShapeTransforms]);

  const alignBottom = useCallback(() => {
    const updates = alignVertical(boundsInfos, "bottom");
    if (updates.length > 0) updateMultipleShapeTransforms(updates);
  }, [boundsInfos, updateMultipleShapeTransforms]);

  // ==========================================================================
  // Distribution Operations (delegated to pure functions)
  // ==========================================================================

  const doDistributeHorizontally = useCallback(() => {
    const updates = distributeHorizontal(boundsInfos);
    if (updates.length > 0) updateMultipleShapeTransforms(updates);
  }, [boundsInfos, updateMultipleShapeTransforms]);

  const doDistributeVertically = useCallback(() => {
    const updates = distributeVertical(boundsInfos);
    if (updates.length > 0) updateMultipleShapeTransforms(updates);
  }, [boundsInfos, updateMultipleShapeTransforms]);

  return useMemo(
    () => ({
      alignLeft,
      alignCenter,
      alignRight,
      alignTop,
      alignMiddle,
      alignBottom,
      distributeHorizontally: doDistributeHorizontally,
      distributeVertically: doDistributeVertically,
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
      doDistributeHorizontally,
      doDistributeVertically,
      canAlign,
      canDistribute,
    ]
  );
}
