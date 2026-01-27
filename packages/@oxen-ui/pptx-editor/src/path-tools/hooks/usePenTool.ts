/**
 * @file Pen tool hook
 *
 * Manages pen tool interactions for creating paths.
 */

import { useCallback, useState, useRef, useEffect } from "react";
import type { Pixels } from "@oxen/ooxml/domain/units";
import { px } from "@oxen/ooxml/domain/units";
import type {
  DrawingPath,
  PathAnchorPoint,
  AnchorPointType,
  ModifierKeys,
} from "../types";
import {
  createEmptyDrawingPath,
  addPointToPath,
  updatePointInPath,
  closeDrawingPath,
  getModifierKeys,
} from "../types";
import { constrainVectorTo45Degrees, distance, mirrorHandle } from "../utils/bezier-math";

// =============================================================================
// Types
// =============================================================================

/**
 * Pen tool state
 */
export type PenToolState = {
  /** Current drawing path */
  readonly path: DrawingPath;
  /** Whether currently dragging a handle */
  readonly isDraggingHandle: boolean;
  /** Index of point being hovered (for close path feedback) */
  readonly hoverPointIndex: number | undefined;
  /** Current preview position */
  readonly previewPoint: { x: number; y: number } | undefined;
};

/**
 * Pen tool callbacks
 */
export type PenToolCallbacks = {
  /** Called when the path is committed (Enter or close) */
  readonly onCommit: (path: DrawingPath) => void;
  /** Called when the path is cancelled (Escape) */
  readonly onCancel: () => void;
};

/**
 * Pen tool return type
 */
export type UsePenToolReturn = {
  /** Current state */
  readonly state: PenToolState;
  /** Handle canvas pointer down */
  readonly onCanvasPointerDown: (x: number, y: number, modifiers: ModifierKeys) => void;
  /** Handle canvas pointer move */
  readonly onCanvasPointerMove: (x: number, y: number, modifiers: ModifierKeys) => void;
  /** Handle canvas pointer up */
  readonly onCanvasPointerUp: () => void;
  /** Handle anchor point pointer down */
  readonly onAnchorPointerDown: (index: number, e: React.PointerEvent) => void;
  /** Handle anchor point hover */
  readonly onAnchorHover: (index: number | undefined) => void;
  /** Handle keyboard events */
  readonly onKeyDown: (e: React.KeyboardEvent) => void;
  /** Reset the tool state */
  readonly reset: () => void;
  /** Whether the tool has an active path */
  readonly hasActivePath: boolean;
};

// =============================================================================
// Constants
// =============================================================================

const CLOSE_PATH_THRESHOLD = 12; // Distance in pixels to close path

// =============================================================================
// Hook
// =============================================================================

/**
 * Pen tool hook
 *
 * Provides state and callbacks for pen tool interactions.
 */
