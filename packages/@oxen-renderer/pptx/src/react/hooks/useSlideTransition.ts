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

import { useLayoutEffect, useRef, useCallback, useState } from "react";
import { flushSync } from "react-dom";
import type { SlideTransition, TransitionType } from "@oxen-office/pptx/domain";

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
  /** Ref to the container element where transition class is applied */
  containerRef?: React.RefObject<HTMLElement | null>;
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
 * Internal state for synchronous transition tracking.
 * Using a ref allows us to update state during render without triggering loops.
 */
type TransitionState = {
  isTransitioning: boolean;
  previousContent: string | null;
  transitionClass: string;
  transitionDuration: number;
  previousSlideIndex: number;
  previousContentValue: string;
};

/**
 * Hook to manage slide transition effects.
 *
 * Key design: Uses refs for synchronous state calculation during render phase
 * to ensure transition classes are applied BEFORE the first paint.
 * This prevents the flash of unstyled content that would occur
 * if we used useEffect (which runs after paint).
 *
 * Uses:
 * - Refs for synchronous state tracking during render
 * - useState trigger for re-renders when transition ends
 * - animationend event for accurate transition end detection (no setTimeout delay)
 * - flushSync for synchronous state updates when needed
 *
 * Returns both the previous slide content and transition state,
 * allowing the component to render both slides during transition
 * with the new slide revealed via clip-path animation.
 */
export function useSlideTransition(
  options: UseSlideTransitionOptions,
): UseSlideTransitionResult {
  const { slideIndex, currentContent, transition, containerRef, onTransitionEnd } = options;

  // Ref for synchronous state tracking (survives across renders)
  const stateRef = useRef<TransitionState>({
    isTransitioning: false,
    previousContent: null,
    transitionClass: "",
    transitionDuration: 500,
    previousSlideIndex: slideIndex,
    previousContentValue: currentContent,
  });

  // State trigger for re-render when transition ends
  const [, setRenderTrigger] = useState(0);

  // Detect slide change DURING RENDER (synchronously)
  // This ensures transition state is set before first paint
  const slideChanged = stateRef.current.previousSlideIndex !== slideIndex;

  if (slideChanged) {
    // Store previous content before updating
    const oldContent = stateRef.current.previousContentValue;

    // Check if we should transition
    const shouldTransition =
      transition &&
      transition.type !== "none" &&
      transition.type !== "cut";

    if (shouldTransition) {
      // Set transition state synchronously - used in this render
      stateRef.current = {
        isTransitioning: true,
        previousContent: oldContent,
        transitionClass: getTransitionClass(transition),
        transitionDuration: transition.duration ?? 500,
        previousSlideIndex: slideIndex,
        previousContentValue: currentContent,
      };
    } else {
      // No transition - just update refs
      stateRef.current = {
        isTransitioning: false,
        previousContent: null,
        transitionClass: "",
        transitionDuration: 500,
        previousSlideIndex: slideIndex,
        previousContentValue: currentContent,
      };
    }
  } else if (stateRef.current.previousContentValue !== currentContent) {
    // Update content ref if slide hasn't changed (content re-render)
    stateRef.current.previousContentValue = currentContent;
  }

  // Extract current values (computed synchronously during render)
  const { isTransitioning, previousContent, transitionClass, transitionDuration } = stateRef.current;

  // Handle transition end via animationend event
  useLayoutEffect(() => {
    if (!isTransitioning) {
      return;
    }

    const container = containerRef?.current;

    // End transition handler - uses flushSync for immediate re-render
    const endTransition = () => {
      stateRef.current = {
        ...stateRef.current,
        isTransitioning: false,
        previousContent: null,
        transitionClass: "",
      };
      // Use flushSync to ensure synchronous re-render
      flushSync(() => {
        setRenderTrigger((n) => n + 1);
      });
      onTransitionEnd?.();
    };

    // If we have a container ref, use animationend event for precise timing
    if (container) {
      const handleAnimationEnd = (e: AnimationEvent) => {
        // Only handle our transition animations
        if (e.animationName.startsWith("transition-")) {
          endTransition();
        }
      };

      container.addEventListener("animationend", handleAnimationEnd);
      return () => {
        container.removeEventListener("animationend", handleAnimationEnd);
      };
    }

    // Fallback: use requestAnimationFrame-based timing for accuracy
    // This is more accurate than setTimeout as it's tied to frame timing
    const startTime = performance.now();
    let rafId: number;

    const checkEnd = () => {
      if (performance.now() - startTime >= transitionDuration) {
        endTransition();
      } else {
        rafId = requestAnimationFrame(checkEnd);
      }
    };

    rafId = requestAnimationFrame(checkEnd);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isTransitioning, transitionDuration, containerRef, onTransitionEnd]);

  // Skip transition callback
  const skipTransition = useCallback(() => {
    stateRef.current = {
      ...stateRef.current,
      isTransitioning: false,
      previousContent: null,
      transitionClass: "",
    };
    flushSync(() => {
      setRenderTrigger((n) => n + 1);
    });
    onTransitionEnd?.();
  }, [onTransitionEnd]);

  // Return current state (computed synchronously during render)
  return {
    isTransitioning,
    previousContent,
    transitionClass,
    transitionDuration,
    skipTransition,
  };
}
