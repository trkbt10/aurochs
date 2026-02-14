/**
 * @file Code composition hook for IME support
 *
 * Manages IME composition lifecycle for the VBA code editor.
 */

import {
  useCallback,
  type CompositionEvent,
  type Dispatch,
  type SetStateAction,
} from "react";

// =============================================================================
// Types
// =============================================================================

/**
 * IME composition state.
 */
export type CompositionState = {
  /** Whether currently in IME composition mode */
  readonly isComposing: boolean;
  /** Temporary composition text */
  readonly text: string;
  /** Offset where composition started */
  readonly startOffset: number;
};

/**
 * Initial composition state.
 */
export const INITIAL_COMPOSITION_STATE: CompositionState = {
  isComposing: false,
  text: "",
  startOffset: 0,
};

// =============================================================================
// Hook
// =============================================================================

type UseCodeCompositionArgs = {
  readonly setComposition: Dispatch<SetStateAction<CompositionState>>;
};

type UseCodeCompositionResult = {
  readonly handleCompositionStart: (event: CompositionEvent<HTMLTextAreaElement>) => void;
  readonly handleCompositionUpdate: (event: CompositionEvent<HTMLTextAreaElement>) => void;
  readonly handleCompositionEnd: () => void;
};

/**
 * Hook for managing IME composition lifecycle in code editor.
 *
 * During composition:
 * - `isComposing` is true
 * - Cursor updates should be skipped
 * - Key handlers should not process input
 */
export function useCodeComposition({
  setComposition,
}: UseCodeCompositionArgs): UseCodeCompositionResult {
  const handleCompositionStart = useCallback(
    (e: CompositionEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget;
      setComposition({
        isComposing: true,
        text: "",
        startOffset: textarea.selectionStart,
      });
    },
    [setComposition]
  );

  const handleCompositionUpdate = useCallback(
    (e: CompositionEvent<HTMLTextAreaElement>) => {
      setComposition((prev) => ({
        ...prev,
        text: e.data,
      }));
    },
    [setComposition]
  );

  const handleCompositionEnd = useCallback(() => {
    setComposition(INITIAL_COMPOSITION_STATE);
  }, [setComposition]);

  return {
    handleCompositionStart,
    handleCompositionUpdate,
    handleCompositionEnd,
  };
}
