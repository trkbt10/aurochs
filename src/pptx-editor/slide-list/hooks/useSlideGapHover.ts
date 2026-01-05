/**
 * @file Slide gap hover hook
 *
 * Manages hover state for the "+" button between slides.
 */

import { useCallback, useState } from "react";
import type { GapHoverState } from "../types";

export type UseSlideGapHoverResult = {
  /** Current gap hover state */
  readonly gapHoverState: GapHoverState;
  /** Handle mouse enter on a gap */
  readonly handleGapEnter: (index: number) => void;
  /** Handle mouse leave from a gap */
  readonly handleGapLeave: () => void;
  /** Check if a gap is hovered */
  readonly isGapHovered: (index: number) => boolean;
};

/**
 * Hook for managing gap hover state
 */
export function useSlideGapHover(): UseSlideGapHoverResult {
  const [gapHoverState, setGapHoverState] = useState<GapHoverState>({
    hoveredGapIndex: null,
  });

  const handleGapEnter = useCallback((index: number) => {
    setGapHoverState({ hoveredGapIndex: index });
  }, []);

  const handleGapLeave = useCallback(() => {
    setGapHoverState({ hoveredGapIndex: null });
  }, []);

  const isGapHovered = useCallback(
    (index: number) => gapHoverState.hoveredGapIndex === index,
    [gapHoverState.hoveredGapIndex]
  );

  return {
    gapHoverState,
    handleGapEnter,
    handleGapLeave,
    isGapHovered,
  };
}
