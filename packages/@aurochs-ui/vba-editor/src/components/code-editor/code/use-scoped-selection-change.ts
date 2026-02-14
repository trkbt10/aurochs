/**
 * @file Scoped Selection Change Hook
 *
 * Listens to selectionchange events but only triggers callback
 * when the textarea is the active element. Prevents unnecessary
 * updates when other inputs on the page change selection.
 */

import { useEffect, type RefObject } from "react";

/**
 * Hook that listens to document selectionchange events,
 * but only calls the callback when the specified textarea is focused.
 *
 * @param textareaRef - Reference to the textarea element
 * @param onSelectionChange - Callback when selection changes in the textarea
 *
 * @example
 * ```tsx
 * useScopedSelectionChange(textareaRef, () => {
 *   updateCursorPosition();
 * });
 * ```
 */
export function useScopedSelectionChange(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  onSelectionChange: () => void
): void {
  useEffect(() => {
    const handleSelectionChange = () => {
      // Only trigger callback if our textarea is the active element
      if (document.activeElement === textareaRef.current) {
        onSelectionChange();
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [textareaRef, onSelectionChange]);
}
