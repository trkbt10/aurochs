/**
 * @file useSlideshowMode
 *
 * Hook for managing slideshow mode state.
 * Controls slideshow open/close and fullscreen state.
 */

import { useState, useCallback, useEffect } from "react";

export type UseSlideshowModeOptions = {
  /** Callback when slideshow is entered */
  readonly onEnter?: (startIndex: number) => void;
  /** Callback when slideshow is exited */
  readonly onExit?: () => void;
  /** Start in fullscreen mode (default: false) */
  readonly startFullscreen?: boolean;
};

export type SlideshowModeResult = {
  /** Whether slideshow is currently active */
  readonly isActive: boolean;
  /** Start index for the slideshow (1-based) */
  readonly startSlideIndex: number;
  /** Start the slideshow from a specific slide */
  readonly startSlideshow: (startIndex?: number) => void;
  /** Exit the slideshow */
  readonly exitSlideshow: () => void;
  /** Whether currently in fullscreen mode */
  readonly isFullscreen: boolean;
  /** Toggle fullscreen mode */
  readonly toggleFullscreen: () => void;
  /** Enter fullscreen mode */
  readonly enterFullscreen: () => void;
  /** Exit fullscreen mode */
  readonly exitFullscreen: () => void;
};

/**
 * Hook for managing slideshow presentation mode.
 *
 * Provides:
 * - Slideshow active state
 * - Start/exit slideshow controls
 * - Fullscreen state and controls
 */
export function useSlideshowMode({
  onEnter,
  onExit,
  startFullscreen = false,
}: UseSlideshowModeOptions = {}): SlideshowModeResult {
  const [isActive, setIsActive] = useState(false);
  const [startSlideIndex, setStartSlideIndex] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Track fullscreen state
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const enterFullscreen = useCallback(() => {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => undefined);
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreen]);

  const startSlideshow = useCallback(
    (startIndex = 1) => {
      setStartSlideIndex(startIndex);
      setIsActive(true);
      onEnter?.(startIndex);
      if (startFullscreen) {
        enterFullscreen();
      }
    },
    [onEnter, startFullscreen, enterFullscreen],
  );

  const exitSlideshow = useCallback(() => {
    setIsActive(false);
    exitFullscreen();
    onExit?.();
  }, [onExit, exitFullscreen]);

  return {
    isActive,
    startSlideIndex,
    startSlideshow,
    exitSlideshow,
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
  };
}
