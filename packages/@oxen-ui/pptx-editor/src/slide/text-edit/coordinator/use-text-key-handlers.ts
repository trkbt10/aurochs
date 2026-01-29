/**
 * @file Text key handlers hook
 *
 * Manages key interactions for confirming or cancelling edits.
 */

import { useCallback, type KeyboardEvent, type MutableRefObject } from "react";

type UseTextKeyHandlersArgs = {
  readonly isComposing: boolean;
  readonly onCancel: () => void;
  readonly finishedRef: MutableRefObject<boolean>;
};

type UseTextKeyHandlersResult = {
  readonly handleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
};
















export function useTextKeyHandlers({
  isComposing,
  onCancel,
  finishedRef,
}: UseTextKeyHandlersArgs): UseTextKeyHandlersResult {
  if (onCancel === undefined) {
    throw new Error("useTextKeyHandlers requires onCancel.");
  }
  if (finishedRef === undefined) {
    throw new Error("useTextKeyHandlers requires finishedRef.");
  }

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (isComposing) {
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        finishedRef.current = true;
        onCancel();
      }
    },
    [finishedRef, isComposing, onCancel],
  );

  return { handleKeyDown };
}
