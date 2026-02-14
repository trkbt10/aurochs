/**
 * @file Debounced History Hook
 *
 * Debounces history pushes to group rapid keystrokes into single undo units.
 */

import { useCallback, useEffect, useRef } from "react";
import type { VbaEditorAction } from "../../context/vba-editor/types";

// =============================================================================
// Types
// =============================================================================

export type UseDebouncedHistoryConfig = {
  /** Debounce delay in milliseconds */
  readonly debounceMs: number;
  /** Dispatch function for reducer actions */
  readonly dispatch: (action: VbaEditorAction) => void;
  /** Current module name */
  readonly moduleName: string | undefined;
};

export type UseDebouncedHistoryResult = {
  /**
   * Update source with debounced history push.
   * First keystroke in a batch creates an undo point, subsequent ones just update.
   */
  readonly updateSource: (source: string, cursorOffset: number) => void;
  /**
   * Flush pending state.
   * Call this before undo/redo operations.
   */
  readonly flush: () => void;
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook that debounces history pushes for text editing.
 *
 * Strategy:
 * - First keystroke in a batch: dispatch UPDATE_MODULE_SOURCE (creates undo point)
 * - Subsequent keystrokes within debounce window: dispatch REPLACE_MODULE_SOURCE (updates present only)
 * - After debounce timeout: reset batch state for next batch
 *
 * This ensures typing "abc" quickly creates one undo point, and undo reverts all three characters.
 *
 * @example
 * ```tsx
 * const { updateSource, flush } = useDebouncedHistory({
 *   debounceMs: 300,
 *   dispatch,
 *   moduleName: activeModule?.name,
 * });
 *
 * // On text change:
 * updateSource(newText, cursorOffset);
 *
 * // Before undo:
 * flush();
 * dispatch({ type: "UNDO" });
 * ```
 */
export function useDebouncedHistory({
  debounceMs,
  dispatch,
  moduleName,
}: UseDebouncedHistoryConfig): UseDebouncedHistoryResult {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const batchStartedRef = useRef(false);
  const moduleNameRef = useRef(moduleName);

  // Keep module name ref up to date
  moduleNameRef.current = moduleName;

  const flush = useCallback(() => {
    // Clear pending timer
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Reset batch state (changes are already committed to history)
    batchStartedRef.current = false;
  }, []);

  const updateSource = useCallback(
    (source: string, cursorOffset: number) => {
      if (moduleName === undefined) {
        return;
      }

      // Clear existing timer
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }

      if (!batchStartedRef.current) {
        // First keystroke in batch - create undo point
        batchStartedRef.current = true;
        dispatch({
          type: "UPDATE_MODULE_SOURCE",
          moduleName,
          source,
          cursorOffset,
        });
      } else {
        // Subsequent keystrokes - just update present (no new undo point)
        dispatch({
          type: "REPLACE_MODULE_SOURCE",
          moduleName,
          source,
          cursorOffset,
        });
      }

      // Schedule batch reset after debounce
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        batchStartedRef.current = false;
      }, debounceMs);
    },
    [debounceMs, dispatch, moduleName]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { updateSource, flush };
}
