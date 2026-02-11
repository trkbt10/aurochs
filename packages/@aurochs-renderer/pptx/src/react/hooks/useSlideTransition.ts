/**
 * @file Slide transition hook
 *
 * Provides slide transition effects based on PPTX transition data.
 * Implements proper PowerPoint-style transitions where the new slide
 * is revealed over the old slide via clip-path animation.
 *
 * Uses the animation/effects.ts system (MS-OE376 Part 4 Section 4.6.3)
 * for proper ECMA-376 compliant transitions.
 *
 * @see ECMA-376 Part 1, Section 19.5 (Transitions)
 * @see MS-OE376 Part 4 Section 4.6.3 (Animation Effects)
 */

import { useLayoutEffect, useRef, useCallback, useState } from "react";
import { flushSync } from "react-dom";
import type { SlideTransition, TransitionType, TransitionEightDirectionType } from "@aurochs-office/pptx/domain";
import type { EffectType, EffectDirection } from "@aurochs-office/pptx/domain/animation";
import type { EffectConfig } from "../../animation/types";
import { applyEffect, resetElementStyles } from "../../animation/effects";

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
  /** Ref to the container element where transition is applied */
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
  /** CSS class to apply to the new slide container (deprecated, always empty) */
  transitionClass: string;
  /** Transition duration in ms */
  transitionDuration: number;
  /** Skip the current transition */
  skipTransition: () => void;
};

// =============================================================================
// Transition to Effect Mapping
// =============================================================================

/**
 * Map PPTX TransitionType to animation EffectType.
 *
 * @see ECMA-376 Part 1, Section 19.7.27 (ST_TransitionType)
 * @see MS-OE376 Part 4 Section 4.6.3 (Effect Filters)
 */
function mapTransitionToEffectType(type: TransitionType): EffectType {
  const mapping: Partial<Record<TransitionType, EffectType>> = {
    fade: "fade",
    dissolve: "dissolve",
    wipe: "wipe",
    blinds: "blinds",
    checker: "checkerboard",
    circle: "circle",
    diamond: "diamond",
    plus: "plus",
    wheel: "wheel",
    wedge: "wedge",
    strips: "strips",
    randomBar: "randombar",
    // push/cover/pull map to slide effect
    push: "slide",
    cover: "slide",
    pull: "slide",
    // split maps to barn (similar door effect)
    split: "barn",
    // zoom maps to box (expand/contract)
    zoom: "box",
    // comb is similar to blinds
    comb: "blinds",
  };

  return mapping[type] ?? "fade";
}

/**
 * Options for mapping transition direction.
 */
type MapDirectionOptions = {
  type: TransitionType;
  direction?: TransitionEightDirectionType;
  orientation?: "horz" | "vert";
  inOutDirection?: "in" | "out";
};

/**
 * Map PPTX direction to animation EffectDirection.
 *
 * @see ECMA-376 Part 1, Section 19.7.51 (ST_TransitionEightDirectionType)
 */
function mapTransitionDirection(options: MapDirectionOptions): EffectDirection {
  const { type, direction, orientation, inOutDirection } = options;
  // Handle orientation-based transitions (blinds, checker, comb, randomBar)
  if (orientation) {
    return orientation === "horz" ? "horizontal" : "vertical";
  }

  // Handle in/out transitions (split, zoom)
  if (inOutDirection) {
    if (type === "split") {
      // split maps to barn effect
      return inOutDirection === "in" ? "inHorizontal" : "outHorizontal";
    }
    return inOutDirection;
  }

  // Handle directional transitions
  if (direction) {
    const dirMapping: Record<TransitionEightDirectionType, EffectDirection> = {
      l: "left",
      r: "right",
      u: "up",
      d: "down",
      ld: "downLeft",
      lu: "upLeft",
      rd: "downRight",
      ru: "upRight",
    };
    return dirMapping[direction];
  }

  // Default direction based on effect type
  const defaults: Partial<Record<EffectType, EffectDirection>> = {
    wipe: "right",
    slide: "left",
    blinds: "horizontal",
    checkerboard: "across",
    box: "in",
    circle: "in",
    diamond: "in",
    plus: "in",
    barn: "inHorizontal",
    randombar: "horizontal",
    strips: "downRight",
  };

  const effectType = mapTransitionToEffectType(type);
  return defaults[effectType] ?? "in";
}

/**
 * Create EffectConfig from SlideTransition.
 */
