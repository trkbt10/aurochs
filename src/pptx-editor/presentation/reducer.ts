/**
 * @file Presentation editor reducer
 *
 * State management logic for presentation-level editing operations.
 * Imports from shape/ and state/ modules directly.
 */

import type { Slide, Shape } from "../../pptx/domain";
import type { ShapeId } from "../../pptx/domain/types";
import { px, deg } from "../../pptx/domain/types";
import type {
  PresentationDocument,
  PresentationEditorState,
  PresentationEditorAction,
  SlideWithId,
} from "./types";
import { createSelectMode } from "./types";
import {
  createHistory,
  createEmptySelection,
  createIdleDragState,
  createInactiveTextEditState,
  createActiveTextEditState,
  pushHistory,
  undoHistory,
  redoHistory,
} from "../state";
import {
  findSlideById,
  updateSlide,
  addSlide,
  deleteSlide,
  duplicateSlide,
  moveSlide,
} from "./document-ops";
import { findShapeById } from "../shape/query";
import {
  updateShapeById,
  deleteShapesById,
  reorderShape,
  generateShapeId,
} from "../shape/mutation";
import { createPicShape, createChartGraphicFrame, createDiagramGraphicFrame, type ShapeBounds, type ChartType, type DiagramType } from "../shape/factory";
import {
  getCombinedBounds,
  collectBoundsForIds,
  getCombinedCenter,
} from "../shape/bounds";
import { getShapeTransform, withUpdatedTransform } from "../shape/transform";
import { ungroupShape, groupShapes } from "../shape/group";

// =============================================================================
// Helper Functions
// =============================================================================

function getActiveSlide(state: PresentationEditorState): SlideWithId | undefined {
  if (!state.activeSlideId) {
    return undefined;
  }
  return findSlideById(state.documentHistory.present, state.activeSlideId);
}

function updateActiveSlideInDocument(
  document: PresentationDocument,
  activeSlideId: string | undefined,
  updater: (slide: Slide) => Slide
): PresentationDocument {
  if (!activeSlideId) {
    return document;
  }
  return updateSlide(document, activeSlideId, updater);
}

function getPrimaryIdAfterDeletion(
  remainingIds: readonly ShapeId[],
  currentPrimaryId: ShapeId | undefined
): ShapeId | undefined {
  if (remainingIds.includes(currentPrimaryId ?? "")) {
    return currentPrimaryId;
  }
  return remainingIds[0];
}

// =============================================================================
// State Creation
// =============================================================================

/**
 * Create initial presentation editor state
 */
export function createPresentationEditorState(
  document: PresentationDocument
): PresentationEditorState {
  const firstSlideId = document.slides[0]?.id;
  return {
    documentHistory: createHistory(document),
    activeSlideId: firstSlideId,
    shapeSelection: createEmptySelection(),
    drag: createIdleDragState(),
    clipboard: undefined,
    creationMode: createSelectMode(),
    textEdit: createInactiveTextEditState(),
  };
}

// =============================================================================
// Reducer
// =============================================================================

/**
 * Presentation editor reducer
 */
