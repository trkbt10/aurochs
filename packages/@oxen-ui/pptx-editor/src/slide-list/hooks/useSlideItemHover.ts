/**
 * @file Slide item hover hook
 *
 * Manages hover state for slide items at the LIST level.
 * Ensures at most one item is hovered at any time.
 *
 * Key insight: Individual item-level hover state causes problems
 * when mouse events don't fire in expected sequence. By managing
 * hover at the list level, we guarantee the invariant.
 */

import { useCallback, useState } from "react";
import type { SlideId } from "@oxen/pptx/app";

export type SlideItemHoverState = {
  /** ID of the currently hovered slide, or null if none */
  readonly hoveredSlideId: SlideId | null;
};

export type UseSlideItemHoverResult = {
  /** Current hover state */
  readonly hoverState: SlideItemHoverState;
  /** Handle mouse enter on a slide item */
  readonly handleItemEnter: (slideId: SlideId) => void;
  /** Handle mouse leave from a slide item */
  readonly handleItemLeave: (slideId: SlideId) => void;
  /** Clear all hover state (e.g., when drag starts) */
  readonly clearHover: () => void;
  /** Check if a specific slide is hovered */
  readonly isItemHovered: (slideId: SlideId) => boolean;
};

/**
 * Hook for managing slide item hover state at the list level.
 *
 * Invariant: At most one slide is hovered at any time.
 */
export function useSlideItemHover(): UseSlideItemHoverResult {
  const [hoverState, setHoverState] = useState<SlideItemHoverState>({
    hoveredSlideId: null,
  });

  const handleItemEnter = useCallback((slideId: SlideId) => {
    // Setting new hovered ID automatically clears previous
    setHoverState({ hoveredSlideId: slideId });
  }, []);

  const handleItemLeave = useCallback((slideId: SlideId) => {
    // Only clear if this is the currently hovered item
    // This prevents race conditions where leave fires after enter on next item
    setHoverState((prev) =>
      prev.hoveredSlideId === slideId ? { hoveredSlideId: null } : prev
    );
  }, []);

  const clearHover = useCallback(() => {
    setHoverState({ hoveredSlideId: null });
  }, []);

  const isItemHovered = useCallback(
    (slideId: SlideId) => hoverState.hoveredSlideId === slideId,
    [hoverState.hoveredSlideId]
  );

  return {
    hoverState,
    handleItemEnter,
    handleItemLeave,
    clearHover,
    isItemHovered,
  };
}
