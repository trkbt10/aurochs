/**
 * @file Slide key navigation hook
 *
 * Handles Arrow key navigation with Shift extension for selection.
 */

import { useCallback, useEffect } from "react";
import type { SlideId, SlideWithId } from "@oxen/pptx/app";
import type { SlideListOrientation, SlideSelectionState } from "../types";

export type UseSlideKeyNavigationOptions = {
  /** Slides array */
  readonly slides: readonly SlideWithId[];
  /** Current selection state */
  readonly selection: SlideSelectionState;
  /** Scroll orientation */
  readonly orientation: SlideListOrientation;
  /** Navigate to a slide */
  readonly onNavigate: (slideId: SlideId, index: number) => void;
  /** Extend selection range */
  readonly onExtendSelection: (fromIndex: number, toIndex: number) => void;
  /** Whether keyboard navigation is enabled */
  readonly enabled?: boolean;
  /** Container element ref for focus scope */
  readonly containerRef?: React.RefObject<HTMLElement | null>;
};

export type UseSlideKeyNavigationResult = {
  /** Key down handler to attach to container */
  readonly handleKeyDown: (event: React.KeyboardEvent) => void;
};

/**
 * Get current index from selection
 */
function getCurrentIndex(
  slides: readonly SlideWithId[],
  selection: SlideSelectionState
): number {
  if (selection.primaryId) {
    const idx = slides.findIndex((s) => s.id === selection.primaryId);
    if (idx !== -1) {return idx;}
  }
  return 0;
}

/**
 * Check if key is a navigation key for the orientation
 */
function isNavigationKey(
  key: string,
  orientation: SlideListOrientation
): { isNext: boolean; isPrev: boolean } {
  if (orientation === "vertical") {
    return {
      isNext: key === "ArrowDown",
      isPrev: key === "ArrowUp",
    };
  }
  // horizontal
  return {
    isNext: key === "ArrowRight",
    isPrev: key === "ArrowLeft",
  };
}

/**
 * Hook for keyboard navigation in slide list
 */
export function useSlideKeyNavigation(
  options: UseSlideKeyNavigationOptions
): UseSlideKeyNavigationResult {
  const {
    slides,
    selection,
    orientation,
    onNavigate,
    onExtendSelection,
    enabled = true,
    containerRef,
  } = options;

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!enabled || slides.length === 0) {return;}

      const { isNext, isPrev } = isNavigationKey(event.key, orientation);

      if (!isNext && !isPrev) {
        // Handle Home/End
        if (event.key === "Home") {
          event.preventDefault();
          if (event.shiftKey && selection.anchorIndex !== undefined) {
            onExtendSelection(selection.anchorIndex, 0);
          } else {
            onNavigate(slides[0].id, 0);
          }
          return;
        }
        if (event.key === "End") {
          event.preventDefault();
          const lastIndex = slides.length - 1;
          if (event.shiftKey && selection.anchorIndex !== undefined) {
            onExtendSelection(selection.anchorIndex, lastIndex);
          } else {
            onNavigate(slides[lastIndex].id, lastIndex);
          }
          return;
        }

        // Handle Ctrl/Cmd+A for select all
        if ((event.metaKey || event.ctrlKey) && event.key === "a") {
          event.preventDefault();
          // Select all is handled externally
          return;
        }

        return;
      }

      event.preventDefault();

      const currentIndex = getCurrentIndex(slides, selection);
      const newIndex = isNext
        ? Math.min(currentIndex + 1, slides.length - 1)
        : Math.max(currentIndex - 1, 0);

      if (newIndex === currentIndex) {return;}

      if (event.shiftKey) {
        // Extend selection
        const anchor = selection.anchorIndex ?? currentIndex;
        onExtendSelection(anchor, newIndex);
      } else {
        // Navigate
        onNavigate(slides[newIndex].id, newIndex);
      }
    },
    [
      enabled,
      slides,
      orientation,
      selection,
      onNavigate,
      onExtendSelection,
    ]
  );

  // Global keyboard listener when container is focused
  useEffect(() => {
    if (!enabled || !containerRef?.current) {return;}

    const container = containerRef.current;

    function handleGlobalKeyDown(event: KeyboardEvent) {
      // Only handle if container or child is focused
      if (!container.contains(document.activeElement)) {return;}

      const { isNext, isPrev } = isNavigationKey(event.key, orientation);
      const isNavKey =
        isNext ||
        isPrev ||
        event.key === "Home" ||
        event.key === "End";

      if (isNavKey) {
        handleKeyDown(event as unknown as React.KeyboardEvent);
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [enabled, containerRef, orientation, handleKeyDown]);

  return { handleKeyDown };
}