function createEffectConfig(transition: SlideTransition): EffectConfig {
  const effectType = mapTransitionToEffectType(transition.type);
  const direction = mapTransitionDirection({
    type: transition.type,
    direction: transition.direction,
    orientation: transition.orientation,
    inOutDirection: transition.inOutDirection,
  });

  return {
    type: effectType,
    duration: transition.duration ?? 500,
    direction,
    entrance: true,
    easing: "ease-out",
  };
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Internal state for synchronous transition tracking.
 */
type TransitionState = {
  isTransitioning: boolean;
  previousContent: string | null;
  transitionDuration: number;
  previousSlideIndex: number;
  previousContentValue: string;
  effectConfig: EffectConfig | null;
};

/**
 * Hook to manage slide transition effects.
 *
 * Uses the animation/effects.ts system for proper ECMA-376 compliant
 * visual effects. Applies CSS transitions directly to elements instead
 * of using CSS animation classes.
 *
 * Key design:
 * - Uses refs for synchronous state calculation during render phase
 * - Applies effects via applyEffect() from animation/effects.ts
 * - Uses transitionend event for accurate transition end detection
 */
export function useSlideTransition(options: UseSlideTransitionOptions): UseSlideTransitionResult {
  const { slideIndex, currentContent, transition, containerRef, onTransitionEnd } = options;

  // Ref for synchronous state tracking
  const stateRef = useRef<TransitionState>({
    isTransitioning: false,
    previousContent: null,
    transitionDuration: 500,
    previousSlideIndex: slideIndex,
    previousContentValue: currentContent,
    effectConfig: null,
  });

  // State trigger for re-render when transition ends
  const [, setRenderTrigger] = useState(0);

  // Detect slide change DURING RENDER (synchronously)
  const slideChanged = stateRef.current.previousSlideIndex !== slideIndex;

  if (slideChanged) {
    const oldContent = stateRef.current.previousContentValue;
    const shouldTransition = transition && transition.type !== "none" && transition.type !== "cut";

    if (shouldTransition) {
      const effectConfig = createEffectConfig(transition);
      stateRef.current = {
        isTransitioning: true,
        previousContent: oldContent,
        transitionDuration: effectConfig.duration,
        previousSlideIndex: slideIndex,
        previousContentValue: currentContent,
        effectConfig,
      };
    } else {
      stateRef.current = {
        isTransitioning: false,
        previousContent: null,
        transitionDuration: 500,
        previousSlideIndex: slideIndex,
        previousContentValue: currentContent,
        effectConfig: null,
      };
    }
  } else if (stateRef.current.previousContentValue !== currentContent) {
    stateRef.current.previousContentValue = currentContent;
  }

  const { isTransitioning, previousContent, transitionDuration, effectConfig } = stateRef.current;

  // Apply effect and handle transition end
  useLayoutEffect(() => {
    if (!isTransitioning || !effectConfig) {
      return;
    }

    const container = containerRef?.current;
    if (!container) {
      return;
    }

    // Apply the effect using the animation system
    applyEffect(container, effectConfig);

    // End transition handler
    const endTransition = () => {
      // Reset element styles after transition
      resetElementStyles(container);

      stateRef.current = {
        ...stateRef.current,
        isTransitioning: false,
        previousContent: null,
        effectConfig: null,
      };

      flushSync(() => {
        setRenderTrigger((n) => n + 1);
      });
      onTransitionEnd?.();
    };

    // Use transitionend event for precise timing
    const handleTransitionEnd = (e: TransitionEvent) => {
      // Only handle transitions on this element
      if (e.target === container) {
        endTransition();
      }
    };

    container.addEventListener("transitionend", handleTransitionEnd);

    // Fallback timeout in case transitionend doesn't fire
    const timeoutId = setTimeout(() => {
      endTransition();
    }, transitionDuration + 100);

    return () => {
      container.removeEventListener("transitionend", handleTransitionEnd);
      clearTimeout(timeoutId);
    };
  }, [isTransitioning, effectConfig, transitionDuration, containerRef, onTransitionEnd]);

  // Skip transition callback
  const skipTransition = useCallback(() => {
    const container = containerRef?.current;
    if (container) {
      resetElementStyles(container);
    }

    stateRef.current = {
      ...stateRef.current,
      isTransitioning: false,
      previousContent: null,
      effectConfig: null,
    };

    flushSync(() => {
      setRenderTrigger((n) => n + 1);
    });
    onTransitionEnd?.();
  }, [containerRef, onTransitionEnd]);

  return {
    isTransitioning,
    previousContent,
    transitionClass: "", // Deprecated - no longer using CSS classes
    transitionDuration,
    skipTransition,
  };
}
