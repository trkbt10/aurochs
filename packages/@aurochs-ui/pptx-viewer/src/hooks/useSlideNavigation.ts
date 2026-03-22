/**
 * @file useSlideNavigation
 *
 * Shared hook for slide navigation state and actions.
 * Supports optional URL parameter synchronization for slide sharing.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";

export type UseSlideNavigationOptions = {
  /** Total number of slides in the presentation */
  readonly totalSlides: number;
  /** Initial slide number (1-based, default: 1) */
  readonly initialSlide?: number;
  /** Enable looping from last to first slide (default: false) */
  readonly loop?: boolean;
  /** Callback when slide changes */
  readonly onSlideChange?: (slideNumber: number) => void;
  /** Sync current slide with URL search parameter (default: false) */
  readonly urlSync?: boolean;
  /** URL parameter name for slide number (default: "slide") */
  readonly urlParamName?: string;
};

export type SlideNavigationResult = {
  /** Current slide number (1-based) */
  readonly currentSlide: number;
  /** Total number of slides */
  readonly totalSlides: number;
  /** Progress percentage (0-100) */
  readonly progress: number;
  /** Whether current slide is the first slide */
  readonly isFirst: boolean;
  /** Whether current slide is the last slide */
  readonly isLast: boolean;
  /** Go to next slide */
  readonly goToNext: () => void;
  /** Go to previous slide */
  readonly goToPrev: () => void;
  /** Go to first slide */
  readonly goToFirst: () => void;
  /** Go to last slide */
  readonly goToLast: () => void;
  /** Go to specific slide number (1-based) */
  readonly goToSlide: (num: number) => void;
  /** Set current slide directly (1-based) */
  readonly setCurrentSlide: (num: number) => void;
};

function getInitialSlideFromUrl(paramName: string, fallback: number, maxSlide: number): number {
  if (typeof window === "undefined") {
    return fallback;
  }
  const params = new URLSearchParams(window.location.search);
  const value = params.get(paramName);
  if (!value) {
    return fallback;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, maxSlide);
}

function updateUrlParam(paramName: string, value: number): void {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.set(paramName, String(value));
  window.history.replaceState({}, "", url.toString());
}

/**
 * Hook for managing slide navigation state.
 *
 * Provides:
 * - Current slide state with bounds checking
 * - Navigation actions (next, prev, first, last, goTo)
 * - Progress percentage for progress bars
 * - Boundary checks (isFirst, isLast)
 * - Optional URL parameter synchronization
 */
export function useSlideNavigation({
  totalSlides,
  initialSlide = 1,
  loop = false,
  onSlideChange,
  urlSync = false,
  urlParamName = "slide",
}: UseSlideNavigationOptions): SlideNavigationResult {
  const isInitialMount = useRef(true);

  const [currentSlide, setCurrentSlideInternal] = useState(() => {
    if (urlSync) {
      return getInitialSlideFromUrl(urlParamName, initialSlide, totalSlides);
    }
    return Math.max(1, Math.min(totalSlides, initialSlide));
  });

  // Handle URL changes (browser back/forward)
  useEffect(() => {
    if (!urlSync || typeof window === "undefined") {
      return;
    }

    function handlePopState() {
      const newSlide = getInitialSlideFromUrl(urlParamName, currentSlide, totalSlides);
      if (newSlide !== currentSlide) {
        setCurrentSlideInternal(newSlide);
        onSlideChange?.(newSlide);
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [urlSync, urlParamName, currentSlide, totalSlides, onSlideChange]);

  const setCurrentSlide = useCallback(
    (num: number) => {
      const target = Math.max(1, Math.min(totalSlides, num));
      setCurrentSlideInternal(target);
      onSlideChange?.(target);
      if (urlSync) {
        updateUrlParam(urlParamName, target);
      }
    },
    [totalSlides, onSlideChange, urlSync, urlParamName],
  );

  // Sync URL on initial mount if urlSync is enabled
  useEffect(() => {
    if (isInitialMount.current && urlSync) {
      updateUrlParam(urlParamName, currentSlide);
      isInitialMount.current = false;
    }
  }, [urlSync, urlParamName, currentSlide]);

  const goToNext = useCallback(() => {
    if (currentSlide < totalSlides) {
      setCurrentSlide(currentSlide + 1);
    } else if (loop) {
      setCurrentSlide(1);
    }
  }, [currentSlide, totalSlides, setCurrentSlide, loop]);

  const goToPrev = useCallback(() => {
    if (currentSlide > 1) {
      setCurrentSlide(currentSlide - 1);
    } else if (loop) {
      setCurrentSlide(totalSlides);
    }
  }, [currentSlide, totalSlides, setCurrentSlide, loop]);

  const goToFirst = useCallback(() => {
    setCurrentSlide(1);
  }, [setCurrentSlide]);

  const goToLast = useCallback(() => {
    setCurrentSlide(totalSlides);
  }, [totalSlides, setCurrentSlide]);

  const goToSlide = useCallback(
    (num: number) => {
      setCurrentSlide(num);
    },
    [setCurrentSlide],
  );

  const derived = useMemo(
    () => ({
      progress: totalSlides > 0 ? (currentSlide / totalSlides) * 100 : 0,
      isFirst: currentSlide === 1,
      isLast: currentSlide === totalSlides,
    }),
    [currentSlide, totalSlides],
  );

  return {
    currentSlide,
    totalSlides,
    ...derived,
    goToNext,
    goToPrev,
    goToFirst,
    goToLast,
    goToSlide,
    setCurrentSlide,
  };
}
