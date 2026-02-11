/**
 * @file useViewerKeyboard
 *
 * Hook for handling keyboard navigation in viewers.
 */

import { useEffect } from "react";

export type ViewerKeyboardActions = {
  /** Go to next item (ArrowRight, ArrowDown, PageDown, Space) */
  readonly goToNext?: () => void;
  /** Go to previous item (ArrowLeft, ArrowUp, PageUp) */
  readonly goToPrev?: () => void;
  /** Go to first item (Home) */
  readonly goToFirst?: () => void;
  /** Go to last item (End) */
  readonly goToLast?: () => void;
  /** Zoom in (+, =) */
  readonly zoomIn?: () => void;
  /** Zoom out (-) */
  readonly zoomOut?: () => void;
  /** Exit viewer (Escape) */
  readonly onExit?: () => void;
};

/**
 * Hook for keyboard navigation in viewers.
 *
 * @example
 * ```tsx
 * useViewerKeyboard({
 *   goToNext: nav.goToNext,
 *   goToPrev: nav.goToPrev,
 *   goToFirst: nav.goToFirst,
 *   goToLast: nav.goToLast,
 *   zoomIn: handleZoomIn,
 *   zoomOut: handleZoomOut,
 *   onExit: () => setOpen(false),
 * });
 * ```
 */
export function useViewerKeyboard(actions: ViewerKeyboardActions): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Ignore if focus is on an input element
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
          if (actions.goToNext) {
            event.preventDefault();
            actions.goToNext();
          }
          break;

        case " ":
          if (actions.goToNext && !event.shiftKey) {
            event.preventDefault();
            actions.goToNext();
          } else if (actions.goToPrev && event.shiftKey) {
            event.preventDefault();
            actions.goToPrev();
          }
          break;

        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          if (actions.goToPrev) {
            event.preventDefault();
            actions.goToPrev();
          }
          break;

        case "Home":
          if (actions.goToFirst) {
            event.preventDefault();
            actions.goToFirst();
          }
          break;

        case "End":
          if (actions.goToLast) {
            event.preventDefault();
            actions.goToLast();
          }
          break;

        case "+":
        case "=":
          if (actions.zoomIn) {
            event.preventDefault();
            actions.zoomIn();
          }
          break;

        case "-":
          if (actions.zoomOut) {
            event.preventDefault();
            actions.zoomOut();
          }
          break;

        case "Escape":
          if (actions.onExit) {
            event.preventDefault();
            actions.onExit();
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [actions]);
}
