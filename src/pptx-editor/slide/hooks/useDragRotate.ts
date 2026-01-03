/**
 * @file Drag rotate hook
 *
 * Handles drag-to-rotate behavior for shapes.
 * Supports multi-selection rotation around combined center.
 */

import { useCallback, useEffect } from "react";
import type { Pixels, Bounds } from "../../../pptx/domain/types";
import { deg, px } from "../../../pptx/domain/types";
import { useSlideEditor } from "../../context/SlideEditorContext";
import { clientToSlideCoords } from "../../utils";
import { useSlideState } from "./useSlideState";
import type { ShapeId } from "../types";

// =============================================================================
// Types
// =============================================================================

export type UseDragRotateOptions = {
  /** Slide width for coordinate conversion */
  readonly width: Pixels;
  /** Slide height for coordinate conversion */
  readonly height: Pixels;
  /** Container element ref for coordinate calculation */
  readonly containerRef: React.RefObject<HTMLElement | null>;
  /** Snap angles (e.g., [0, 45, 90, 135, 180, 225, 270, 315]) */
  readonly snapAngles?: readonly number[];
  /** Snap threshold in degrees */
  readonly snapThreshold?: number;
  /** Callback when drag completes */
  readonly onDragComplete?: () => void;
};

export type UseDragRotateResult = {
  /** Whether a rotate drag is active */
  readonly isDragging: boolean;
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Normalize angle to 0-360 range
 */
function normalizeAngle(angle: number): number {
  let normalized = angle % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
}

/**
 * Snap angle to nearest snap point if within threshold
 */
function snapAngle(
  angle: number,
  snapAngles: readonly number[],
  threshold: number
): number {
  for (const snapAngle of snapAngles) {
    const diff = Math.abs(normalizeAngle(angle - snapAngle));
    if (diff < threshold || diff > 360 - threshold) {
      return snapAngle;
    }
  }
  return angle;
}

/**
 * Rotate a point around a center point
 */
function rotatePoint(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  angleRad: number
): { x: number; y: number } {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = x - centerX;
  const dy = y - centerY;
  return {
    x: centerX + dx * cos - dy * sin,
    y: centerY + dx * sin + dy * cos,
  };
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for handling drag-to-rotate behavior.
 *
 * Listens for pointer events and updates shape rotation during drag.
 * For multi-selection, rotates all shapes around the combined center.
 */
export function useDragRotate({
  width,
  height,
  containerRef,
  snapAngles = [0, 45, 90, 135, 180, 225, 270, 315],
  snapThreshold = 5,
  onDragComplete,
}: UseDragRotateOptions): UseDragRotateResult {
  const { state, dispatch } = useSlideEditor();
  const { updateShapeTransform, updateMultipleShapeTransforms } = useSlideState();
  const { drag } = state;

  const isDragging = drag.type === "rotate";

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
    if (!isDragging || drag.type !== "rotate") return;

    const handlePointerMove = (e: PointerEvent) => {
      const pos = clientToSlide(e.clientX, e.clientY);
      if (!pos) return;

      // Calculate angle from center to current position
      const centerX = drag.centerX as number;
      const centerY = drag.centerY as number;
      const currentAngle = Math.atan2(pos.y - centerY, pos.x - centerX) * (180 / Math.PI);

      // Calculate rotation delta
      const startAngle = drag.startAngle as number;
      const deltaAngle = currentAngle - startAngle;

      const isMultiSelection = drag.shapeIds.length > 1;

      if (isMultiSelection) {
        // Multi-selection: rotate each shape around combined center
        const updates: Array<{ id: ShapeId; bounds: { x: Pixels; y: Pixels; width: Pixels; height: Pixels } }> = [];
        const deltaRad = (deltaAngle * Math.PI) / 180;

        for (const shapeId of drag.shapeIds) {
          const initialBounds = drag.initialBoundsMap.get(shapeId);
          const initialRotationDeg = drag.initialRotationsMap.get(shapeId);
          if (!initialBounds || initialRotationDeg === undefined) continue;
          const initialRotation = initialRotationDeg as number;

          // Calculate shape center
          const shapeCenterX = (initialBounds.x as number) + (initialBounds.width as number) / 2;
          const shapeCenterY = (initialBounds.y as number) + (initialBounds.height as number) / 2;

          // Rotate shape center around combined center
          const newCenter = rotatePoint(shapeCenterX, shapeCenterY, centerX, centerY, deltaRad);

          // Calculate new top-left position
          const newX = newCenter.x - (initialBounds.width as number) / 2;
          const newY = newCenter.y - (initialBounds.height as number) / 2;

          // Also update the shape's individual rotation
          let newRotation = normalizeAngle(initialRotation + deltaAngle);
          if (e.shiftKey) {
            newRotation = snapAngle(newRotation, snapAngles, snapThreshold);
          }

          // Update both position and rotation
          updateShapeTransform(shapeId, {
            x: px(newX),
            y: px(newY),
            rotation: deg(newRotation),
          });
        }
      } else {
        // Single selection: just rotate the shape
        let newRotation = normalizeAngle((drag.initialRotation as number) + deltaAngle);

        // Apply snapping if shift is held
        if (e.shiftKey) {
          newRotation = snapAngle(newRotation, snapAngles, snapThreshold);
        }

        updateShapeTransform(drag.shapeId, {
          rotation: deg(newRotation),
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
    snapAngles,
    snapThreshold,
    onDragComplete,
  ]);

  return { isDragging };
}
