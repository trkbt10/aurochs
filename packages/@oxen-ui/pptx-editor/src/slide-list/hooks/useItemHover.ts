/**
 * @file Item hover state hook
 *
 * Manages hover state for slide list items with drag awareness.
 * Uses pure logic from item-hover-logic.ts for testability.
 */

import { useState, useCallback, useEffect } from "react";
import {
  createInitialHoverState,
  hoverReducer,
  type ItemHoverState,
} from "./item-hover-logic";

export type UseItemHoverOptions = {
  /** Whether any drag operation is active (this item or others) */
  isDragging: boolean;
};

export type UseItemHoverResult = {
  /** Current hover state */
  isHovered: boolean;
  /** Handler for mouse enter */
  onMouseEnter: () => void;
  /** Handler for mouse leave */
  onMouseLeave: () => void;
  /** Handler for drag start - clears hover before delegating */
  onDragStart: <E extends React.DragEvent>(
    e: E,
    originalHandler?: (e: E) => void
  ) => void;
  /** Force clear hover state */
  clearHover: () => void;
};

/**
 * Hook for managing hover state with drag awareness
 *
 * Key behaviors:
 * 1. Sets hover on mouse enter, clears on mouse leave
 * 2. Clears hover when isDragging becomes true
 * 3. Clears hover on drag start (before drag begins)
 * 4. Provides clearHover for manual control
 */
export function useItemHover({
  isDragging,
}: UseItemHoverOptions): UseItemHoverResult {
  const [state, setState] = useState<ItemHoverState>(createInitialHoverState);

  // Clear hover when any drag operation starts
  useEffect(() => {
    setState((prev) =>
      hoverReducer(prev, { type: "dragStateChanged", isDragging })
    );
  }, [isDragging]);

  const onMouseEnter = useCallback(() => {
    setState((prev) => hoverReducer(prev, { type: "mouseEnter" }));
  }, []);

  const onMouseLeave = useCallback(() => {
    setState((prev) => hoverReducer(prev, { type: "mouseLeave" }));
  }, []);

  const onDragStart = useCallback(
    <E extends React.DragEvent>(e: E, originalHandler?: (e: E) => void) => {
      setState((prev) => hoverReducer(prev, { type: "dragStart" }));
      originalHandler?.(e);
    },
    []
  );

  const clearHover = useCallback(() => {
    setState((prev) => hoverReducer(prev, { type: "clearHover" }));
  }, []);

  return {
    isHovered: state.isHovered,
    onMouseEnter,
    onMouseLeave,
    onDragStart,
    clearHover,
  };
}
