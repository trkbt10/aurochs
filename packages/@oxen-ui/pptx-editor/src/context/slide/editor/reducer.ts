/**
 * @file Slide editor reducer
 *
 * State management logic for slide editing operations.
 */

import type { Slide, Shape } from "@oxen/pptx/domain";
import type { Bounds, ShapeId } from "@oxen/pptx/domain/types";
import { px, deg } from "@oxen/ooxml/domain/units";
import type { SlideEditorState, SlideEditorAction } from "./types";
import {
  createHistory,
  createEmptySelection,
  createIdleDragState,
  pushHistory,
  undoHistory,
  redoHistory,
} from "../state";
import { findShapeById } from "../../../shape/query";
import {
  updateShapeById,
  deleteShapesById,
  reorderShape,
  generateShapeId,
} from "../../../shape/mutation";
import {
  getShapeBounds,
  getCombinedBounds,
  collectBoundsForIds,
  getCombinedCenter,
} from "../../../shape/bounds";
import { withUpdatedTransform } from "../../../shape/transform";
import { getShapeTransform } from "@oxen/pptx-render/svg";
import { ungroupShape, groupShapes } from "../../../shape/group";

// =============================================================================
// Helper Functions
// =============================================================================

function getPrimaryIdAfterDeletion(
  remainingIds: readonly ShapeId[],
  currentPrimaryId: ShapeId | undefined
): ShapeId | undefined {
  if (remainingIds.includes(currentPrimaryId ?? "")) {
    return currentPrimaryId;
  }
  return remainingIds[0];
}

function getPrimaryIdAfterDeselect(
  newSelected: readonly ShapeId[],
  deselectedId: ShapeId,
  currentPrimaryId: ShapeId | undefined
): ShapeId | undefined {
  if (currentPrimaryId === deselectedId) {
    return newSelected[0];
  }
  return currentPrimaryId;
}

// =============================================================================
// Reducer
// =============================================================================

/**
 * Slide editor reducer
 */
