/**
 * @file Item key navigation hook
 *
 * Handles Arrow key navigation with Shift extension for selection
 * in ordered item lists (slides, pages, sheets, etc.).
 */

import { useCallback, useEffect } from "react";
import type { ItemSelectionState, ItemWithId } from "@aurochs-ui/editor-core/item-selection";

/**
 * Scroll/navigation orientation.
 */
export type ListOrientation = "vertical" | "horizontal";

export type UseItemKeyNavigationOptions<TId> = {
  /** Items array */
  readonly items: readonly ItemWithId<TId>[];
  /** Current selection state */
  readonly selection: ItemSelectionState<TId>;
  /** Scroll orientation */
  readonly orientation: ListOrientation;
  /** Navigate to an item */
  readonly onNavigate: (id: TId, index: number) => void;
  /** Extend selection range */
  readonly onExtendSelection: (fromIndex: number, toIndex: number) => void;
  /** Whether keyboard navigation is enabled */
  readonly enabled?: boolean;
  /** Container element ref for focus scope */
  readonly containerRef?: React.RefObject<HTMLElement | null>;
};

export type UseItemKeyNavigationResult = {
  /** Key down handler to attach to container */
  readonly handleKeyDown: (event: React.KeyboardEvent) => void;
};

type KeyDownEventLike = {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  preventDefault: () => void;
};

function getCurrentIndex<TId>(items: readonly ItemWithId<TId>[], selection: ItemSelectionState<TId>): number {
  if (selection.primaryId !== undefined) {
    const idx = items.findIndex((s) => s.id === selection.primaryId);
    if (idx !== -1) { return idx; }
  }
  return 0;
}

function isNavigationKey(key: string, orientation: ListOrientation): { isNext: boolean; isPrev: boolean } {
  if (orientation === "vertical") {
    return { isNext: key === "ArrowDown", isPrev: key === "ArrowUp" };
  }
  return { isNext: key === "ArrowRight", isPrev: key === "ArrowLeft" };
}

/**
 * Hook for keyboard navigation in item lists.
 * Supports arrow keys, Home/End, and Shift+arrow for range selection.
 */
export function useItemKeyNavigation<TId>(options: UseItemKeyNavigationOptions<TId>): UseItemKeyNavigationResult {
  const { items, selection, orientation, onNavigate, onExtendSelection, enabled = true, containerRef } = options;

  const handleKey = useCallback(
    (event: KeyDownEventLike) => {
      if (!enabled || items.length === 0) { return; }

      const { isNext, isPrev } = isNavigationKey(event.key, orientation);

      if (!isNext && !isPrev) {
        if (event.key === "Home") {
          event.preventDefault();
          if (event.shiftKey && selection.anchorIndex !== undefined) {
            onExtendSelection(selection.anchorIndex, 0);
          } else {
            onNavigate(items[0].id, 0);
          }
          return;
        }
        if (event.key === "End") {
          event.preventDefault();
          const lastIndex = items.length - 1;
          if (event.shiftKey && selection.anchorIndex !== undefined) {
            onExtendSelection(selection.anchorIndex, lastIndex);
          } else {
            onNavigate(items[lastIndex].id, lastIndex);
          }
          return;
        }
        return;
      }

      event.preventDefault();

      const currentIndex = getCurrentIndex(items, selection);
      const newIndex = isNext ? Math.min(currentIndex + 1, items.length - 1) : Math.max(currentIndex - 1, 0);

      if (newIndex === currentIndex) { return; }

      if (event.shiftKey) {
        const anchor = selection.anchorIndex ?? currentIndex;
        onExtendSelection(anchor, newIndex);
      } else {
        onNavigate(items[newIndex].id, newIndex);
      }
    },
    [enabled, items, orientation, selection, onNavigate, onExtendSelection],
  );

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => handleKey(event), [handleKey]);

  useEffect(() => {
    if (!enabled || !containerRef?.current) { return; }

    const container = containerRef.current;

    function handleGlobalKeyDown(event: KeyboardEvent) {
      if (!container.contains(document.activeElement)) { return; }

      const { isNext, isPrev } = isNavigationKey(event.key, orientation);
      const isNavKey = isNext || isPrev || event.key === "Home" || event.key === "End";

      if (isNavKey) {
        handleKey(event);
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [enabled, containerRef, orientation, handleKey]);

  return { handleKeyDown };
}
