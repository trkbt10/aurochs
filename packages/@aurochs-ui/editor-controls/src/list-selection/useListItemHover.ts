/**
 * @file List item hover hook
 *
 * Manages hover state for list items at the LIST level.
 * Ensures at most one item is hovered at any time.
 *
 * Key insight: Individual item-level hover state causes problems
 * when mouse events don't fire in expected sequence. By managing
 * hover at the list level, we guarantee the invariant.
 *
 * Generic over TId — works for slides (SlideId), PDF pages (number), etc.
 */

import { useCallback, useState } from "react";

export type ListItemHoverState<TId> = {
  /** ID of the currently hovered item, or null if none */
  readonly hoveredItemId: TId | null;
};

export type UseListItemHoverResult<TId> = {
  /** Current hover state */
  readonly hoverState: ListItemHoverState<TId>;
  /** Handle mouse enter on an item */
  readonly handleItemEnter: (id: TId) => void;
  /** Handle mouse leave from an item */
  readonly handleItemLeave: (id: TId) => void;
  /** Clear all hover state (e.g., when drag starts) */
  readonly clearHover: () => void;
  /** Check if a specific item is hovered */
  readonly isItemHovered: (id: TId) => boolean;
};

/**
 * Hook for managing list item hover state at the list level.
 *
 * Invariant: At most one item is hovered at any time.
 */
export function useListItemHover<TId>(): UseListItemHoverResult<TId> {
  const [hoverState, setHoverState] = useState<ListItemHoverState<TId>>({
    hoveredItemId: null,
  });

  const handleItemEnter = useCallback((id: TId) => {
    setHoverState({ hoveredItemId: id });
  }, []);

  const handleItemLeave = useCallback((id: TId) => {
    setHoverState((prev) => (prev.hoveredItemId === id ? { hoveredItemId: null } : prev));
  }, []);

  const clearHover = useCallback(() => {
    setHoverState({ hoveredItemId: null });
  }, []);

  const isItemHovered = useCallback(
    (id: TId) => hoverState.hoveredItemId === id,
    [hoverState.hoveredItemId],
  );

  return {
    hoverState,
    handleItemEnter,
    handleItemLeave,
    clearHover,
    isItemHovered,
  };
}
