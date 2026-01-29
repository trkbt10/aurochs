/**
 * @file Text composition handlers hook
 *
 * Manages IME composition lifecycle for the text editor.
 */

import { useCallback, type CompositionEvent, type Dispatch, type SetStateAction } from "react";
import type { CompositionState } from "./types";

type UseTextCompositionArgs = {
  readonly setComposition: Dispatch<SetStateAction<CompositionState>>;
  readonly initialCompositionState: CompositionState;
};

type UseTextCompositionResult = {
  readonly handleCompositionStart: (event: CompositionEvent<HTMLTextAreaElement>) => void;
  readonly handleCompositionUpdate: (event: CompositionEvent<HTMLTextAreaElement>) => void;
  readonly handleCompositionEnd: () => void;
};
















export function useTextComposition({
  setComposition,
  initialCompositionState,
}: UseTextCompositionArgs): UseTextCompositionResult {
  if (!setComposition) {
    throw new Error("useTextComposition requires setComposition.");
  }
  if (!initialCompositionState) {
    throw new Error("useTextComposition requires initialCompositionState.");
  }

  const handleCompositionStart = useCallback((e: CompositionEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    setComposition({
      isComposing: true,
      text: "",
      startOffset: textarea.selectionStart,
    });
  }, [setComposition]);

  const handleCompositionUpdate = useCallback((e: CompositionEvent<HTMLTextAreaElement>) => {
    setComposition((prev) => ({
      ...prev,
      text: e.data,
    }));
  }, [setComposition]);

  const handleCompositionEnd = useCallback(() => {
    setComposition(initialCompositionState);
  }, [setComposition, initialCompositionState]);

  return {
    handleCompositionStart,
    handleCompositionUpdate,
    handleCompositionEnd,
  };
}
