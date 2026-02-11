/**
 * @file useSlideshowControls
 *
 * Hook for managing slideshow control visibility with auto-hide.
 */

import { useState, useEffect, useRef, type RefObject } from "react";

const DEFAULT_HIDE_DELAY = 2500;

export type UseSlideshowControlsOptions = {
  /** Ref to the container element for mouse tracking */
  readonly containerRef: RefObject<HTMLElement | null>;
  /** Delay in milliseconds before hiding controls (default: 2500) */
  readonly hideDelay?: number;
};

export type SlideshowControlsResult = {
  /** Whether controls should be visible */
  readonly showControls: boolean;
};

/**
 * Hook for auto-hiding slideshow controls on mouse inactivity.
 */
export function useSlideshowControls({
  containerRef,
  hideDelay = DEFAULT_HIDE_DELAY,
}: UseSlideshowControlsOptions): SlideshowControlsResult {
  const [showControls, setShowControls] = useState(true);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    function handleMouseMove() {
      setShowControls(true);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, hideDelay);
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.addEventListener("mousemove", handleMouseMove);
    handleMouseMove();

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [containerRef, hideDelay]);

  return { showControls };
}
