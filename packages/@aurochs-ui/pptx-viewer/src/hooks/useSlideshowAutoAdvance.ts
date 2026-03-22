/**
 * @file useSlideshowAutoAdvance
 *
 * Hook for auto-advancing slides based on transition timing.
 */

import { useLayoutEffect, useRef } from "react";

export type UseSlideshowAutoAdvanceOptions = {
  /** Time in milliseconds to wait before advancing (undefined = disabled) */
  readonly advanceAfter: number | undefined;
  /** Current slide index */
  readonly currentSlideIndex: number;
  /** Total number of slides */
  readonly slideCount: number;
  /** Whether a transition is currently in progress */
  readonly isTransitioning: boolean;
  /** Whether black screen overlay is active */
  readonly isBlackScreen: boolean;
  /** Whether white screen overlay is active */
  readonly isWhiteScreen: boolean;
  /** Callback to advance to next slide */
  readonly onAdvance: () => void;
};

/**
 * Hook for auto-advancing slides after a specified time.
 * Only advances when:
 * - advanceAfter is defined
 * - Not on the last slide
 * - Not during a transition
 * - Not showing black/white screen
 */
export function useSlideshowAutoAdvance({
  advanceAfter,
  currentSlideIndex,
  slideCount,
  isTransitioning,
  isBlackScreen,
  isWhiteScreen,
  onAdvance,
}: UseSlideshowAutoAdvanceOptions): void {
  const transitionCompleteTimeRef = useRef<number>(0);

  useLayoutEffect(() => {
    if (!isTransitioning) {
      transitionCompleteTimeRef.current = performance.now();
    }
  }, [isTransitioning]);

  useLayoutEffect(() => {
    if (!advanceAfter || currentSlideIndex >= slideCount) {
      return;
    }
    if (isTransitioning) {
      return;
    }
    if (isBlackScreen || isWhiteScreen) {
      return;
    }

    const elapsed = performance.now() - transitionCompleteTimeRef.current;
    const remaining = Math.max(0, advanceAfter - elapsed);

    const timerId = window.setTimeout(() => {
      onAdvance();
    }, remaining);

    return () => {
      clearTimeout(timerId);
    };
  }, [advanceAfter, currentSlideIndex, slideCount, isTransitioning, isBlackScreen, isWhiteScreen, onAdvance]);
}
