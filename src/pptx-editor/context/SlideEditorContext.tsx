/**
 * @file Slide editor context
 *
 * Provides slide editor state and actions to child components.
 */

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  type ReactNode,
} from "react";
import type { Slide, Shape, GrpShape } from "../../pptx/domain";
import type { Bounds } from "../../pptx/domain/types";
import { px, deg } from "../../pptx/domain/types";
import { getShapeTransform, withUpdatedTransform } from "../utils";
import {
  type SlideEditorState,
  type SlideEditorAction,
  type SlideEditorContextValue,
  type ShapeId,
  createSlideEditorState,
  createEmptySelection,
  createIdleDragState,
  createHistory,
  pushHistory,
  undoHistory,
  redoHistory,
} from "../slide/types";

// Re-export for convenience
export type { SlideEditorContextValue } from "../slide/types";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Find shape by ID in slide shapes (supports nested groups)
 */
function findShapeById(shapes: readonly Shape[], id: ShapeId): Shape | undefined {
  for (const shape of shapes) {
    if ("nonVisual" in shape && shape.nonVisual.id === id) {
      return shape;
    }
    if (shape.type === "grpSp") {
      const found = findShapeById(shape.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Find shape by ID and return with parent groups chain.
 */
export function findShapeByIdWithParents(
  shapes: readonly Shape[],
  id: ShapeId,
  parentGroups: readonly GrpShape[] = []
): { shape: Shape; parentGroups: readonly GrpShape[] } | undefined {
  for (const shape of shapes) {
    if ("nonVisual" in shape && shape.nonVisual.id === id) {
      return { shape, parentGroups };
    }
    if (shape.type === "grpSp") {
      const found = findShapeByIdWithParents(shape.children, id, [...parentGroups, shape]);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Update shape by ID in slide shapes (supports nested groups)
 */
function updateShapeById(
  shapes: readonly Shape[],
  id: ShapeId,
  updater: (shape: Shape) => Shape
): readonly Shape[] {
  return shapes.map((shape) => {
    if ("nonVisual" in shape && shape.nonVisual.id === id) {
      return updater(shape);
    }
    if (shape.type === "grpSp") {
      return {
        ...shape,
        children: updateShapeById(shape.children, id, updater),
      };
    }
    return shape;
  });
}

/**
 * Delete shapes by IDs
 */
function deleteShapesById(
  shapes: readonly Shape[],
  ids: readonly ShapeId[]
): readonly Shape[] {
  const idSet = new Set(ids);
  return shapes
    .filter((shape) => {
      if ("nonVisual" in shape) {
        return !idSet.has(shape.nonVisual.id);
      }
      return true;
    })
    .map((shape) => {
      if (shape.type === "grpSp") {
        return {
          ...shape,
          children: deleteShapesById(shape.children, ids),
        };
      }
      return shape;
    });
}

/**
 * Reorder shape (bring to front, send to back, etc.)
 */
function reorderShape(
  shapes: readonly Shape[],
  id: ShapeId,
  direction: "front" | "back" | "forward" | "backward"
): readonly Shape[] {
  const index = shapes.findIndex(
    (s) => "nonVisual" in s && s.nonVisual.id === id
  );
  if (index === -1) return shapes;

  const newShapes = [...shapes];
  const [shape] = newShapes.splice(index, 1);

  switch (direction) {
    case "front":
      newShapes.push(shape);
      break;
    case "back":
      newShapes.unshift(shape);
      break;
    case "forward":
      if (index < shapes.length - 1) {
        newShapes.splice(index + 1, 0, shape);
      } else {
        newShapes.push(shape);
      }
      break;
    case "backward":
      if (index > 0) {
        newShapes.splice(index - 1, 0, shape);
      } else {
        newShapes.unshift(shape);
      }
      break;
  }

  return newShapes;
}

/**
 * Get bounds from shape transform
 */
function getShapeBounds(shape: Shape): Bounds | undefined {
  const transform = getShapeTransform(shape);
  if (!transform) return undefined;
  return {
    x: transform.x,
    y: transform.y,
    width: transform.width,
    height: transform.height,
  };
}

/**
 * Generate unique shape ID
 */
function generateShapeId(shapes: readonly Shape[]): string {
  let maxId = 0;
  const collectIds = (s: readonly Shape[]) => {
    for (const shape of s) {
      if ("nonVisual" in shape) {
        const numId = parseInt(shape.nonVisual.id, 10);
        if (!isNaN(numId) && numId > maxId) {
          maxId = numId;
        }
      }
      if (shape.type === "grpSp") {
        collectIds(shape.children);
      }
    }
  };
  collectIds(shapes);
  return String(maxId + 1);
}

// =============================================================================
// Reducer (exported for testing)
// =============================================================================

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
      return {
        ...state,
        slideHistory: pushHistory(state.slideHistory, newSlide),
        selection: {
          selectedIds: remainingSelected,
          primaryId: remainingSelected.includes(state.selection.primaryId ?? "")
            ? state.selection.primaryId
            : remainingSelected[0],
        },
      };
    }

    case "ADD_SHAPE": {
      const newShapes = [...currentSlide.shapes, action.shape];
      const newSlide: Slide = { ...currentSlide, shapes: newShapes };
      const shapeId =
        "nonVisual" in action.shape ? action.shape.nonVisual.id : undefined;
      return {
        ...state,
        slideHistory: pushHistory(state.slideHistory, newSlide),
        selection: shapeId
          ? { selectedIds: [shapeId], primaryId: shapeId }
          : state.selection,
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
      // Find the group shape at top level
      const groupIndex = currentSlide.shapes.findIndex(
        (s) => s.type === "grpSp" && s.nonVisual.id === action.shapeId
      );
      if (groupIndex === -1) return state;

      const group = currentSlide.shapes[groupIndex];
      if (group.type !== "grpSp") return state;

      // Extract children with adjusted transforms (convert from group-relative to slide-relative)
      const children = group.children.map((child) => {
        if (!("properties" in child)) return child;
        const childTransform =
          child.properties && "transform" in child.properties
            ? child.properties.transform
            : undefined;
        const groupTransform = group.properties.transform;

        if (!childTransform || !groupTransform) return child;

        // Calculate child's position relative to the slide
        // Child coordinates are relative to group's child extents
        const childExtX = groupTransform.childExtentWidth ?? groupTransform.width;
        const childExtY = groupTransform.childExtentHeight ?? groupTransform.height;
        const childOffX = groupTransform.childOffsetX ?? 0;
        const childOffY = groupTransform.childOffsetY ?? 0;

        // Scale factor from child coordinate space to group bounds
        const scaleX =
          childExtX !== 0
            ? (groupTransform.width as number) / (childExtX as number)
            : 1;
        const scaleY =
          childExtY !== 0
            ? (groupTransform.height as number) / (childExtY as number)
            : 1;

        // Transform child position to slide coordinates
        const newX =
          (groupTransform.x as number) +
          ((childTransform.x as number) - (childOffX as number)) * scaleX;
        const newY =
          (groupTransform.y as number) +
          ((childTransform.y as number) - (childOffY as number)) * scaleY;
        const newWidth = (childTransform.width as number) * scaleX;
        const newHeight = (childTransform.height as number) * scaleY;

        return {
          ...child,
          properties: {
            ...child.properties,
            transform: {
              ...childTransform,
              x: newX,
              y: newY,
              width: newWidth,
              height: newHeight,
            },
          },
        } as Shape;
      });

      // Replace group with its children at the same position
      const newShapes = [
        ...currentSlide.shapes.slice(0, groupIndex),
        ...children,
        ...currentSlide.shapes.slice(groupIndex + 1),
      ];
      const newSlide: Slide = { ...currentSlide, shapes: newShapes };

      // Select the ungrouped children
      const childIds = children
        .filter((s) => "nonVisual" in s)
        .map((s) => (s as Shape & { nonVisual: { id: string } }).nonVisual.id);

      return {
        ...state,
        slideHistory: pushHistory(state.slideHistory, newSlide),
        selection: {
          selectedIds: childIds,
          primaryId: childIds[0],
        },
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
          const newSelected = state.selection.selectedIds.filter(
            (id) => id !== action.shapeId
          );
          return {
            ...state,
            selection: {
              selectedIds: newSelected,
              primaryId:
                state.selection.primaryId === action.shapeId
                  ? newSelected[0]
                  : state.selection.primaryId,
            },
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
      const initialBounds = new Map<ShapeId, Bounds>();
      for (const id of state.selection.selectedIds) {
        const shape = findShapeById(currentSlide.shapes, id);
        if (shape) {
          const bounds = getShapeBounds(shape);
          if (bounds) {
            initialBounds.set(id, bounds);
          }
        }
      }
      return {
        ...state,
        drag: {
          type: "move",
          startX: action.startX,
          startY: action.startY,
          shapeIds: state.selection.selectedIds,
          initialBounds,
        },
      };
    }

    case "START_RESIZE": {
      const primaryId = state.selection.primaryId;
      if (!primaryId) return state;
      const primaryShape = findShapeById(currentSlide.shapes, primaryId);
      if (!primaryShape) return state;
      const primaryBounds = getShapeBounds(primaryShape);
      if (!primaryBounds) return state;

      // Collect bounds for all selected shapes
      const initialBoundsMap = new Map<ShapeId, Bounds>();
      for (const id of state.selection.selectedIds) {
        const shape = findShapeById(currentSlide.shapes, id);
        if (shape) {
          const bounds = getShapeBounds(shape);
          if (bounds) {
            initialBoundsMap.set(id, bounds);
          }
        }
      }

      // Calculate combined bounding box
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const bounds of initialBoundsMap.values()) {
        minX = Math.min(minX, bounds.x as number);
        minY = Math.min(minY, bounds.y as number);
        maxX = Math.max(maxX, (bounds.x as number) + (bounds.width as number));
        maxY = Math.max(maxY, (bounds.y as number) + (bounds.height as number));
      }
      const combinedBounds: Bounds = {
        x: px(minX),
        y: px(minY),
        width: px(maxX - minX),
        height: px(maxY - minY),
      };

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
        },
      };
    }

    case "START_ROTATE": {
      const primaryId = state.selection.primaryId;
      if (!primaryId) return state;
      const primaryShape = findShapeById(currentSlide.shapes, primaryId);
      if (!primaryShape) return state;
      const primaryTransform = getShapeTransform(primaryShape);
      if (!primaryTransform) return state;

      // Collect rotations and bounds for all selected shapes
      const initialRotationsMap = new Map<ShapeId, typeof primaryTransform.rotation>();
      const initialBoundsMap = new Map<ShapeId, Bounds>();
      for (const id of state.selection.selectedIds) {
        const shape = findShapeById(currentSlide.shapes, id);
        if (shape) {
          const transform = getShapeTransform(shape);
          const bounds = getShapeBounds(shape);
          if (transform && bounds) {
            initialRotationsMap.set(id, transform.rotation);
            initialBoundsMap.set(id, bounds);
          }
        }
      }

      // Calculate combined center point for all selected shapes
      let totalCenterX = 0;
      let totalCenterY = 0;
      let count = 0;
      for (const bounds of initialBoundsMap.values()) {
        totalCenterX += (bounds.x as number) + (bounds.width as number) / 2;
        totalCenterY += (bounds.y as number) + (bounds.height as number) / 2;
        count++;
      }
      const combinedCenterX = px(count > 0 ? totalCenterX / count : 0);
      const combinedCenterY = px(count > 0 ? totalCenterY / count : 0);

      // For single selection, use shape center
      const isMultiSelection = state.selection.selectedIds.length > 1;
      const centerX = isMultiSelection
        ? combinedCenterX
        : px((primaryTransform.x as number) + (primaryTransform.width as number) / 2);
      const centerY = isMultiSelection
        ? combinedCenterY
        : px((primaryTransform.y as number) + (primaryTransform.height as number) / 2);

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

// =============================================================================
// Context
// =============================================================================

const SlideEditorContext = createContext<SlideEditorContextValue | null>(null);

/**
 * Provider for slide editor context
 */
export function SlideEditorProvider({
  children,
  initialSlide,
}: {
  readonly children: ReactNode;
  readonly initialSlide: Slide;
}) {
  const [state, dispatch] = useReducer(
    slideEditorReducer,
    initialSlide,
    createSlideEditorState
  );

  const slide = state.slideHistory.present;

  const selectedShapes = useMemo(() => {
    const shapes: Shape[] = [];
    for (const id of state.selection.selectedIds) {
      const shape = findShapeById(slide.shapes, id);
      if (shape) {
        shapes.push(shape);
      }
    }
    return shapes;
  }, [slide.shapes, state.selection.selectedIds]);

  const primaryShape = useMemo(() => {
    if (!state.selection.primaryId) return undefined;
    return findShapeById(slide.shapes, state.selection.primaryId);
  }, [slide.shapes, state.selection.primaryId]);

  const canUndo = state.slideHistory.past.length > 0;
  const canRedo = state.slideHistory.future.length > 0;

  const value = useMemo<SlideEditorContextValue>(
    () => ({
      state,
      dispatch,
      slide,
      selectedShapes,
      primaryShape,
      canUndo,
      canRedo,
    }),
    [state, slide, selectedShapes, primaryShape, canUndo, canRedo]
  );

  return (
    <SlideEditorContext.Provider value={value}>
      {children}
    </SlideEditorContext.Provider>
  );
}

/**
 * Hook to access slide editor context
 */
export function useSlideEditor(): SlideEditorContextValue {
  const context = useContext(SlideEditorContext);
  if (!context) {
    throw new Error("useSlideEditor must be used within SlideEditorProvider");
  }
  return context;
}

/**
 * Hook to access slide editor with null check (for optional usage)
 */
export function useSlideEditorOptional(): SlideEditorContextValue | null {
  return useContext(SlideEditorContext);
}
