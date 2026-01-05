/**
 * @file Slide transition hook
 *
 * Provides slide transition effects based on PPTX transition data.
 * Implements proper PowerPoint-style transitions where the new slide
 * is revealed over the old slide via clip-path animation.
 *
 * Uses synchronous state calculation during render to prevent flash
 * of unstyled content before transition animation starts.
 *
 * @see ECMA-376 Part 1, Section 19.5 (Transitions)
 */

import { useLayoutEffect, useRef, useState, useCallback } from "react";
import type { SlideTransition, TransitionType } from "../../../domain";

/**
 * Options for the slide transition hook.
 */
export type UseSlideTransitionOptions = {
  /** Current slide index (1-based) */
  slideIndex: number;
  /** Current slide rendered content (SVG string) */
  currentContent: string;
  /** Transition data for the current slide */
  transition: SlideTransition | undefined;
  /** Callback when transition completes */
  onTransitionEnd?: () => void;
};

/**
 * Result of the slide transition hook.
 */
export type UseSlideTransitionResult = {
  /** Whether a transition is currently playing */
  isTransitioning: boolean;
  /** Previous slide content to show behind current during transition */
  previousContent: string | null;
  /** CSS class to apply to the new slide container */
  transitionClass: string;
  /** Transition duration in ms */
  transitionDuration: number;
  /** Skip the current transition */
  skipTransition: () => void;
};

/**
 * Map transition to CSS animation classes including direction/orientation modifiers.
 * @param transition - The slide transition data
 * @returns CSS class name(s) for the transition animation
 */
function getTransitionClass(transition: SlideTransition): string {
  const { type, direction, orientation, spokes, inOutDirection } = transition;

  // Base class for the transition type
  const baseClass = getBaseTransitionClass(type);

  // Add direction/orientation/spokes modifier if present
  if (direction) {
    // Direction: l, r, u, d, ld, lu, rd, ru
    return `${baseClass} ${baseClass}-${direction}`;
  }

  if (orientation) {
    // Orientation: horz, vert
    return `${baseClass} ${baseClass}-${orientation}`;
  }

  if (spokes !== undefined) {
    // Spokes: 1, 2, 3, 4, 8
    return `${baseClass} ${baseClass}-${spokes}`;
  }

  if (inOutDirection) {
    // In/Out direction: in, out
    return `${baseClass} ${baseClass}-${inOutDirection}`;
  }

  return baseClass;
}

/**
 * Get base CSS class for a transition type.
 */
function getBaseTransitionClass(type: TransitionType): string {
  switch (type) {
    case "fade":
      return "slide-transition-fade";
    case "push":
      return "slide-transition-push";
    case "wipe":
      return "slide-transition-wipe";
    case "blinds":
      return "slide-transition-blinds";
    case "dissolve":
      return "slide-transition-dissolve";
    case "circle":
      return "slide-transition-circle";
    case "diamond":
      return "slide-transition-diamond";
    case "split":
      return "slide-transition-split";
    case "zoom":
      return "slide-transition-zoom";
    case "cover":
      return "slide-transition-cover";
    case "pull":
      return "slide-transition-pull";
    case "cut":
      return "slide-transition-cut";
    case "checker":
      return "slide-transition-checker";
    case "comb":
      return "slide-transition-comb";
    case "wheel":
      return "slide-transition-wheel";
    case "wedge":
      return "slide-transition-wedge";
    case "plus":
      return "slide-transition-plus";
    case "newsflash":
      return "slide-transition-newsflash";
    case "random":
      return "slide-transition-random";
    case "randomBar":
      return "slide-transition-randombar";
    case "strips":
      return "slide-transition-strips";
    default:
      return "slide-transition-fade";
  }
}

/**
 * Hook to manage slide transition effects.
 *
 * Returns both the previous slide content and transition state,
 * allowing the component to render both slides during transition
 * with the new slide revealed via clip-path animation.
 */
export function useSlideTransition(
  options: UseSlideTransitionOptions,
): UseSlideTransitionResult {
  const { slideIndex, currentContent, transition, onTransitionEnd } = options;
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousContent, setPreviousContent] = useState<string | null>(null);
  const [transitionClass, setTransitionClass] = useState("");
  const [transitionDuration, setTransitionDuration] = useState(500);

  const previousSlideRef = useRef(slideIndex);
  const previousContentRef = useRef(currentContent);
  const timeoutRef = useRef<number | undefined>(undefined);

  const skipTransition = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    setIsTransitioning(false);
    setPreviousContent(null);
    setTransitionClass("");
    onTransitionEnd?.();
  }, [onTransitionEnd]);

  useEffect(() => {
    // Only trigger transition when slide actually changes
    if (previousSlideRef.current === slideIndex) {
      // Update content ref for next transition
      previousContentRef.current = currentContent;
      return;
    }

    // Store previous content before updating
    const oldContent = previousContentRef.current;
    previousSlideRef.current = slideIndex;
    previousContentRef.current = currentContent;

    // No transition for this slide or first slide
    if (!transition || transition.type === "none" || transition.type === "cut") {
      return;
    }

    // Start transition
    const duration = transition.duration ?? 500;
    const cssClass = getTransitionClass(transition);

    setPreviousContent(oldContent);
    setTransitionClass(cssClass);
    setTransitionDuration(duration);
    setIsTransitioning(true);

    // End transition after duration
    timeoutRef.current = window.setTimeout(() => {
      setIsTransitioning(false);
      setPreviousContent(null);
      setTransitionClass("");
      onTransitionEnd?.();
    }, duration);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [slideIndex, currentContent, transition, onTransitionEnd]);

  return {
    isTransitioning,
    previousContent,
    transitionClass,
    transitionDuration,
    skipTransition,
  };
}