export function presentationEditorReducer(
  state: PresentationEditorState,
  action: PresentationEditorAction
): PresentationEditorState {
  switch (action.type) {
    // =========================================================================
    // Document mutations
    // =========================================================================

    case "SET_DOCUMENT": {
      return {
        ...state,
        documentHistory: pushHistory(state.documentHistory, action.document),
      };
    }

    // =========================================================================
    // Slide management
    // =========================================================================

    case "ADD_SLIDE": {
      const { document: newDoc, newSlideId } = addSlide(
        state.documentHistory.present,
        action.slide,
        action.afterSlideId
      );
      return {
        ...state,
        documentHistory: pushHistory(state.documentHistory, newDoc),
        activeSlideId: newSlideId,
        shapeSelection: createEmptySelection(),
      };
    }

    case "DELETE_SLIDE": {
      const currentDoc = state.documentHistory.present;
      if (currentDoc.slides.length <= 1) {
        return state; // Don't delete last slide
      }

      const deletedIndex = currentDoc.slides.findIndex((s) => s.id === action.slideId);
      const newDoc = deleteSlide(currentDoc, action.slideId);

      // Select adjacent slide if active slide was deleted
      let newActiveSlideId = state.activeSlideId;
      if (state.activeSlideId === action.slideId) {
        const newIndex = Math.min(deletedIndex, newDoc.slides.length - 1);
        newActiveSlideId = newDoc.slides[newIndex]?.id;
      }

      return {
        ...state,
        documentHistory: pushHistory(state.documentHistory, newDoc),
        activeSlideId: newActiveSlideId,
        shapeSelection: state.activeSlideId === action.slideId
          ? createEmptySelection()
          : state.shapeSelection,
      };
    }

    case "DUPLICATE_SLIDE": {
      const result = duplicateSlide(state.documentHistory.present, action.slideId);
      if (!result) {
        return state;
      }
      return {
        ...state,
        documentHistory: pushHistory(state.documentHistory, result.document),
        activeSlideId: result.newSlideId,
        shapeSelection: createEmptySelection(),
      };
    }

    case "MOVE_SLIDE": {
      const newDoc = moveSlide(
        state.documentHistory.present,
        action.slideId,
        action.toIndex
      );
      return {
        ...state,
        documentHistory: pushHistory(state.documentHistory, newDoc),
      };
    }

    case "SELECT_SLIDE": {
      if (state.activeSlideId === action.slideId) {
        return state;
      }
      return {
        ...state,
        activeSlideId: action.slideId,
        shapeSelection: createEmptySelection(),
        drag: createIdleDragState(),
      };
    }

    // =========================================================================
    // Active slide mutations
    // =========================================================================

    case "UPDATE_ACTIVE_SLIDE": {
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

    case "UPDATE_SHAPE": {
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

    case "DELETE_SHAPES": {
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

    case "ADD_SHAPE": {
      const newDoc = updateActiveSlideInDocument(
        state.documentHistory.present,
        state.activeSlideId,
        (slide) => ({
          ...slide,
          shapes: [...slide.shapes, action.shape],
        })
      );

      const shapeId =
        "nonVisual" in action.shape ? action.shape.nonVisual.id : undefined;

      return {
        ...state,
        documentHistory: pushHistory(state.documentHistory, newDoc),
        shapeSelection: shapeId
          ? { selectedIds: [shapeId], primaryId: shapeId }
          : state.shapeSelection,
      };
    }

    case "REORDER_SHAPE": {
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

    case "UNGROUP_SHAPE": {
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

    case "GROUP_SHAPES": {
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

    case "MOVE_SHAPE_TO_INDEX": {
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

    // =========================================================================
    // Shape selection
    // =========================================================================

    case "SELECT_SHAPE": {
      if (action.addToSelection) {
        const isAlreadySelected = state.shapeSelection.selectedIds.includes(action.shapeId);
        if (isAlreadySelected) {
          // Deselect
          const newSelectedIds = state.shapeSelection.selectedIds.filter(
            (id) => id !== action.shapeId
          );
          return {
            ...state,
            shapeSelection: {
              selectedIds: newSelectedIds,
              primaryId: state.shapeSelection.primaryId === action.shapeId
                ? newSelectedIds[0]
                : state.shapeSelection.primaryId,
            },
          };
        }
        // Add to selection
        return {
          ...state,
          shapeSelection: {
            selectedIds: [...state.shapeSelection.selectedIds, action.shapeId],
            primaryId: action.shapeId,
          },
        };
      }
      // Replace selection
      return {
        ...state,
        shapeSelection: {
          selectedIds: [action.shapeId],
          primaryId: action.shapeId,
        },
      };
    }

    case "SELECT_MULTIPLE_SHAPES": {
      return {
        ...state,
        shapeSelection: {
          selectedIds: action.shapeIds,
          primaryId: action.shapeIds[0],
        },
      };
    }

    case "CLEAR_SHAPE_SELECTION": {
      return {
        ...state,
        shapeSelection: createEmptySelection(),
      };
    }

    // =========================================================================
    // Drag operations
    // =========================================================================

    case "START_MOVE": {
      const activeSlide = getActiveSlide(state);
      if (!activeSlide || state.shapeSelection.selectedIds.length === 0) {
        return state;
      }

      const initialBounds = collectBoundsForIds(
        activeSlide.slide.shapes,
        state.shapeSelection.selectedIds
      );

      return {
        ...state,
        drag: {
          type: "move",
          startX: action.startX,
          startY: action.startY,
          shapeIds: state.shapeSelection.selectedIds,
          initialBounds,
          previewDelta: { dx: px(0), dy: px(0) },
        },
      };
    }

    case "START_RESIZE": {
      const activeSlide = getActiveSlide(state);
      if (!activeSlide || state.shapeSelection.selectedIds.length === 0) {
        return state;
      }

      const selectedIds = state.shapeSelection.selectedIds;
      const initialBoundsMap = collectBoundsForIds(activeSlide.slide.shapes, selectedIds);
      const combinedBounds = getCombinedBounds(
        selectedIds
          .map((id) => findShapeById(activeSlide.slide.shapes, id))
          .filter((s): s is Shape => s !== undefined)
      );

      if (!combinedBounds) {
        return state;
      }

      const primaryId = state.shapeSelection.primaryId ?? selectedIds[0];
      const primaryBounds = initialBoundsMap.get(primaryId);

      return {
        ...state,
        drag: {
          type: "resize",
          handle: action.handle,
          startX: action.startX,
          startY: action.startY,
          shapeIds: selectedIds,
          initialBoundsMap,
          combinedBounds,
          aspectLocked: action.aspectLocked,
          shapeId: primaryId,
          initialBounds: primaryBounds ?? combinedBounds,
          previewDelta: { dx: px(0), dy: px(0) },
        },
      };
    }

    case "START_ROTATE": {
      const activeSlide = getActiveSlide(state);
      if (!activeSlide || state.shapeSelection.selectedIds.length === 0) {
        return state;
      }

      const selectedIds = state.shapeSelection.selectedIds;
      const initialBoundsMap = collectBoundsForIds(activeSlide.slide.shapes, selectedIds);
      const centerResult = getCombinedCenter(initialBoundsMap);

      if (!centerResult) {
        return state;
      }

      const initialRotationsMap = new Map<ShapeId, import("../../pptx/domain/types").Degrees>();
      for (const id of selectedIds) {
        const shape = findShapeById(activeSlide.slide.shapes, id);
        if (shape) {
          const transform = getShapeTransform(shape);
          initialRotationsMap.set(id, transform?.rotation ?? deg(0));
        }
      }

      const primaryId = state.shapeSelection.primaryId ?? selectedIds[0];
      const primaryShape = findShapeById(activeSlide.slide.shapes, primaryId);
      const primaryTransform = primaryShape ? getShapeTransform(primaryShape) : undefined;

      // Calculate start angle from mouse position relative to center
      const dxAngle = (action.startX as number) - centerResult.centerX;
      const dyAngle = (action.startY as number) - centerResult.centerY;
      const startAngle = deg(Math.atan2(dyAngle, dxAngle) * (180 / Math.PI));

      return {
        ...state,
        drag: {
          type: "rotate",
          startAngle,
          shapeIds: selectedIds,
          initialRotationsMap,
          initialBoundsMap,
          centerX: px(centerResult.centerX),
          centerY: px(centerResult.centerY),
          shapeId: primaryId,
          initialRotation: primaryTransform?.rotation ?? deg(0),
          previewAngleDelta: deg(0),
        },
      };
    }

    case "END_DRAG": {
      return {
        ...state,
        drag: createIdleDragState(),
      };
    }

    // =========================================================================
    // Drag preview (updates visual state without adding to history)
    // =========================================================================

    case "PREVIEW_MOVE": {
      if (state.drag.type !== "move") {
        return state;
      }
      return {
        ...state,
        drag: {
          ...state.drag,
          previewDelta: { dx: action.dx, dy: action.dy },
        },
      };
    }

    case "PREVIEW_RESIZE": {
      if (state.drag.type !== "resize") {
        return state;
      }
      return {
        ...state,
        drag: {
          ...state.drag,
          previewDelta: { dx: action.dx, dy: action.dy },
        },
      };
    }

    case "PREVIEW_ROTATE": {
      if (state.drag.type !== "rotate") {
        return state;
      }
      const angleDelta = deg(
        (action.currentAngle as number) - (state.drag.startAngle as number)
      );
      return {
        ...state,
        drag: {
          ...state.drag,
          previewAngleDelta: angleDelta,
        },
      };
    }

    // =========================================================================
    // Drag commit (applies preview delta and adds single history entry)
    // =========================================================================

    case "COMMIT_DRAG": {
      const { drag } = state;
      if (drag.type === "idle" || drag.type === "create") {
        return state;
      }

      const activeSlide = getActiveSlide(state);
      if (!activeSlide) {
        return { ...state, drag: createIdleDragState() };
      }

      let newShapes = activeSlide.slide.shapes;

      if (drag.type === "move") {
        const dxVal = drag.previewDelta.dx as number;
        const dyVal = drag.previewDelta.dy as number;

        // Skip if no actual movement
        if (dxVal === 0 && dyVal === 0) {
          return { ...state, drag: createIdleDragState() };
        }

        for (const shapeId of drag.shapeIds) {
          const initial = drag.initialBounds.get(shapeId);
          if (!initial) continue;

          newShapes = updateShapeById(newShapes, shapeId, (shape) =>
            withUpdatedTransform(shape, {
              x: px(initial.x + dxVal),
              y: px(initial.y + dyVal),
            })
          );
        }
      } else if (drag.type === "resize") {
        const dxVal = drag.previewDelta.dx as number;
        const dyVal = drag.previewDelta.dy as number;

        // Skip if no actual resize
        if (dxVal === 0 && dyVal === 0) {
          return { ...state, drag: createIdleDragState() };
        }

        // Apply resize using the same logic as applyResizeDelta
        const { handle, initialBoundsMap, combinedBounds, aspectLocked, shapeIds } = drag;
        const baseX = combinedBounds.x as number;
        const baseY = combinedBounds.y as number;
        const baseWidth = combinedBounds.width as number;
        const baseHeight = combinedBounds.height as number;

        let newWidth = baseWidth;
        let newHeight = baseHeight;
        let newX = baseX;
        let newY = baseY;

        // Calculate new bounds based on handle
        if (handle.includes("e")) {
          newWidth = baseWidth + dxVal;
        }
        if (handle.includes("w")) {
          newWidth = baseWidth - dxVal;
          newX = baseX + dxVal;
        }
        if (handle.includes("s")) {
          newHeight = baseHeight + dyVal;
        }
        if (handle.includes("n")) {
          newHeight = baseHeight - dyVal;
          newY = baseY + dyVal;
        }

        // Ensure minimum size
        const minSize = 10;
        if (newWidth < minSize) {
          if (handle.includes("w")) {
            newX = baseX + baseWidth - minSize;
          }
          newWidth = minSize;
        }
        if (newHeight < minSize) {
          if (handle.includes("n")) {
            newY = baseY + baseHeight - minSize;
          }
          newHeight = minSize;
        }

        // Apply aspect ratio lock if needed
        if (aspectLocked && baseWidth > 0 && baseHeight > 0) {
          const aspectRatio = baseWidth / baseHeight;
          if (handle === "n" || handle === "s") {
            newWidth = newHeight * aspectRatio;
          } else if (handle === "e" || handle === "w") {
            newHeight = newWidth / aspectRatio;
          } else {
            // Corner handles: use the larger delta
            const widthRatio = newWidth / baseWidth;
            const heightRatio = newHeight / baseHeight;
            if (widthRatio > heightRatio) {
              newHeight = newWidth / aspectRatio;
            } else {
              newWidth = newHeight * aspectRatio;
            }
          }
        }

        // Calculate scale factors
        const scaleX = baseWidth > 0 ? newWidth / baseWidth : 1;
        const scaleY = baseHeight > 0 ? newHeight / baseHeight : 1;

        // Apply to each shape
        for (const shapeId of shapeIds) {
          const initial = initialBoundsMap.get(shapeId);
          if (!initial) continue;

          const relX = (initial.x as number) - baseX;
          const relY = (initial.y as number) - baseY;
          const shapeNewX = newX + relX * scaleX;
          const shapeNewY = newY + relY * scaleY;
          const shapeNewWidth = (initial.width as number) * scaleX;
          const shapeNewHeight = (initial.height as number) * scaleY;

          newShapes = updateShapeById(newShapes, shapeId, (shape) =>
            withUpdatedTransform(shape, {
              x: px(shapeNewX),
              y: px(shapeNewY),
              width: px(shapeNewWidth),
              height: px(shapeNewHeight),
            })
          );
        }
      } else if (drag.type === "rotate") {
        const angleDeltaVal = drag.previewAngleDelta as number;

        // Skip if no actual rotation
        if (angleDeltaVal === 0) {
          return { ...state, drag: createIdleDragState() };
        }

        for (const shapeId of drag.shapeIds) {
          const initialRotation = drag.initialRotationsMap.get(shapeId);
          if (initialRotation === undefined) continue;

          let newRotation = ((initialRotation as number) + angleDeltaVal) % 360;
          if (newRotation < 0) newRotation += 360;

          newShapes = updateShapeById(newShapes, shapeId, (shape) =>
            withUpdatedTransform(shape, {
              rotation: deg(newRotation),
            })
          );
        }
      }

      const newSlide: Slide = { ...activeSlide.slide, shapes: newShapes };
      const newDoc = updateActiveSlideInDocument(
        state.documentHistory.present,
        state.activeSlideId,
        () => newSlide
      );

      return {
        ...state,
        documentHistory: pushHistory(state.documentHistory, newDoc),
        drag: createIdleDragState(),
      };
    }

    // =========================================================================
    // Undo/Redo
    // =========================================================================

    case "UNDO": {
      const newHistory = undoHistory(state.documentHistory);
      if (newHistory === state.documentHistory) {
        return state;
      }
      // Check if active slide still exists
      const activeSlideExists = newHistory.present.slides.some(
        (s) => s.id === state.activeSlideId
      );
      return {
        ...state,
        documentHistory: newHistory,
        activeSlideId: activeSlideExists
          ? state.activeSlideId
          : newHistory.present.slides[0]?.id,
        shapeSelection: createEmptySelection(),
      };
    }

    case "REDO": {
      const newHistory = redoHistory(state.documentHistory);
      if (newHistory === state.documentHistory) {
        return state;
      }
      // Check if active slide still exists
      const activeSlideExists = newHistory.present.slides.some(
        (s) => s.id === state.activeSlideId
      );
      return {
        ...state,
        documentHistory: newHistory,
        activeSlideId: activeSlideExists
          ? state.activeSlideId
          : newHistory.present.slides[0]?.id,
        shapeSelection: createEmptySelection(),
      };
    }

    // =========================================================================
    // Clipboard
    // =========================================================================

    case "COPY": {
      const activeSlide = getActiveSlide(state);
      if (!activeSlide || state.shapeSelection.selectedIds.length === 0) {
        return state;
      }

      const shapesToCopy = state.shapeSelection.selectedIds
        .map((id) => findShapeById(activeSlide.slide.shapes, id))
        .filter((s): s is Shape => s !== undefined);

      if (shapesToCopy.length === 0) {
        return state;
      }

      return {
        ...state,
        clipboard: {
          shapes: shapesToCopy,
          pasteCount: 0,
        },
      };
    }

    case "PASTE": {
      const activeSlide = getActiveSlide(state);
      if (!activeSlide || !state.clipboard || state.clipboard.shapes.length === 0) {
        return state;
      }

      const offset = (state.clipboard.pasteCount + 1) * 20;
      const pastedShapes: Shape[] = [];
      const pastedIds: ShapeId[] = [];

      let currentDoc = state.documentHistory.present;

      for (const shape of state.clipboard.shapes) {
        // Generate new ID
        const activeSlideData = findSlideById(currentDoc, state.activeSlideId!);
        if (!activeSlideData) continue;

        const newId = generateShapeId(activeSlideData.slide.shapes);
        const transform = getShapeTransform(shape);

        // Clone shape with new ID and offset position
        const newShape = {
          ...shape,
          nonVisual: {
            ...("nonVisual" in shape ? shape.nonVisual : {}),
            id: newId,
            name: `Copy of ${"nonVisual" in shape ? shape.nonVisual.name : "Shape"}`,
          },
        } as Shape;

        // Apply offset if shape has transform
        const offsetShape = transform
          ? withUpdatedTransform(newShape, {
              x: px((transform.x as number) + offset),
              y: px((transform.y as number) + offset),
            })
          : newShape;

        pastedShapes.push(offsetShape);
        pastedIds.push(newId);

        // Update document
        currentDoc = updateActiveSlideInDocument(
          currentDoc,
          state.activeSlideId,
          (slide) => ({ ...slide, shapes: [...slide.shapes, offsetShape] })
        );
      }

      return {
        ...state,
        documentHistory: pushHistory(state.documentHistory, currentDoc),
        shapeSelection: {
          selectedIds: pastedIds,
          primaryId: pastedIds[0],
        },
        clipboard: {
          ...state.clipboard,
          pasteCount: state.clipboard.pasteCount + 1,
        },
      };
    }

    // =========================================================================
    // Creation mode
    // =========================================================================

    case "SET_CREATION_MODE": {
      return {
        ...state,
        creationMode: action.mode,
        // Clear selection when entering a creation mode (not select)
        shapeSelection:
          action.mode.type === "select" ? state.shapeSelection : createEmptySelection(),
      };
    }

    case "CREATE_SHAPE": {
      const newDoc = updateActiveSlideInDocument(
        state.documentHistory.present,
        state.activeSlideId,
        (slide) => ({
          ...slide,
          shapes: [...slide.shapes, action.shape],
        })
      );

      const shapeId =
        "nonVisual" in action.shape ? action.shape.nonVisual.id : undefined;

      return {
        ...state,
        documentHistory: pushHistory(state.documentHistory, newDoc),
        shapeSelection: shapeId
          ? { selectedIds: [shapeId], primaryId: shapeId }
          : state.shapeSelection,
        // Return to select mode after creating a shape
        creationMode: createSelectMode(),
      };
    }

    // =========================================================================
    // Picture Insertion
    // =========================================================================

    case "ADD_PICTURE": {
      const activeSlide = getActiveSlide(state);
      if (!activeSlide) {
        return state;
      }

      const newId = generateShapeId(activeSlide.slide.shapes);
      const bounds: ShapeBounds = {
        x: action.x,
        y: action.y,
        width: action.width,
        height: action.height,
      };

      const picShape = createPicShape(newId, bounds, action.dataUrl);

      const newDoc = updateActiveSlideInDocument(
        state.documentHistory.present,
        state.activeSlideId,
        (slide) => ({
          ...slide,
          shapes: [...slide.shapes, picShape],
        })
      );

      return {
        ...state,
        documentHistory: pushHistory(state.documentHistory, newDoc),
        shapeSelection: {
          selectedIds: [newId],
          primaryId: newId,
        },
        creationMode: createSelectMode(),
      };
    }

    // =========================================================================
    // Chart Insertion
    // =========================================================================

    case "ADD_CHART": {
      const activeSlide = getActiveSlide(state);
      if (!activeSlide) {
        return state;
      }

      const newId = generateShapeId(activeSlide.slide.shapes);
      const bounds: ShapeBounds = {
        x: action.x,
        y: action.y,
        width: action.width,
        height: action.height,
      };

      const chartShape = createChartGraphicFrame(newId, bounds, action.chartType);

      const newDoc = updateActiveSlideInDocument(
        state.documentHistory.present,
        state.activeSlideId,
        (slide) => ({
          ...slide,
          shapes: [...slide.shapes, chartShape],
        })
      );

      return {
        ...state,
        documentHistory: pushHistory(state.documentHistory, newDoc),
        shapeSelection: {
          selectedIds: [newId],
          primaryId: newId,
        },
        creationMode: createSelectMode(),
      };
    }

    // =========================================================================
    // Diagram Insertion
    // =========================================================================

    case "ADD_DIAGRAM": {
      const activeSlide = getActiveSlide(state);
      if (!activeSlide) {
        return state;
      }

      const newId = generateShapeId(activeSlide.slide.shapes);
      const bounds: ShapeBounds = {
        x: action.x,
        y: action.y,
        width: action.width,
        height: action.height,
      };

      const diagramShape = createDiagramGraphicFrame(newId, bounds, action.diagramType);

      const newDoc = updateActiveSlideInDocument(
        state.documentHistory.present,
        state.activeSlideId,
        (slide) => ({
          ...slide,
          shapes: [...slide.shapes, diagramShape],
        })
      );

      return {
        ...state,
        documentHistory: pushHistory(state.documentHistory, newDoc),
        shapeSelection: {
          selectedIds: [newId],
          primaryId: newId,
        },
        creationMode: createSelectMode(),
      };
    }

    // =========================================================================
    // Text Editing
    // =========================================================================

    case "ENTER_TEXT_EDIT": {
      const activeSlide = state.activeSlideId
        ? findSlideById(state.documentHistory.present, state.activeSlideId)
        : undefined;
      if (!activeSlide) {
        return state;
      }

      const shape = findShapeById(activeSlide.slide.shapes, action.shapeId);
      if (!shape || shape.type !== "sp" || !shape.textBody) {
        return state;
      }

      const transform = getShapeTransform(shape);
      if (!transform) {
        return state;
      }

      return {
        ...state,
        textEdit: createActiveTextEditState(
          action.shapeId,
          {
            x: transform.x,
            y: transform.y,
            width: transform.width,
            height: transform.height,
            rotation: transform.rotation as number,
          },
          shape.textBody
        ),
      };
    }

    case "EXIT_TEXT_EDIT": {
      return {
        ...state,
        textEdit: createInactiveTextEditState(),
      };
    }

    case "UPDATE_TEXT_BODY": {
      const newDoc = updateActiveSlideInDocument(
        state.documentHistory.present,
        state.activeSlideId,
        (slide) => ({
          ...slide,
          shapes: updateShapeById(slide.shapes, action.shapeId, (shape) => {
            if (shape.type !== "sp") {
              return shape;
            }
            return { ...shape, textBody: action.textBody };
          }),
        })
      );

      return {
        ...state,
        documentHistory: pushHistory(state.documentHistory, newDoc),
        textEdit: createInactiveTextEditState(),
      };
    }

    default:
      return state;
  }
}
