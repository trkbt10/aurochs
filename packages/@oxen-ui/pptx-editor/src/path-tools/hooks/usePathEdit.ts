/**
 * @file Path edit hook
 *
 * Manages path editing interactions for existing custom geometry shapes.
 */

import { useCallback, useState, useRef } from "react";
import type { Pixels } from "@oxen/ooxml/domain/units";
import type { Point } from "@oxen/pptx/domain/types";
import { px } from "@oxen/ooxml/domain/units";
import type {
  DrawingPath,
  PathAnchorPoint,
  AnchorPointType,
  ModifierKeys,
  PathPointSelection,
} from "../types";
import { updatePointInPath, getModifierKeys } from "../types";
import { constrainVectorTo45Degrees, mirrorHandle } from "../utils/bezier-math";

// =============================================================================
// Types
// =============================================================================

/**
 * Path edit state
 */
export type PathEditState = {
  /** Current path being edited */
  readonly path: DrawingPath;
  /** Selected point indices */
  readonly selectedPoints: readonly number[];
  /** Index of point being hovered */
  readonly hoverPointIndex: number | undefined;
  /** Whether currently dragging a point */
  readonly isDraggingPoint: boolean;
  /** Whether currently dragging a handle */
  readonly isDraggingHandle: boolean;
  /** Handle side being dragged */
  readonly draggingHandleSide: "in" | "out" | undefined;
};

/**
 * Path edit callbacks
 */
export type PathEditCallbacks = {
  /** Called when the path is committed */
  readonly onCommit: (path: DrawingPath) => void;
  /** Called when editing is cancelled */
  readonly onCancel: () => void;
};

/**
 * Path edit return type
 */
export type UsePathEditReturn = {
  /** Current state */
  readonly state: PathEditState;
  /** Initialize with a path */
  readonly initializePath: (path: DrawingPath) => void;
  /** Handle canvas pointer down */
  readonly onCanvasPointerDown: (x: number, y: number, modifiers: ModifierKeys) => void;
  /** Handle canvas pointer move */
  readonly onCanvasPointerMove: (x: number, y: number, modifiers: ModifierKeys) => void;
  /** Handle canvas pointer up */
  readonly onCanvasPointerUp: () => void;
  /** Handle anchor point pointer down */
  readonly onAnchorPointerDown: (index: number, e: React.PointerEvent) => void;
  /** Handle handle pointer down */
  readonly onHandlePointerDown: (pointIndex: number, side: "in" | "out", e: React.PointerEvent) => void;
  /** Handle anchor point hover */
  readonly onAnchorHover: (index: number | undefined) => void;
  /** Handle keyboard events */
  readonly onKeyDown: (e: React.KeyboardEvent) => void;
  /** Select a point */
  readonly selectPoint: (index: number, addToSelection: boolean) => void;
  /** Clear selection */
  readonly clearSelection: () => void;
  /** Delete selected points */
  readonly deleteSelectedPoints: () => void;
  /** Toggle point type (smooth/corner) */
  readonly togglePointType: (index: number) => void;
  /** Whether the edit has changes */
  readonly hasChanges: boolean;
};

// =============================================================================
// Constants
// =============================================================================

const POINT_HIT_RADIUS = 8;

// =============================================================================
// Hook
// =============================================================================

/**
 * Path edit hook
 *
 * Provides state and callbacks for editing existing paths.
 */
