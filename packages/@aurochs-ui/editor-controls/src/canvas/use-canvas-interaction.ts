/**
 * @file Shared canvas interaction hooks
 *
 * Format-agnostic hooks for canvas operations:
 * - findItemAtPoint: Hit-test items by bounds (topmost-first)
 * - useCanvasCoords: Convert client coords to canvas coords via container ref
 * - useGlobalDragListeners: Attach global pointermove/pointerup for drag operations
 */

import { useCallback, useEffect, type RefObject } from "react";
import { isPointInBounds } from "@aurochs-ui/editor-core/geometry";
import { clientToCanvasCoords } from "@aurochs-ui/editor-core/geometry";

// =============================================================================
// Hit Testing
// =============================================================================

/** Bounds with ID for hit testing. */
export type HitTestBounds<TId> = {
  readonly id: TId;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation?: number;
};

/**
 * Find the topmost item at the given canvas coordinates.
 * Iterates in reverse order (last = topmost in render order).
 */
export function findItemAtPoint<TId>(
  canvasX: number,
  canvasY: number,
  bounds: readonly HitTestBounds<TId>[],
): TId | undefined {
  for (let i = bounds.length - 1; i >= 0; i--) {
    const b = bounds[i];
    if (b.width > 0 && b.height > 0 && isPointInBounds(canvasX, canvasY, { ...b, rotation: b.rotation ?? 0 })) {
      return b.id;
    }
  }
  return undefined;
}

// =============================================================================
// Coordinate Conversion Hook
// =============================================================================

/** Canvas dimensions in domain units. */
export type CanvasSize = {
  readonly width: number;
  readonly height: number;
};

/**
 * Hook that provides a function to convert client (pointer event) coordinates
 * to canvas coordinates using the container ref and canvas dimensions.
 */
export function useCanvasCoords(
  containerRef: RefObject<HTMLElement | null>,
  canvasSize: CanvasSize,
): (e: { clientX: number; clientY: number }) => { x: number; y: number } | undefined {
  return useCallback(
    (e: { clientX: number; clientY: number }) => {
      const container = containerRef.current;
      if (!container) { return undefined; }
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) { return undefined; }
      return clientToCanvasCoords({
        clientX: e.clientX,
        clientY: e.clientY,
        containerRect: rect,
        canvasWidth: canvasSize.width,
        canvasHeight: canvasSize.height,
      });
    },
    [containerRef, canvasSize.width, canvasSize.height],
  );
}

// =============================================================================
// Global Drag Listeners Hook
// =============================================================================

/**
 * Attach global pointermove/pointerup listeners when `active` is true.
 * Automatically converts client coords to canvas coords before calling handlers.
 */
export function useGlobalDragListeners(args: {
  readonly active: boolean;
  readonly containerRef: RefObject<HTMLElement | null>;
  readonly canvasSize: CanvasSize;
  readonly onMove: (canvasX: number, canvasY: number) => void;
  readonly onEnd: () => void;
}): void {
  const { active, containerRef, canvasSize, onMove, onEnd } = args;

  useEffect(() => {
    if (!active) { return; }

    function handlePointerMove(e: globalThis.PointerEvent) {
      const container = containerRef.current;
      if (!container) { return; }
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) { return; }
      const coords = clientToCanvasCoords({
        clientX: e.clientX,
        clientY: e.clientY,
        containerRect: rect,
        canvasWidth: canvasSize.width,
        canvasHeight: canvasSize.height,
      });
      onMove(coords.x, coords.y);
    }

    function handlePointerUp() {
      onEnd();
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [active, containerRef, canvasSize.width, canvasSize.height, onMove, onEnd]);
}
