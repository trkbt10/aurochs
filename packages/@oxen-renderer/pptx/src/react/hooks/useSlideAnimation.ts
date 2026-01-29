/**
 * @file Slide Animation Hook
 *
 * React hook for per-slide animation control in slideshow context.
 * Uses useLayoutEffect for synchronous DOM operations before paint.
 */

import { useCallback, useLayoutEffect, useRef } from "react";
import type { Timing } from "@oxen-office/pptx/domain/animation";
import type { ElementFinder } from "../../animation";
import { useAnimationPlayer } from "./useAnimationPlayer";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for useSlideAnimation hook
 */
export type UseSlideAnimationOptions = {
  /**
   * Current slide index (1-based)
   */
  readonly slideIndex: number;

  /**
   * Timing data for the current slide (undefined if no animations)
   */
  readonly timing: Timing | undefined;

  /**
   * Container element ref for finding animated shapes
   */
  readonly containerRef: React.RefObject<HTMLElement | null>;

  /**
   * Whether to auto-play animation when slide changes
   * @default true
   */
  readonly autoPlay?: boolean;

  /**
   * Callback when animation starts
   */
  readonly onStart?: () => void;

  /**
   * Callback when animation completes
   */
  readonly onComplete?: () => void;

  /**
   * Speed multiplier (1.0 = normal)
   * @default 1.0
   */
  readonly speed?: number;
};

/**
 * Return value of useSlideAnimation hook
 */
export type UseSlideAnimationResult = {
  /**
   * Whether animation is currently playing
   */
  readonly isAnimating: boolean;

  /**
   * Skip current animation (immediately show all shapes)
   */
  readonly skipAnimation: () => void;

  /**
   * Replay animation from the beginning
   */
  readonly replayAnimation: () => void;

  /**
   * Whether the slide has animations
   */
  readonly hasAnimations: boolean;
};

// =============================================================================
// Hook
// =============================================================================

/**
 * React hook for slide animation in slideshow context.
 *
 * Key improvements over previous version:
 * - Uses useLayoutEffect for synchronous DOM preparation before paint
 * - Eliminates setTimeout delays by using requestAnimationFrame properly
 * - Prevents flash of hidden content by hiding shapes before browser paint
 *
 * @example
 * ```tsx
 * function SlideshowPage({ slides, currentSlide }: Props) {
 *   const containerRef = useRef<HTMLDivElement>(null);
 *   const timing = slides[currentSlide - 1].timing;
 *
 *   const { isAnimating, skipAnimation } = useSlideAnimation({
 *     slideIndex: currentSlide,
 *     timing,
 *     containerRef,
 *   });
 *
 *   const handleClick = () => {
 *     if (isAnimating) {
 *       skipAnimation();
 *     } else {
 *       goToNextSlide();
 *     }
 *   };
 *
 *   return (
 *     <div ref={containerRef} onClick={handleClick}>
 *       <SlideContent />
 *     </div>
 *   );
 * }
 * ```
 */
export function useSlideAnimation(
  options: UseSlideAnimationOptions
): UseSlideAnimationResult {
  const {
    slideIndex,
    timing,
    containerRef,
    autoPlay = true,
    onStart,
    onComplete,
    speed = 1.0,
  } = options;

  // Track slide changes for animation reset
  const prevSlideRef = useRef(slideIndex);
  const hasPlayedRef = useRef(false);
  const pendingPlayRef = useRef(false);

  // Element finder that uses containerRef
  const findElement: ElementFinder = useCallback(
    (shapeId: string) => {
      if (!containerRef.current) {
        return null;
      }
      return containerRef.current.querySelector<HTMLElement | SVGElement>(
        `[data-ooxml-id="${shapeId}"]`
      );
    },
    [containerRef]
  );

  const { play, stop, showAll, hideAll, extractShapeIds, isPlaying } =
    useAnimationPlayer({
      findElement,
      onStart,
      onComplete,
      speed,
    });

  const hasAnimations = timing !== undefined;

  // useLayoutEffect runs synchronously after DOM mutations but before paint.
  // This is critical for:
  // 1. Hiding animated shapes BEFORE they are painted (no flash)
  // 2. Ensuring DOM elements exist before we try to animate them
  useLayoutEffect(() => {
    // Detect slide change
    const slideChanged = prevSlideRef.current !== slideIndex;
    if (slideChanged) {
      prevSlideRef.current = slideIndex;
      hasPlayedRef.current = false;
      pendingPlayRef.current = false;
      stop();
    }

    // No timing data - nothing to do
    if (!timing) {
      return;
    }

    // Already played or not auto-play
    if (hasPlayedRef.current || !autoPlay) {
      return;
    }

    // Get shape IDs and hide them synchronously before paint
    const shapeIds = extractShapeIds(timing);
    if (shapeIds.length === 0) {
      return;
    }

    // Hide all shapes synchronously (before browser paints)
    hideAll(shapeIds);
    pendingPlayRef.current = true;
  }, [slideIndex, timing, autoPlay, stop, hideAll, extractShapeIds]);

  // Start animation in a separate effect after the layout effect has hidden shapes
  // Using requestAnimationFrame to ensure we're in the next frame after hide
  useLayoutEffect(() => {
    if (!pendingPlayRef.current || !timing || hasPlayedRef.current) {
      return;
    }

    hasPlayedRef.current = true;
    pendingPlayRef.current = false;

    // Use double-RAF to ensure hide styles are committed before play
    // First RAF: styles are committed to CSSOM
    // Second RAF: next frame, safe to start transitions
    const rafIds = { first: 0, second: 0 };

    rafIds.first = requestAnimationFrame(() => {
      rafIds.second = requestAnimationFrame(() => {
        play(timing);
      });
    });

    return () => {
      cancelAnimationFrame(rafIds.first);
      cancelAnimationFrame(rafIds.second);
    };
  }, [timing, play]);

  // Cleanup on unmount
  useLayoutEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // Skip animation - show all shapes immediately
  const skipAnimation = useCallback(() => {
    if (!timing) {
      return;
    }
    stop();
    const shapeIds = extractShapeIds(timing);
    showAll(shapeIds);
  }, [timing, stop, showAll, extractShapeIds]);

  // Replay animation from the beginning
  const replayAnimation = useCallback(() => {
    if (!timing) {
      return;
    }
    stop();
    const shapeIds = extractShapeIds(timing);
    hideAll(shapeIds);
    hasPlayedRef.current = false;
    pendingPlayRef.current = true;

    // Trigger play in next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        hasPlayedRef.current = true;
        pendingPlayRef.current = false;
        play(timing);
      });
    });
  }, [timing, stop, hideAll, play, extractShapeIds]);

  return {
    isAnimating: isPlaying,
    skipAnimation,
    replayAnimation,
    hasAnimations,
  };
}