export function slideEditorReducer(
  state: SlideEditorState,
  action: SlideEditorAction
): SlideEditorState {
  const currentSlide = state.slideHistory.present;

  switch (action.type) {
    // --- Slide mutations ---
    case "SET_SLIDE":
      return {
        ...state,
        slideHistory: createHistory(action.slide),
        selection: createEmptySelection(),
        drag: createIdleDragState(),
      };

    case "UPDATE_SLIDE": {
      const newSlide = action.updater(currentSlide);
      return {
        ...state,
        slideHistory: pushHistory(state.slideHistory, newSlide),
      };
    }

    case "UPDATE_SHAPE": {
      const newShapes = updateShapeById(
        currentSlide.shapes,
        action.shapeId,
        action.updater
      );
      const newSlide: Slide = { ...currentSlide, shapes: newShapes };
      return {
        ...state,
        slideHistory: pushHistory(state.slideHistory, newSlide),
      };
    }

    case "DELETE_SHAPES": {
      const newShapes = deleteShapesById(currentSlide.shapes, action.shapeIds);
      const newSlide: Slide = { ...currentSlide, shapes: newShapes };
      // Clear selection for deleted shapes
      const remainingSelected = state.selection.selectedIds.filter(
        (id) => !action.shapeIds.includes(id)
      );
      const newPrimaryId = getPrimaryIdAfterDeletion(remainingSelected, state.selection.primaryId);
      return {
        ...state,
        slideHistory: pushHistory(state.slideHistory, newSlide),
        selection: { selectedIds: remainingSelected, primaryId: newPrimaryId },
      };
    }

    case "ADD_SHAPE": {
      const newShapes = [...currentSlide.shapes, action.shape];
      const newSlide: Slide = { ...currentSlide, shapes: newShapes };
      const shapeId = "nonVisual" in action.shape ? action.shape.nonVisual.id : undefined;
      const newSelection = shapeId ? { selectedIds: [shapeId], primaryId: shapeId } : state.selection;
      return {
        ...state,
        slideHistory: pushHistory(state.slideHistory, newSlide),
        selection: newSelection,
      };
    }

    case "REORDER_SHAPE": {
      const newShapes = reorderShape(
        currentSlide.shapes,
        action.shapeId,
        action.direction
      );
      const newSlide: Slide = { ...currentSlide, shapes: newShapes };
      return {
        ...state,
        slideHistory: pushHistory(state.slideHistory, newSlide),
      };
    }

    case "UNGROUP_SHAPE": {
      const result = ungroupShape(currentSlide.shapes, action.shapeId);
      if (!result) {
        return state;
      }

      const newSlide: Slide = { ...currentSlide, shapes: result.newShapes };
      return {
        ...state,
        slideHistory: pushHistory(state.slideHistory, newSlide),
        selection: {
          selectedIds: result.childIds,
          primaryId: result.childIds[0],
        },
      };
    }

    case "GROUP_SHAPES": {
      const result = groupShapes(currentSlide.shapes, action.shapeIds);
      if (!result) {
        return state;
      }

      const newSlide: Slide = { ...currentSlide, shapes: result.newShapes };
      return {
        ...state,
        slideHistory: pushHistory(state.slideHistory, newSlide),
        selection: {
          selectedIds: [result.groupId],
          primaryId: result.groupId,
        },
      };
    }

    case "MOVE_SHAPE_TO_INDEX": {
      const currentIndex = currentSlide.shapes.findIndex(
        (s) => "nonVisual" in s && s.nonVisual.id === action.shapeId
      );
      if (currentIndex === -1) {return state;}
      if (currentIndex === action.newIndex) {return state;}

      const newShapes = [...currentSlide.shapes];
      const [shape] = newShapes.splice(currentIndex, 1);
      newShapes.splice(action.newIndex, 0, shape);

      const newSlide: Slide = { ...currentSlide, shapes: newShapes };
      return {
        ...state,
        slideHistory: pushHistory(state.slideHistory, newSlide),
      };
    }

    // --- Selection ---
    case "SELECT": {
      if (action.addToSelection) {
        const isAlreadySelected = state.selection.selectedIds.includes(
          action.shapeId
        );
        if (isAlreadySelected) {
          // Deselect
          const newSelected = state.selection.selectedIds.filter((id) => id !== action.shapeId);
          const newPrimaryId = getPrimaryIdAfterDeselect(
            newSelected,
            action.shapeId,
            state.selection.primaryId
          );
          return {
            ...state,
            selection: { selectedIds: newSelected, primaryId: newPrimaryId },
          };
        }
        // Add to selection
        return {
          ...state,
          selection: {
            selectedIds: [...state.selection.selectedIds, action.shapeId],
            primaryId: action.shapeId,
          },
        };
      }
      // Single select
      return {
        ...state,
        selection: {
          selectedIds: [action.shapeId],
          primaryId: action.shapeId,
        },
      };
    }

    case "SELECT_MULTIPLE":
      return {
        ...state,
        selection: {
          selectedIds: action.shapeIds,
          primaryId: action.shapeIds[0],
        },
      };

    case "CLEAR_SELECTION":
      return {
        ...state,
        selection: createEmptySelection(),
      };

    // --- Drag ---
    case "START_MOVE": {
      if (state.selection.selectedIds.length === 0) {
        return state;
      }
      const initialBounds = collectBoundsForIds(
        currentSlide.shapes,
        state.selection.selectedIds
      );
      return {
        ...state,
        drag: {
          type: "move",
          startX: action.startX,
          startY: action.startY,
          shapeIds: state.selection.selectedIds,
          initialBounds,
          previewDelta: { dx: px(0), dy: px(0) },
        },
      };
    }

    case "START_RESIZE": {
      const primaryId = state.selection.primaryId;
      if (!primaryId) {
        return state;
      }
      const primaryShape = findShapeById(currentSlide.shapes, primaryId);
      if (!primaryShape) {
        return state;
      }
      const primaryBounds = getShapeBounds(primaryShape);
      if (!primaryBounds) {
        return state;
      }

      // Collect bounds for all selected shapes
      const initialBoundsMap = collectBoundsForIds(
        currentSlide.shapes,
        state.selection.selectedIds
      );

      // Calculate combined bounding box from collected shapes
      const shapesWithBounds = state.selection.selectedIds
        .map((id) => findShapeById(currentSlide.shapes, id))
        .filter((s): s is Shape => s !== undefined);
      const combinedBounds = getCombinedBounds(shapesWithBounds) ?? primaryBounds;

      return {
        ...state,
        drag: {
          type: "resize",
          handle: action.handle,
          startX: action.startX,
          startY: action.startY,
          shapeIds: state.selection.selectedIds,
          initialBoundsMap,
          combinedBounds,
          aspectLocked: action.aspectLocked,
          // Backwards compatibility
          shapeId: primaryId,
          initialBounds: primaryBounds,
          previewDelta: { dx: px(0), dy: px(0) },
        },
      };
    }

    case "START_ROTATE": {
      const primaryId = state.selection.primaryId;
      if (!primaryId) {
        return state;
      }
      const primaryShape = findShapeById(currentSlide.shapes, primaryId);
      if (!primaryShape) {
        return state;
      }
      const primaryTransform = getShapeTransform(primaryShape);
      if (!primaryTransform) {
        return state;
      }

      // Collect rotations and bounds for all selected shapes
      const initialRotationsMap = new Map<ShapeId, typeof primaryTransform.rotation>();
      const initialBoundsMap = collectBoundsForIds(
        currentSlide.shapes,
        state.selection.selectedIds
      );

      // Collect rotations separately (requires transform access)
      for (const id of state.selection.selectedIds) {
        const shape = findShapeById(currentSlide.shapes, id);
        if (shape) {
          const transform = getShapeTransform(shape);
          if (transform && initialBoundsMap.has(id)) {
            initialRotationsMap.set(id, transform.rotation);
          }
        }
      }

      // Calculate center point: combined center for multi-selection, shape center for single
      const isMultiSelection = state.selection.selectedIds.length > 1;
      const combinedCenter = getCombinedCenter(initialBoundsMap);
      const shapeCenterX = (primaryTransform.x as number) + (primaryTransform.width as number) / 2;
      const shapeCenterY = (primaryTransform.y as number) + (primaryTransform.height as number) / 2;

      const centerX = px(isMultiSelection && combinedCenter ? combinedCenter.centerX : shapeCenterX);
      const centerY = px(isMultiSelection && combinedCenter ? combinedCenter.centerY : shapeCenterY);

      const startAngle = deg(
        Math.atan2(
          (action.startY as number) - (centerY as number),
          (action.startX as number) - (centerX as number)
        ) *
          (180 / Math.PI)
      );

      return {
        ...state,
        drag: {
          type: "rotate",
          startAngle,
          shapeIds: state.selection.selectedIds,
          initialRotationsMap,
          initialBoundsMap,
          centerX,
          centerY,
          // Backwards compatibility
          shapeId: primaryId,
          initialRotation: primaryTransform.rotation,
          previewAngleDelta: deg(0),
        },
      };
    }

    case "END_DRAG":
      return {
        ...state,
        drag: createIdleDragState(),
      };

    // --- Undo/Redo ---
    case "UNDO":
      return {
        ...state,
        slideHistory: undoHistory(state.slideHistory),
      };

    case "REDO":
      return {
        ...state,
        slideHistory: redoHistory(state.slideHistory),
      };

    // --- Clipboard ---
    case "COPY": {
      if (state.selection.selectedIds.length === 0) {
        return state;
      }
      const copiedShapes: Shape[] = [];
      for (const id of state.selection.selectedIds) {
        const shape = findShapeById(currentSlide.shapes, id);
        if (shape) {
          copiedShapes.push(shape);
        }
      }
      return {
        ...state,
        clipboard: {
          shapes: copiedShapes,
          pasteCount: 0,
        },
      };
    }

    case "PASTE": {
      if (!state.clipboard || state.clipboard.shapes.length === 0) {
        return state;
      }
      const offset = (state.clipboard.pasteCount + 1) * 20;
      const pastedShapes: Shape[] = state.clipboard.shapes.map((shape) => {
        const newId = generateShapeId([
          ...currentSlide.shapes,
          ...state.clipboard!.shapes,
        ]);
        // Clone shape with new ID and offset position
        if (!("nonVisual" in shape)) {
          return shape;
        }
        const transform = getShapeTransform(shape);
        if (!transform) {
          return shape;
        }
        // Apply position offset using unified utility
        const shapeWithOffset = withUpdatedTransform(shape, {
          x: px((transform.x as number) + offset),
          y: px((transform.y as number) + offset),
        });
        // Update nonVisual with new ID (all shapes with nonVisual are handled)
        if (!("nonVisual" in shapeWithOffset)) {
          return shapeWithOffset;
        }
        return {
          ...shapeWithOffset,
          nonVisual: {
            ...shapeWithOffset.nonVisual,
            id: newId,
            name: `${shapeWithOffset.nonVisual.name} (Copy)`,
          },
        } as Shape;
      });
      const newShapes = [...currentSlide.shapes, ...pastedShapes];
      const newSlide: Slide = { ...currentSlide, shapes: newShapes };
      const newSelectedIds = pastedShapes
        .filter((s) => "nonVisual" in s)
        .map((s) => (s as Shape & { nonVisual: { id: string } }).nonVisual.id);
      return {
        ...state,
        slideHistory: pushHistory(state.slideHistory, newSlide),
        selection: {
          selectedIds: newSelectedIds,
          primaryId: newSelectedIds[0],
        },
        clipboard: {
          ...state.clipboard,
          pasteCount: state.clipboard.pasteCount + 1,
        },
      };
    }

    default:
      return state;
  }
}
