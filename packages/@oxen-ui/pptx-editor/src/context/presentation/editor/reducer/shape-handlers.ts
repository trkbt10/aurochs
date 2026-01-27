/**
 * @file Shape mutation handlers
 *
 * Handlers for shape operations on the active slide.
 */

import type { Shape } from "@oxen/pptx/domain";
import type { ShapeId } from "@oxen/pptx/domain/types";
import type {
  PresentationEditorState,
  PresentationEditorAction,
} from "../types";
import type { SelectionState } from "../../../slide/state";
import type { HandlerMap } from "./handler-types";
import {
  getActiveSlide,
  updateActiveSlideInDocument,
  getPrimaryIdAfterDeletion,
} from "./helpers";
import { pushHistory } from "../../../slide/state";
import {
  updateShapeById,
  deleteShapesById,
  reorderShape,
} from "../../../../shape/mutation";
import { ungroupShape, groupShapes } from "../../../../shape/group";
import { moveShapeInHierarchy } from "../../../../shape/hierarchy";

type UpdateActiveSlideAction = Extract<
  PresentationEditorAction,
  { type: "UPDATE_ACTIVE_SLIDE" }
>;
type UpdateShapeAction = Extract<
  PresentationEditorAction,
  { type: "UPDATE_SHAPE" }
>;
type DeleteShapesAction = Extract<
  PresentationEditorAction,
  { type: "DELETE_SHAPES" }
>;
type AddShapeAction = Extract<PresentationEditorAction, { type: "ADD_SHAPE" }>;
type ReorderShapeAction = Extract<
  PresentationEditorAction,
  { type: "REORDER_SHAPE" }
>;
type UngroupShapeAction = Extract<
  PresentationEditorAction,
  { type: "UNGROUP_SHAPE" }
>;
type GroupShapesAction = Extract<
  PresentationEditorAction,
  { type: "GROUP_SHAPES" }
>;
type MoveShapeToIndexAction = Extract<
  PresentationEditorAction,
  { type: "MOVE_SHAPE_TO_INDEX" }
>;
type MoveShapeInHierarchyAction = Extract<
  PresentationEditorAction,
  { type: "MOVE_SHAPE_IN_HIERARCHY" }
>;

/**
 * Get shape ID from shape if available
 */
function getShapeIdFromShape(shape: Shape): ShapeId | undefined {
  if ("nonVisual" in shape) {
    return shape.nonVisual.id;
  }
  return undefined;
}

/**
 * Get selection state for added shape
 */
function getSelectionForAddedShape(
  shapeId: ShapeId | undefined,
  currentSelection: SelectionState
): SelectionState {
  if (shapeId) {
    return { selectedIds: [shapeId], primaryId: shapeId };
  }
  return currentSelection;
}

function handleUpdateActiveSlide(
  state: PresentationEditorState,
  action: UpdateActiveSlideAction
): PresentationEditorState {
  const newDoc = updateActiveSlideInDocument(
    state.documentHistory.present,
    state.activeSlideId,
    action.updater
  );
  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
  };
}

function handleUpdateShape(
  state: PresentationEditorState,
  action: UpdateShapeAction
): PresentationEditorState {
  const activeSlide = getActiveSlide(state);
  if (!activeSlide) {
    return state;
  }

  const newDoc = updateActiveSlideInDocument(
    state.documentHistory.present,
    state.activeSlideId,
    (slide) => ({
      ...slide,
      shapes: updateShapeById(slide.shapes, action.shapeId, action.updater),
    })
  );

  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
  };
}

function handleDeleteShapes(
  state: PresentationEditorState,
  action: DeleteShapesAction
): PresentationEditorState {
  const activeSlide = getActiveSlide(state);
  if (!activeSlide || action.shapeIds.length === 0) {
    return state;
  }

  const idsToDelete = new Set(action.shapeIds);
  const newDoc = updateActiveSlideInDocument(
    state.documentHistory.present,
    state.activeSlideId,
    (slide) => ({
      ...slide,
      shapes: deleteShapesById(slide.shapes, action.shapeIds),
    })
  );

  const remainingSelectedIds = state.shapeSelection.selectedIds.filter(
    (id) => !idsToDelete.has(id)
  );

  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
    shapeSelection: {
      selectedIds: remainingSelectedIds,
      primaryId: getPrimaryIdAfterDeletion(
        remainingSelectedIds,
        state.shapeSelection.primaryId
      ),
    },
  };
}

