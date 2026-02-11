/**
 * @file useViewerKeyboard
 *
 * Keyboard navigation hook for slide viewer mode.
 * Provides basic navigation without slideshow-specific features.
 */

import { useEffect } from "react";

export type ViewerKeyboardActions = {
  /** Navigate to next slide */
  readonly goToNext: () => void;
  /** Navigate to previous slide */
  readonly goToPrev: () => void;
  /** Navigate to first slide */
  readonly goToFirst: () => void;
  /** Navigate to last slide */
  readonly goToLast: () => void;
  /** Start slideshow presentation */
  readonly onStartSlideshow: () => void;
  /** Exit viewer */
  readonly onExit: () => void;
};

/**
 * Hook for viewer keyboard navigation.
 *
 * Supported keys:
 * - ArrowRight, ArrowDown: Next slide
 * - ArrowLeft, ArrowUp: Previous slide
 * - Home: Go to first slide
 * - End: Go to last slide
 * - F: Start slideshow
 * - Escape: Exit viewer
 */
export function useViewerKeyboard(actions: ViewerKeyboardActions): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          actions.goToNext();
          break;

        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          actions.goToPrev();
          break;

        case "Home":
          e.preventDefault();
          actions.goToFirst();
          break;

        case "End":
          e.preventDefault();
          actions.goToLast();
          break;

        case "f":
        case "F":
          e.preventDefault();
          actions.onStartSlideshow();
          break;

        case "Escape":
          e.preventDefault();
          actions.onExit();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actions]);
}
