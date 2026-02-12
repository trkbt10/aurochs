/**
 * @file Slide Animation Hook
 *
 * React hook for per-slide animation control in slideshow context.
 * Uses useLayoutEffect for synchronous DOM operations before paint.
 */

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { Timing } from "@aurochs-office/pptx/domain/animation";
import type { ClickGroup, ElementFinder } from "../../animation";
import { extractClickGroups } from "../../animation";
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
   * Enable step-by-step playback mode.
   * When true, animations are played one click group at a time via nextStep().
   * When false (default), all animations auto-play.
   * @default false
   */
  readonly stepMode?: boolean;

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

  // Step playback (only meaningful when stepMode=true)

  /**
   * Play the next animation step.
   * Returns true if a step was played, false if all steps are complete.
   */
  readonly nextStep: () => Promise<boolean>;

  /**
   * Current step index (0-based, -1 if not started)
   */
  readonly currentStep: number;

  /**
   * Total number of animation steps
   */
  readonly totalSteps: number;

  /**
   * Whether all animation steps are complete
   */
  readonly isStepsComplete: boolean;
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
export function useSlideAnimation(options: UseSlideAnimationOptions): UseSlideAnimationResult {
  const { slideIndex, timing, containerRef, autoPlay = true, stepMode = false, onStart, onComplete, speed = 1.0 } = options;

  // Track slide changes for animation reset
  const prevSlideRef = useRef(slideIndex);
  const hasPlayedRef = useRef(false);
  const pendingPlayRef = useRef(false);

  // Step playback state (managed locally, not in player)
  const [currentStep, setCurrentStep] = useState(-1);
  const clickGroupsRef = useRef<ClickGroup[]>([]);

  // Element finder that uses containerRef
  const findElement: ElementFinder = useCallback(
    (shapeId: string) => {
      if (!containerRef.current) {
        return null;
      }
      return containerRef.current.querySelector<HTMLElement | SVGElement>(`[data-ooxml-id="${shapeId}"]`);
    },
    [containerRef],
  );

  const { play, stop, showAll, hideAll, extractShapeIds, isPlaying, playNodes } = useAnimationPlayer({
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

      // Reset step state on slide change
      setCurrentStep(-1);
    }

    // No timing data - nothing to do
    if (!timing) {
      clickGroupsRef.current = [];
      return;
    }

    // Initialize step playback if in step mode
    if (stepMode) {
      clickGroupsRef.current = extractClickGroups(timing);

      // Hide all shapes initially
      const shapeIds = extractShapeIds(timing);
      if (shapeIds.length > 0) {
        hideAll(shapeIds);
      }
      return;
    }

    // Auto-play mode: Already played or not auto-play
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
  }, [slideIndex, timing, autoPlay, stepMode, stop, hideAll, extractShapeIds]);

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

    // Reset step state for replay
    if (stepMode) {
      setCurrentStep(-1);
      return;
    }

    // Trigger play in next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        hasPlayedRef.current = true;
        pendingPlayRef.current = false;
        play(timing);
      });
    });
  }, [timing, stop, hideAll, play, extractShapeIds, stepMode]);

  // Advance to next animation step (step mode only)
  const nextStep = useCallback(async (): Promise<boolean> => {
    if (!timing || !stepMode) {
      return false;
    }

    const clickGroups = clickGroupsRef.current;
    const nextIndex = currentStep + 1;

    // Check if we have more steps
    if (nextIndex >= clickGroups.length) {
      return false;
    }

    const group = clickGroups[nextIndex];
    setCurrentStep(nextIndex);
    await playNodes(group.nodes);
    return true;
  }, [timing, stepMode, currentStep, playNodes]);

  const totalSteps = clickGroupsRef.current.length;
  const isStepsComplete = stepMode ? currentStep >= totalSteps - 1 : true;

  return {
    isAnimating: isPlaying,
    skipAnimation,
    replayAnimation,
    hasAnimations,
    nextStep,
    currentStep,
    totalSteps,
    isStepsComplete,
  };
}
