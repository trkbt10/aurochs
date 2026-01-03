/**
 * @file Slide state hook
 *
 * Provides convenient API for slide mutations.
 */

import { useCallback, useMemo } from "react";
import type { Slide, Shape } from "../../../pptx/domain";
import type { Transform, Pixels } from "../../../pptx/domain/types";
import { useSlideEditor } from "../context";
import { withUpdatedTransform } from "../shape/transform";
import { updateShapeById } from "../shape/mutation";
import type { ShapeId } from "../types";

/**
 * Transform update for multiple shapes
 */
export type MultiShapeTransformUpdate = {
  readonly id: ShapeId;
  readonly bounds: {
    readonly x: Pixels;
    readonly y: Pixels;
    readonly width: Pixels;
    readonly height: Pixels;
  };
};

/**
 * Result of useSlideState hook
 */
export type UseSlideStateResult = {
  /** Current slide */
  readonly slide: Slide;
  /** Update slide with updater function */
  readonly updateSlide: (updater: (slide: Slide) => Slide) => void;
  /** Update a specific shape */
  readonly updateShape: (shapeId: ShapeId, updater: (shape: Shape) => Shape) => void;
  /** Update shape transform */
  readonly updateShapeTransform: (
    shapeId: ShapeId,
    transform: Partial<Transform>
  ) => void;
  /** Update multiple shapes' transforms (for multi-selection operations) */
  readonly updateMultipleShapeTransforms: (
    updates: readonly MultiShapeTransformUpdate[]
  ) => void;
  /** Nudge shapes by delta (relative move) */
  readonly nudgeShapes: (
    shapeIds: readonly ShapeId[],
    dx: number,
    dy: number
  ) => void;
  /** Delete shapes by IDs */
  readonly deleteShapes: (shapeIds: readonly ShapeId[]) => void;
  /** Delete selected shapes */
  readonly deleteSelected: () => void;
  /** Add a new shape */
  readonly addShape: (shape: Shape) => void;
  /** Duplicate selected shapes */
  readonly duplicateSelected: () => void;
  /** Reorder shape (front, back, forward, backward) */
  readonly reorderShape: (
    shapeId: ShapeId,
    direction: "front" | "back" | "forward" | "backward"
  ) => void;
  /** Undo */
  readonly undo: () => void;
  /** Redo */
  readonly redo: () => void;
  /** Can undo */
  readonly canUndo: boolean;
  /** Can redo */
  readonly canRedo: boolean;
};

/**
 * Hook for slide state mutations
 *
 * Provides a convenient API for updating slide and shapes.
 */
export function useSlideState(): UseSlideStateResult {
  const { state, dispatch, slide, canUndo, canRedo } = useSlideEditor();

  const updateSlide = useCallback(
    (updater: (slide: Slide) => Slide) => {
      dispatch({ type: "UPDATE_SLIDE", updater });
    },
    [dispatch]
  );

  const updateShape = useCallback(
    (shapeId: ShapeId, updater: (shape: Shape) => Shape) => {
      dispatch({ type: "UPDATE_SHAPE", shapeId, updater });
    },
    [dispatch]
  );

  const updateShapeTransform = useCallback(
    (shapeId: ShapeId, transformUpdate: Partial<Transform>) => {
      dispatch({
        type: "UPDATE_SHAPE",
        shapeId,
        updater: (shape) => withUpdatedTransform(shape, transformUpdate),
      });
    },
    [dispatch]
  );

  const updateMultipleShapeTransforms = useCallback(
    (updates: readonly MultiShapeTransformUpdate[]) => {
      // Apply all updates in a single slide update to batch them together
      dispatch({
        type: "UPDATE_SLIDE",
        updater: (currentSlide) => {
          let newShapes = currentSlide.shapes;
          for (const update of updates) {
            newShapes = updateShapeById(newShapes, update.id, (shape) =>
              withUpdatedTransform(shape, update.bounds)
            );
          }
          return { ...currentSlide, shapes: newShapes };
        },
      });
    },
    [dispatch]
  );

  const nudgeShapes = useCallback(
    (shapeIds: readonly ShapeId[], dx: number, dy: number) => {
      if (shapeIds.length === 0) return;

      // Apply all nudges in a single slide update
      dispatch({
        type: "UPDATE_SLIDE",
        updater: (currentSlide) => {
          let newShapes = currentSlide.shapes;
          for (const shapeId of shapeIds) {
            newShapes = updateShapeById(newShapes, shapeId, (shape) => {
              if (!("properties" in shape)) return shape;
              const props = shape.properties;
              if (!props || !("transform" in props) || !props.transform) return shape;
              const t = props.transform;
              return withUpdatedTransform(shape, {
                x: ((t.x as number) + dx) as Pixels,
                y: ((t.y as number) + dy) as Pixels,
              });
            });
          }
          return { ...currentSlide, shapes: newShapes };
        },
      });
    },
    [dispatch]
  );

  const deleteShapes = useCallback(
    (shapeIds: readonly ShapeId[]) => {
      dispatch({ type: "DELETE_SHAPES", shapeIds });
    },
    [dispatch]
  );

  const deleteSelected = useCallback(() => {
    if (state.selection.selectedIds.length > 0) {
      dispatch({ type: "DELETE_SHAPES", shapeIds: state.selection.selectedIds });
    }
  }, [dispatch, state.selection.selectedIds]);

  const addShape = useCallback(
    (shape: Shape) => {
      dispatch({ type: "ADD_SHAPE", shape });
    },
    [dispatch]
  );

  const duplicateSelected = useCallback(() => {
    dispatch({ type: "COPY" });
    dispatch({ type: "PASTE" });
  }, [dispatch]);

  const reorderShape = useCallback(
    (shapeId: ShapeId, direction: "front" | "back" | "forward" | "backward") => {
      dispatch({ type: "REORDER_SHAPE", shapeId, direction });
    },
    [dispatch]
  );

  const undo = useCallback(() => {
    dispatch({ type: "UNDO" });
  }, [dispatch]);

  const redo = useCallback(() => {
    dispatch({ type: "REDO" });
  }, [dispatch]);

  return useMemo(
    () => ({
      slide,
      updateSlide,
      updateShape,
      updateShapeTransform,
      updateMultipleShapeTransforms,
      nudgeShapes,
      deleteShapes,
      deleteSelected,
      addShape,
      duplicateSelected,
      reorderShape,
      undo,
      redo,
      canUndo,
      canRedo,
    }),
    [
      slide,
      updateSlide,
      updateShape,
      updateShapeTransform,
      updateMultipleShapeTransforms,
      nudgeShapes,
      deleteShapes,
      deleteSelected,
      addShape,
      duplicateSelected,
      reorderShape,
      undo,
      redo,
      canUndo,
      canRedo,
    ]
  );
}
