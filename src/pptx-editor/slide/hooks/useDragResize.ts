/**
 * @file Drag resize hook
 *
 * Handles drag-to-resize behavior for shapes.
 * Supports multi-selection resize with proportional scaling.
 */

import { useCallback, useEffect } from "react";
import type { Pixels, Bounds } from "../../../pptx/domain/types";
import { px } from "../../../pptx/domain/types";
import { useSlideEditor } from "../../context/SlideEditorContext";
import { clientToSlideCoords } from "../../utils";
import { useSlideState } from "./useSlideState";
import type { ResizeHandlePosition, ShapeId } from "../types";

// =============================================================================
// Types
// =============================================================================

export type UseDragResizeOptions = {
  /** Slide width for coordinate conversion */
  readonly width: Pixels;
  /** Slide height for coordinate conversion */
  readonly height: Pixels;
  /** Container element ref for coordinate calculation */
  readonly containerRef: React.RefObject<HTMLElement | null>;
  /** Minimum shape width */
  readonly minWidth?: number;
  /** Minimum shape height */
  readonly minHeight?: number;
  /** Callback when drag completes */
  readonly onDragComplete?: () => void;
};

export type UseDragResizeResult = {
  /** Whether a resize drag is active */
  readonly isDragging: boolean;
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate new bounds based on resize handle and delta
 */
function calculateNewBounds(
  handle: ResizeHandlePosition,
  initialBounds: { x: number; y: number; width: number; height: number },
  dx: number,
  dy: number,
  aspectLocked: boolean,
  minWidth: number,
  minHeight: number
): { x: number; y: number; width: number; height: number } {
  let { x, y, width, height } = initialBounds;
  const aspectRatio = initialBounds.width / initialBounds.height;

  // Calculate aspect-locked delta if needed
  const calcAspectDelta = (dw: number, dh: number): { dw: number; dh: number } => {
    if (!aspectLocked) return { dw, dh };

    // Use the larger delta to maintain aspect ratio
    const aspectDw = dh * aspectRatio;

    if (Math.abs(dw) > Math.abs(aspectDw)) {
      return { dw, dh: dw / aspectRatio };
    }
    return { dw: dh * aspectRatio, dh };
  };

  switch (handle) {
    case "nw": {
      const { dw, dh } = calcAspectDelta(-dx, -dy);
      const newWidth = Math.max(minWidth, initialBounds.width + dw);
      const newHeight = Math.max(minHeight, initialBounds.height + dh);
      x = initialBounds.x + initialBounds.width - newWidth;
      y = initialBounds.y + initialBounds.height - newHeight;
      width = newWidth;
      height = newHeight;
      break;
    }
    case "n": {
      const newHeight = Math.max(minHeight, initialBounds.height - dy);
      y = initialBounds.y + initialBounds.height - newHeight;
      height = newHeight;
      if (aspectLocked) {
        const newWidth = newHeight * aspectRatio;
        x = initialBounds.x + (initialBounds.width - newWidth) / 2;
        width = newWidth;
      }
      break;
    }
    case "ne": {
      const { dw, dh } = calcAspectDelta(dx, -dy);
      const newWidth = Math.max(minWidth, initialBounds.width + dw);
      const newHeight = Math.max(minHeight, initialBounds.height + dh);
      y = initialBounds.y + initialBounds.height - newHeight;
      width = newWidth;
      height = newHeight;
      break;
    }
    case "e": {
      const newWidth = Math.max(minWidth, initialBounds.width + dx);
      width = newWidth;
      if (aspectLocked) {
        const newHeight = newWidth / aspectRatio;
        y = initialBounds.y + (initialBounds.height - newHeight) / 2;
        height = newHeight;
      }
      break;
    }
    case "se": {
      const { dw, dh } = calcAspectDelta(dx, dy);
      width = Math.max(minWidth, initialBounds.width + dw);
      height = Math.max(minHeight, initialBounds.height + dh);
      break;
    }
    case "s": {
      const newHeight = Math.max(minHeight, initialBounds.height + dy);
      height = newHeight;
      if (aspectLocked) {
        const newWidth = newHeight * aspectRatio;
        x = initialBounds.x + (initialBounds.width - newWidth) / 2;
        width = newWidth;
      }
      break;
    }
    case "sw": {
      const { dw, dh } = calcAspectDelta(-dx, dy);
      const newWidth = Math.max(minWidth, initialBounds.width + dw);
      const newHeight = Math.max(minHeight, initialBounds.height + dh);
      x = initialBounds.x + initialBounds.width - newWidth;
      width = newWidth;
      height = newHeight;
      break;
    }
    case "w": {
      const newWidth = Math.max(minWidth, initialBounds.width - dx);
      x = initialBounds.x + initialBounds.width - newWidth;
      width = newWidth;
      if (aspectLocked) {
        const newHeight = newWidth / aspectRatio;
        y = initialBounds.y + (initialBounds.height - newHeight) / 2;
        height = newHeight;
      }
      break;
    }
  }

  return { x, y, width, height };
}

/**
 * Calculate new bounds for a shape within a multi-selection resize.
 * Applies proportional scaling based on the shape's position within the combined bounds.
 */
function calculateMultiResizeBounds(
  shapeBounds: { x: number; y: number; width: number; height: number },
  combinedOld: { x: number; y: number; width: number; height: number },
  combinedNew: { x: number; y: number; width: number; height: number }
): { x: number; y: number; width: number; height: number } {
  // Calculate scale factors
  const scaleX = combinedOld.width > 0 ? combinedNew.width / combinedOld.width : 1;
  const scaleY = combinedOld.height > 0 ? combinedNew.height / combinedOld.height : 1;

  // Calculate relative position within old combined bounds (0-1)
  const relX = combinedOld.width > 0 ? (shapeBounds.x - combinedOld.x) / combinedOld.width : 0;
  const relY = combinedOld.height > 0 ? (shapeBounds.y - combinedOld.y) / combinedOld.height : 0;

  // Calculate new position and size
  return {
    x: combinedNew.x + relX * combinedNew.width,
    y: combinedNew.y + relY * combinedNew.height,
    width: shapeBounds.width * scaleX,
    height: shapeBounds.height * scaleY,
  };
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for handling drag-to-resize behavior.
 *
 * Listens for pointer events and updates shape transforms during drag.
 * For multi-selection, applies proportional scaling to all selected shapes.
 */
export function useDragResize({
  width,
  height,
  containerRef,
  minWidth = 10,
  minHeight = 10,
  onDragComplete,
}: UseDragResizeOptions): UseDragResizeResult {
  const { state, dispatch } = useSlideEditor();
  const { updateShapeTransform, updateMultipleShapeTransforms } = useSlideState();
  const { drag } = state;

  const isDragging = drag.type === "resize";

  // Convert client coordinates to slide coordinates using unified utility
  const clientToSlide = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const container = containerRef.current;
      if (!container) return null;

      const rect = container.getBoundingClientRect();
      return clientToSlideCoords(clientX, clientY, rect, width as number, height as number);
    },
    [width, height, containerRef]
  );

  // Handle pointer move during drag
  useEffect(() => {
    if (!isDragging || drag.type !== "resize") return;

    const handlePointerMove = (e: PointerEvent) => {
      const pos = clientToSlide(e.clientX, e.clientY);
      if (!pos) return;

      const dx = pos.x - (drag.startX as number);
      const dy = pos.y - (drag.startY as number);
      const isMultiSelection = drag.shapeIds.length > 1;

      if (isMultiSelection) {
        // Multi-selection resize: calculate new combined bounds, then scale each shape
        const combinedOld = {
          x: drag.combinedBounds.x as number,
          y: drag.combinedBounds.y as number,
          width: drag.combinedBounds.width as number,
          height: drag.combinedBounds.height as number,
        };

        const combinedNew = calculateNewBounds(
          drag.handle,
          combinedOld,
          dx,
          dy,
          drag.aspectLocked || e.shiftKey,
          minWidth * drag.shapeIds.length, // Adjust min for combined
          minHeight * drag.shapeIds.length
        );

        // Calculate and apply new bounds for each shape
        const updates: Array<{ id: ShapeId; bounds: { x: Pixels; y: Pixels; width: Pixels; height: Pixels } }> = [];
        for (const shapeId of drag.shapeIds) {
          const initialBounds = drag.initialBoundsMap.get(shapeId);
          if (!initialBounds) continue;

          const shapeBoundsOld = {
            x: initialBounds.x as number,
            y: initialBounds.y as number,
            width: initialBounds.width as number,
            height: initialBounds.height as number,
          };

          const shapeBoundsNew = calculateMultiResizeBounds(shapeBoundsOld, combinedOld, combinedNew);

          updates.push({
            id: shapeId,
            bounds: {
              x: px(shapeBoundsNew.x),
              y: px(shapeBoundsNew.y),
              width: px(Math.max(minWidth, shapeBoundsNew.width)),
              height: px(Math.max(minHeight, shapeBoundsNew.height)),
            },
          });
        }

        updateMultipleShapeTransforms(updates);
      } else {
        // Single selection resize (backwards compatible)
        const newBounds = calculateNewBounds(
          drag.handle,
          {
            x: drag.initialBounds.x as number,
            y: drag.initialBounds.y as number,
            width: drag.initialBounds.width as number,
            height: drag.initialBounds.height as number,
          },
          dx,
          dy,
          drag.aspectLocked || e.shiftKey,
          minWidth,
          minHeight
        );

        updateShapeTransform(drag.shapeId, {
          x: px(newBounds.x),
          y: px(newBounds.y),
          width: px(newBounds.width),
          height: px(newBounds.height),
        });
      }
    };

    const handlePointerUp = () => {
      dispatch({ type: "END_DRAG" });
      onDragComplete?.();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [
    isDragging,
    drag,
    dispatch,
    clientToSlide,
    updateShapeTransform,
    updateMultipleShapeTransforms,
    minWidth,
    minHeight,
    onDragComplete,
  ]);

  return { isDragging };
}