function handleAddShape(
  state: PresentationEditorState,
  action: AddShapeAction
): PresentationEditorState {
  const newDoc = updateActiveSlideInDocument(
    state.documentHistory.present,
    state.activeSlideId,
    (slide) => ({
      ...slide,
      shapes: [...slide.shapes, action.shape],
    })
  );

  const shapeId = getShapeIdFromShape(action.shape);

  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
    shapeSelection: getSelectionForAddedShape(shapeId, state.shapeSelection),
  };
}

function handleReorderShape(
  state: PresentationEditorState,
  action: ReorderShapeAction
): PresentationEditorState {
  const newDoc = updateActiveSlideInDocument(
    state.documentHistory.present,
    state.activeSlideId,
    (slide) => ({
      ...slide,
      shapes: reorderShape(slide.shapes, action.shapeId, action.direction),
    })
  );
  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
  };
}

function handleUngroupShape(
  state: PresentationEditorState,
  action: UngroupShapeAction
): PresentationEditorState {
  const activeSlide = getActiveSlide(state);
  if (!activeSlide) {
    return state;
  }

  const result = ungroupShape(activeSlide.slide.shapes, action.shapeId);
  if (!result) {
    return state;
  }

  const newDoc = updateActiveSlideInDocument(
    state.documentHistory.present,
    state.activeSlideId,
    (slide) => ({ ...slide, shapes: result.newShapes })
  );

  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
    shapeSelection: {
      selectedIds: result.childIds,
      primaryId: result.childIds[0],
    },
  };
}

function handleGroupShapes(
  state: PresentationEditorState,
  action: GroupShapesAction
): PresentationEditorState {
  const activeSlide = getActiveSlide(state);
  if (!activeSlide) {
    return state;
  }

  const result = groupShapes(activeSlide.slide.shapes, action.shapeIds);
  if (!result) {
    return state;
  }

  const newDoc = updateActiveSlideInDocument(
    state.documentHistory.present,
    state.activeSlideId,
    (slide) => ({ ...slide, shapes: result.newShapes })
  );

  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
    shapeSelection: {
      selectedIds: [result.groupId],
      primaryId: result.groupId,
    },
  };
}

function handleMoveShapeToIndex(
  state: PresentationEditorState,
  action: MoveShapeToIndexAction
): PresentationEditorState {
  const activeSlide = getActiveSlide(state);
  if (!activeSlide) {
    return state;
  }

  const newDoc = updateActiveSlideInDocument(
    state.documentHistory.present,
    state.activeSlideId,
    (slide) => {
      const shapes = [...slide.shapes];
      const currentIndex = shapes.findIndex(
        (s) => "nonVisual" in s && s.nonVisual.id === action.shapeId
      );
      if (currentIndex === -1 || currentIndex === action.newIndex) {
        return slide;
      }
      const [shape] = shapes.splice(currentIndex, 1);
      shapes.splice(action.newIndex, 0, shape);
      return { ...slide, shapes };
    }
  );

  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
  };
}

function handleMoveShapeInHierarchy(
  state: PresentationEditorState,
  action: MoveShapeInHierarchyAction
): PresentationEditorState {
  const activeSlide = getActiveSlide(state);
  if (!activeSlide) {
    return state;
  }

  const nextShapes = moveShapeInHierarchy(
    activeSlide.slide.shapes,
    action.shapeId,
    action.target
  );
  if (!nextShapes) {
    return state;
  }

  const newDoc = updateActiveSlideInDocument(
    state.documentHistory.present,
    state.activeSlideId,
    (slide) => ({
      ...slide,
      shapes: nextShapes,
    })
  );

  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
  };
}

/**
 * Shape mutation handlers
 */
export const SHAPE_HANDLERS: HandlerMap = {
  UPDATE_ACTIVE_SLIDE: handleUpdateActiveSlide,
  UPDATE_SHAPE: handleUpdateShape,
  DELETE_SHAPES: handleDeleteShapes,
  ADD_SHAPE: handleAddShape,
  REORDER_SHAPE: handleReorderShape,
  UNGROUP_SHAPE: handleUngroupShape,
  GROUP_SHAPES: handleGroupShapes,
  MOVE_SHAPE_TO_INDEX: handleMoveShapeToIndex,
  MOVE_SHAPE_IN_HIERARCHY: handleMoveShapeInHierarchy,
};