export function usePenTool(callbacks: PenToolCallbacks): UsePenToolReturn {
  const [path, setPath] = useState<DrawingPath>(createEmptyDrawingPath());
  const [isDraggingHandle, setIsDraggingHandle] = useState(false);
  const [hoverPointIndex, setHoverPointIndex] = useState<number | undefined>(undefined);
  const [previewPoint, setPreviewPoint] = useState<{ x: number; y: number } | undefined>(undefined);

  // Track drag start for handle creation
  const dragStartRef = useRef<{ x: number; y: number; pointIndex: number } | null>(null);

  // Reset state
  const reset = useCallback(() => {
    setPath(createEmptyDrawingPath());
    setIsDraggingHandle(false);
    setHoverPointIndex(undefined);
    setPreviewPoint(undefined);
    dragStartRef.current = null;
  }, []);

  // Add a new point
  const addPoint = useCallback(
    (x: number, y: number, pointType: AnchorPointType) => {
      const newPoint: PathAnchorPoint = {
        x: px(x),
        y: px(y),
        type: pointType,
        handleIn: undefined,
        handleOut: undefined,
      };
      setPath((p) => addPointToPath(p, newPoint));
    },
    []
  );

  // Update handles for a point
  const updatePointHandles = useCallback(
    (
      pointIndex: number,
      handleIn?: { x: Pixels; y: Pixels },
      handleOut?: { x: Pixels; y: Pixels }
    ) => {
      setPath((p) =>
        updatePointInPath(p, pointIndex, (point) => ({
          ...point,
          type: "smooth" as AnchorPointType,
          handleIn: handleIn ?? point.handleIn,
          handleOut: handleOut ?? point.handleOut,
        }))
      );
    },
    []
  );

  // Handle canvas pointer down
  const onCanvasPointerDown = useCallback(
    (x: number, y: number, modifiers: ModifierKeys) => {
      // Check if clicking near first point to close path
      if (path.points.length > 2) {
        const firstPoint = path.points[0];
        const dist = distance(
          { x: px(x), y: px(y) },
          { x: firstPoint.x, y: firstPoint.y }
        );
        if (dist < CLOSE_PATH_THRESHOLD) {
          // Close the path
          const closedPath = closeDrawingPath(path);
          callbacks.onCommit(closedPath);
          reset();
          return;
        }
      }

      // Determine point type based on modifier keys
      const pointType: AnchorPointType = modifiers.alt ? "corner" : "smooth";

      // Constrain position if shift is held
      let finalX = x;
      let finalY = y;
      if (modifiers.shift && path.points.length > 0) {
        const lastPoint = path.points[path.points.length - 1];
        const constrained = constrainVectorTo45Degrees(
          x - (lastPoint.x as number),
          y - (lastPoint.y as number)
        );
        finalX = (lastPoint.x as number) + constrained.dx;
        finalY = (lastPoint.y as number) + constrained.dy;
      }

      // Add the point
      addPoint(finalX, finalY, pointType);

      // Start tracking for handle drag
      dragStartRef.current = { x: finalX, y: finalY, pointIndex: path.points.length };
      setIsDraggingHandle(true);
    },
    [path, callbacks, reset, addPoint]
  );

  // Handle canvas pointer move
  const onCanvasPointerMove = useCallback(
    (x: number, y: number, modifiers: ModifierKeys) => {
      if (isDraggingHandle && dragStartRef.current) {
        // Dragging to create handles
        const { pointIndex } = dragStartRef.current;
        let dx = x - dragStartRef.current.x;
        let dy = y - dragStartRef.current.y;

        // Constrain if shift is held
        if (modifiers.shift) {
          const constrained = constrainVectorTo45Degrees(dx, dy);
          dx = constrained.dx;
          dy = constrained.dy;
        }

        // Only create handles if we've moved enough
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          const handleOut = { x: px(dragStartRef.current.x + dx), y: px(dragStartRef.current.y + dy) };
          const handleIn = mirrorHandle(
            { x: px(dragStartRef.current.x), y: px(dragStartRef.current.y) },
            handleOut
          );

          updatePointHandles(pointIndex, handleIn, handleOut);
        }
      } else {
        // Update preview point
        let finalX = x;
        let finalY = y;

        // Constrain if shift is held and we have points
        if (modifiers.shift && path.points.length > 0) {
          const lastPoint = path.points[path.points.length - 1];
          const constrained = constrainVectorTo45Degrees(
            x - (lastPoint.x as number),
            y - (lastPoint.y as number)
          );
          finalX = (lastPoint.x as number) + constrained.dx;
          finalY = (lastPoint.y as number) + constrained.dy;
        }

        setPreviewPoint({ x: finalX, y: finalY });

        // Check for hover on first point (for close path indicator)
        if (path.points.length > 2) {
          const firstPoint = path.points[0];
          const dist = distance({ x: px(x), y: px(y) }, { x: firstPoint.x, y: firstPoint.y });
          setHoverPointIndex(dist < CLOSE_PATH_THRESHOLD ? 0 : undefined);
        }
      }
    },
    [isDraggingHandle, path.points, updatePointHandles]
  );

  // Handle canvas pointer up
  const onCanvasPointerUp = useCallback(() => {
    setIsDraggingHandle(false);
    dragStartRef.current = null;
  }, []);

  // Handle anchor point pointer down (for editing existing points)
  const onAnchorPointerDown = useCallback(
    (index: number, e: React.PointerEvent) => {
      e.stopPropagation();
      const modifiers = getModifierKeys(e);

      // If clicking first point, close the path
      if (index === 0 && path.points.length > 2) {
        const closedPath = closeDrawingPath(path);
        callbacks.onCommit(closedPath);
        reset();
        return;
      }

      // Alt+click toggles point type
      if (modifiers.alt && index < path.points.length) {
        setPath((p) =>
          updatePointInPath(p, index, (point) => ({
            ...point,
            type: point.type === "smooth" ? "corner" : "smooth",
            // If converting to corner, keep handles as-is
            // If converting to smooth, handles would need to be aligned (not implemented here)
          }))
        );
      }
    },
    [path, callbacks, reset]
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
          // Cancel the current path
          callbacks.onCancel();
          reset();
          break;

        case "Enter":
          // Commit the current path as open
          if (path.points.length > 1) {
            callbacks.onCommit(path);
            reset();
          }
          break;

        case "Backspace":
        case "Delete":
          // Remove the last point
          if (path.points.length > 0) {
            setPath((p) => ({
              ...p,
              points: p.points.slice(0, -1),
            }));
          }
          break;
      }
    },
    [path, callbacks, reset]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  return {
    state: {
      path,
      isDraggingHandle,
      hoverPointIndex,
      previewPoint,
    },
    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp,
    onAnchorPointerDown,
    onAnchorHover,
    onKeyDown,
    reset,
    hasActivePath: path.points.length > 0,
  };
}
