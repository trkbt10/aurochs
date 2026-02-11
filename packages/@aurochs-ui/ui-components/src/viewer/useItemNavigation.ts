/**
 * @file useItemNavigation
 *
 * Hook for managing navigation state in viewers.
 * Works for slides, pages, sheets, or any indexed items.
 */

import { useState, useCallback, useMemo } from "react";

export type UseItemNavigationOptions = {
  /** Total number of items */
  readonly totalItems: number;
  /** Initial item index (0-based, default: 0) */
  readonly initialIndex?: number;
  /** Callback when item changes */
  readonly onItemChange?: (index: number) => void;
};

export type ItemNavigationResult = {
  /** Current item index (0-based) */
  readonly currentIndex: number;
  /** Current item number (1-based) */
  readonly currentNumber: number;
  /** Total number of items */
  readonly totalItems: number;
  /** Whether at first item */
  readonly isFirst: boolean;
  /** Whether at last item */
  readonly isLast: boolean;
  /** Go to next item */
  readonly goToNext: () => void;
  /** Go to previous item */
  readonly goToPrev: () => void;
  /** Go to first item */
  readonly goToFirst: () => void;
  /** Go to last item */
  readonly goToLast: () => void;
  /** Go to specific item by index (0-based) */
  readonly goToIndex: (index: number) => void;
  /** Go to specific item by number (1-based) */
  readonly goToNumber: (number: number) => void;
};

/**
 * Hook for managing navigation through indexed items.
 *
 * @example
 * ```tsx
 * const nav = useItemNavigation({
 *   totalItems: pages.length,
 *   initialIndex: 0,
 *   onItemChange: (index) => console.log("Page:", index + 1),
 * });
 *
 * <button onClick={nav.goToPrev} disabled={nav.isFirst}>Prev</button>
 * <span>{nav.currentNumber} / {nav.totalItems}</span>
 * <button onClick={nav.goToNext} disabled={nav.isLast}>Next</button>
 * ```
 */
export function useItemNavigation({
  totalItems,
  initialIndex = 0,
  onItemChange,
}: UseItemNavigationOptions): ItemNavigationResult {
  const [currentIndex, setCurrentIndex] = useState(() => {
    return Math.max(0, Math.min(totalItems - 1, initialIndex));
  });

  const goToIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(totalItems - 1, index));
      setCurrentIndex(clamped);
      onItemChange?.(clamped);
    },
    [totalItems, onItemChange],
  );

  const goToNumber = useCallback(
    (number: number) => {
      goToIndex(number - 1);
    },
    [goToIndex],
  );

  const goToNext = useCallback(() => {
    goToIndex(currentIndex + 1);
  }, [currentIndex, goToIndex]);

  const goToPrev = useCallback(() => {
    goToIndex(currentIndex - 1);
  }, [currentIndex, goToIndex]);

  const goToFirst = useCallback(() => {
    goToIndex(0);
  }, [goToIndex]);

  const goToLast = useCallback(() => {
    goToIndex(totalItems - 1);
  }, [totalItems, goToIndex]);

  const derived = useMemo(
    () => ({
      currentNumber: currentIndex + 1,
      isFirst: currentIndex <= 0,
      isLast: currentIndex >= totalItems - 1,
    }),
    [currentIndex, totalItems],
  );

  return {
    currentIndex,
    totalItems,
    ...derived,
    goToNext,
    goToPrev,
    goToFirst,
    goToLast,
    goToIndex,
    goToNumber,
  };
}
