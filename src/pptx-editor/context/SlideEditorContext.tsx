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
import type { Slide, Shape, GrpShape, GroupTransform } from "../../pptx/domain";
import type { Bounds } from "../../pptx/domain/types";
import { px, deg } from "../../pptx/domain/types";
import { getShapeTransform, withUpdatedTransform } from "../utils";
import {
  type SlideEditorState,
  type SlideEditorAction,
  type SlideEditorContextValue,
  createSlideEditorState,
  createEmptySelection,
  createIdleDragState,
  createHistory,
  pushHistory,
  undoHistory,
  redoHistory,
} from "../slide/types";
import {
  type ShapeId,
  findShapeById,
  updateShapeById,
  deleteShapesById,
  reorderShape,
  getShapeBounds,
  generateShapeId,
} from "./shape";

// Re-export for convenience
export type { SlideEditorContextValue } from "../slide/types";

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

    case "GROUP_SHAPES": {
      if (action.shapeIds.length < 2) return state;

      // Find shapes to group (must be at top level for now)
      const shapesToGroup: Shape[] = [];
      const shapeIndices: number[] = [];
      const idSet = new Set(action.shapeIds);

      for (let i = 0; i < currentSlide.shapes.length; i++) {
        const shape = currentSlide.shapes[i];
        if ("nonVisual" in shape && idSet.has(shape.nonVisual.id)) {
          shapesToGroup.push(shape);
          shapeIndices.push(i);
        }
      }

      if (shapesToGroup.length < 2) return state;

      // Calculate combined bounding box for the group
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const shape of shapesToGroup) {
        const transform = getShapeTransform(shape);
        if (transform) {
          const x = transform.x as number;
          const y = transform.y as number;
          const w = transform.width as number;
          const h = transform.height as number;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x + w);
          maxY = Math.max(maxY, y + h);
        }
      }

      const groupWidth = maxX - minX;
      const groupHeight = maxY - minY;

      // Generate new group ID
      const newGroupId = generateShapeId(currentSlide.shapes);

      // Create group transform with childOffset/Extent matching the group bounds
      const groupTransform: GroupTransform = {
        x: px(minX),
        y: px(minY),
        width: px(groupWidth),
        height: px(groupHeight),
        rotation: deg(0),
        flipH: false,
        flipV: false,
        childOffsetX: px(minX),
        childOffsetY: px(minY),
        childExtentWidth: px(groupWidth),
        childExtentHeight: px(groupHeight),
      };

      // Create the group shape
      const groupShape: GrpShape = {
        type: "grpSp",
        nonVisual: {
          id: newGroupId,
          name: `Group ${newGroupId}`,
        },
        properties: {
          transform: groupTransform,
        },
        children: shapesToGroup,
      };

      // Remove grouped shapes and insert group at first shape's position
      const insertIndex = Math.min(...shapeIndices);
      const newShapes = currentSlide.shapes.filter(
        (s) => !("nonVisual" in s) || !idSet.has(s.nonVisual.id)
      );
      newShapes.splice(insertIndex, 0, groupShape);

      const newSlide: Slide = { ...currentSlide, shapes: newShapes };

      return {
        ...state,
        slideHistory: pushHistory(state.slideHistory, newSlide),
        selection: {
          selectedIds: [newGroupId],
          primaryId: newGroupId,
        },
      };
    }

    case "MOVE_SHAPE_TO_INDEX": {
      const currentIndex = currentSlide.shapes.findIndex(
        (s) => "nonVisual" in s && s.nonVisual.id === action.shapeId
      );
      if (currentIndex === -1) return state;
      if (currentIndex === action.newIndex) return state;

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