export function usePathEdit(callbacks: PathEditCallbacks): UsePathEditReturn {
  const [path, setPath] = useState<DrawingPath>({ points: [], isClosed: false });
  const [selectedPoints, setSelectedPoints] = useState<readonly number[]>([]);
  const [hoverPointIndex, setHoverPointIndex] = useState<number | undefined>(undefined);
  const [isDraggingPoint, setIsDraggingPoint] = useState(false);
  const [isDraggingHandle, setIsDraggingHandle] = useState(false);
  const [draggingHandleSide, setDraggingHandleSide] = useState<"in" | "out" | undefined>(undefined);

  // Track initial path for change detection
  const initialPathRef = useRef<DrawingPath>({ points: [], isClosed: false });
  // Track drag start position
  const dragStartRef = useRef<{ x: number; y: number; pointIndex: number } | null>(null);
  // Track initial positions for drag
  const initialPositionsRef = useRef<Map<number, { x: number; y: number }>>(new Map());

  // Initialize path
  const initializePath = useCallback((newPath: DrawingPath) => {
    setPath(newPath);
    initialPathRef.current = newPath;
    setSelectedPoints([]);
    setHoverPointIndex(undefined);
  }, []);

  // Check if there are changes
  const hasChanges = path !== initialPathRef.current;

  // Select a point
  const selectPoint = useCallback((index: number, addToSelection: boolean) => {
    setSelectedPoints((prev) => {
      if (addToSelection) {
        if (prev.includes(index)) {
          return prev.filter((i) => i !== index);
        }
        return [...prev, index];
      }
      return [index];
    });
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedPoints([]);
  }, []);

  // Delete selected points
  const deleteSelectedPoints = useCallback(() => {
    if (selectedPoints.length === 0) {return;}
    if (path.points.length - selectedPoints.length < 2) {
      // Can't have a path with less than 2 points
      return;
    }

    setPath((p) => ({
      ...p,
      points: p.points.filter((_, i) => !selectedPoints.includes(i)),
    }));
    setSelectedPoints([]);
  }, [selectedPoints, path.points.length]);

  // Toggle point type
  const togglePointType = useCallback((index: number) => {
    setPath((p) =>
      updatePointInPath(p, index, (point) => ({
        ...point,
        type: point.type === "smooth" ? "corner" : "smooth",
      }))
    );
  }, []);

  // Move selected points
  const moveSelectedPoints = useCallback(
    (dx: number, dy: number) => {
      setPath((p) => {
        const newPoints = [...p.points];
        for (const index of selectedPoints) {
          const point = newPoints[index];
          if (point) {
            const initial = initialPositionsRef.current.get(index);
            if (initial) {
              newPoints[index] = {
                ...point,
                x: px(initial.x + dx),
                y: px(initial.y + dy),
                handleIn: point.handleIn
                  ? {
                      x: px((point.handleIn.x as number) + dx - ((point.x as number) - initial.x)),
                      y: px((point.handleIn.y as number) + dy - ((point.y as number) - initial.y)),
                    }
                  : undefined,
                handleOut: point.handleOut
                  ? {
                      x: px((point.handleOut.x as number) + dx - ((point.x as number) - initial.x)),
                      y: px((point.handleOut.y as number) + dy - ((point.y as number) - initial.y)),
                    }
                  : undefined,
              };
            }
          }
        }
        return { ...p, points: newPoints };
      });
    },
    [selectedPoints]
  );

  // Move a handle
  const moveHandle = useCallback(
    (pointIndex: number, side: "in" | "out", x: number, y: number, modifiers: ModifierKeys) => {
      setPath((p) =>
        updatePointInPath(p, pointIndex, (point) => {
          let handleX = x;
          let handleY = y;

          // Constrain to 45 degrees if shift is held
          if (modifiers.shift) {
            const constrained = constrainVectorTo45Degrees(
              x - (point.x as number),
              y - (point.y as number)
            );
            handleX = (point.x as number) + constrained.dx;
            handleY = (point.y as number) + constrained.dy;
          }

          const newHandle: Point = { x: px(handleX), y: px(handleY) };

          if (side === "in") {
            // If smooth point, mirror the handle
            const handleOut =
              point.type === "smooth" && !modifiers.alt
                ? mirrorHandle({ x: point.x, y: point.y }, newHandle)
                : point.handleOut;
            return { ...point, handleIn: newHandle, handleOut };
          } else {
            // If smooth point, mirror the handle
            const handleIn =
              point.type === "smooth" && !modifiers.alt
                ? mirrorHandle({ x: point.x, y: point.y }, newHandle)
                : point.handleIn;
            return { ...point, handleIn, handleOut: newHandle };
          }
        })
      );
    },
    []
  );

  // Handle canvas pointer down
  const onCanvasPointerDown = useCallback(
    (x: number, y: number, modifiers: ModifierKeys) => {
      // Check if clicking on empty space
      if (!modifiers.shift) {
        setSelectedPoints([]);
      }
    },
    []
  );

  // Handle canvas pointer move
  const onCanvasPointerMove = useCallback(
    (x: number, y: number, modifiers: ModifierKeys) => {
      if (isDraggingPoint && dragStartRef.current) {
        const dx = x - dragStartRef.current.x;
        const dy = y - dragStartRef.current.y;

        let finalDx = dx;
        let finalDy = dy;
        if (modifiers.shift) {
          const constrained = constrainVectorTo45Degrees(dx, dy);
          finalDx = constrained.dx;
          finalDy = constrained.dy;
        }

        moveSelectedPoints(finalDx, finalDy);
      } else if (isDraggingHandle && dragStartRef.current && draggingHandleSide) {
        moveHandle(dragStartRef.current.pointIndex, draggingHandleSide, x, y, modifiers);
      }
    },
    [isDraggingPoint, isDraggingHandle, draggingHandleSide, moveSelectedPoints, moveHandle]
  );

  // Handle canvas pointer up
  const onCanvasPointerUp = useCallback(() => {
    setIsDraggingPoint(false);
    setIsDraggingHandle(false);
    setDraggingHandleSide(undefined);
    dragStartRef.current = null;
  }, []);

  // Handle anchor point pointer down
  const onAnchorPointerDown = useCallback(
    (index: number, e: React.PointerEvent) => {
      e.stopPropagation();
      const modifiers = getModifierKeys(e);

      // Alt+click toggles point type
      if (modifiers.alt) {
        togglePointType(index);
        return;
      }

      // Select the point
      if (!selectedPoints.includes(index)) {
        selectPoint(index, modifiers.shift);
      }

      // Start dragging
      const rect = (e.target as Element).closest("svg")?.getBoundingClientRect();
      if (rect) {
        // Use viewBox-aware coordinates
        dragStartRef.current = {
          x: 0, // Will be set relative in pointer move
          y: 0,
          pointIndex: index,
        };

        // Store initial positions of all selected points
        initialPositionsRef.current.clear();
        const pointsToMove = selectedPoints.includes(index) ? selectedPoints : [index];
        for (const idx of pointsToMove) {
          const point = path.points[idx];
          if (point) {
            initialPositionsRef.current.set(idx, {
              x: point.x as number,
              y: point.y as number,
            });
          }
        }

        setIsDraggingPoint(true);
      }
    },
    [selectedPoints, selectPoint, togglePointType, path.points]
  );

  // Handle handle pointer down
  const onHandlePointerDown = useCallback(
    (pointIndex: number, side: "in" | "out", e: React.PointerEvent) => {
      e.stopPropagation();

      dragStartRef.current = {
        x: 0,
        y: 0,
        pointIndex,
      };
      setIsDraggingHandle(true);
      setDraggingHandleSide(side);
    },
    []
  );

  // Handle anchor hover
  const onAnchorHover = useCallback((index: number | undefined) => {
    setHoverPointIndex(index);
  }, []);

  // Handle keyboard events
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          callbacks.onCancel();
          break;

        case "Enter":
          callbacks.onCommit(path);
          break;

        case "Backspace":
        case "Delete":
          deleteSelectedPoints();
          break;

        case "a":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            // Select all points
            setSelectedPoints(path.points.map((_, i) => i));
          }
          break;
      }
    },
    [path, callbacks, deleteSelectedPoints]
  );

  return {
    state: {
      path,
      selectedPoints,
      hoverPointIndex,
      isDraggingPoint,
      isDraggingHandle,
      draggingHandleSide,
    },
    initializePath,
    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp,
    onAnchorPointerDown,
    onHandlePointerDown,
    onAnchorHover,
    onKeyDown,
    selectPoint,
    clearSelection,
    deleteSelectedPoints,
    togglePointType,
    hasChanges,
  };
}
