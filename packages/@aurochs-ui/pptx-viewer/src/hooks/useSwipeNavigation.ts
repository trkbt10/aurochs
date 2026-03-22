/**
 * @file useSwipeNavigation
 *
 * Hook for detecting horizontal swipe gestures for slide navigation.
 * Uses Pointer Events for unified mouse/touch/pen handling.
 */

import { useEffect, useRef, type RefObject } from "react";

const DEFAULT_THRESHOLD = 50;
const HORIZONTAL_DOMINANCE_RATIO = 2;

export type UseSwipeNavigationOptions = {
  /** Ref to the container element for swipe detection */
  readonly containerRef: RefObject<HTMLElement | null>;
  /** Called when user swipes left (navigate to next slide) */
  readonly onSwipeLeft: () => void;
  /** Called when user swipes right (navigate to previous slide) */
  readonly onSwipeRight: () => void;
  /** Minimum swipe distance in pixels to trigger navigation (default: 50) */
  readonly threshold?: number;
  /** Enable or disable swipe detection (default: true) */
  readonly enabled?: boolean;
};

type SwipeState = {
  active: boolean;
  pointerId: number;
  startX: number;
  startY: number;
};

/**
 * Hook for swipe-based slide navigation.
 *
 * Detects horizontal swipes and triggers navigation callbacks.
 * Swipe left triggers onSwipeLeft (next), swipe right triggers onSwipeRight (prev).
 */
export function useSwipeNavigation({
  containerRef,
  onSwipeLeft,
  onSwipeRight,
  threshold = DEFAULT_THRESHOLD,
  enabled = true,
}: UseSwipeNavigationOptions): void {
  const stateRef = useRef<SwipeState>({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    function handlePointerDown(e: PointerEvent): void {
      // Only track primary pointer (first touch)
      if (stateRef.current.active) {
        return;
      }

      // Skip if originated from interactive elements or click zones
      const target = e.target as HTMLElement;
      if (target.closest("button, a, input, [data-controls], [data-click-zone]")) {
        return;
      }

      stateRef.current = {
        active: true,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
      };
    }

    function handlePointerMove(e: PointerEvent): void {
      const state = stateRef.current;
      if (!state.active || e.pointerId !== state.pointerId) {
        return;
      }
      // Could add visual feedback here if needed
    }

    function handlePointerEnd(e: PointerEvent): void {
      const state = stateRef.current;
      if (!state.active || e.pointerId !== state.pointerId) {
        return;
      }

      const deltaX = e.clientX - state.startX;
      const deltaY = e.clientY - state.startY;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Reset state
      stateRef.current = {
        active: false,
        pointerId: -1,
        startX: 0,
        startY: 0,
      };

      // Check if horizontal movement is dominant and exceeds threshold
      if (absDeltaX >= threshold && absDeltaX >= absDeltaY * HORIZONTAL_DOMINANCE_RATIO) {
        if (deltaX < 0) {
          onSwipeLeft();
        } else {
          onSwipeRight();
        }
      }
    }

    function handlePointerCancel(e: PointerEvent): void {
      const state = stateRef.current;
      if (!state.active || e.pointerId !== state.pointerId) {
        return;
      }

      // Reset state without triggering navigation
      stateRef.current = {
        active: false,
        pointerId: -1,
        startX: 0,
        startY: 0,
      };
    }

    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerup", handlePointerEnd);
    container.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerup", handlePointerEnd);
      container.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [containerRef, onSwipeLeft, onSwipeRight, threshold, enabled]);
}
