/**
 * @file Sheet tab keyboard hook
 *
 * Handles keyboard shortcuts for sheet tab navigation.
 * - Cmd/Ctrl + 1-9: Switch to sheet by number
 */

import { useEffect } from "react";

export type UseSheetTabKeyboardOptions = {
  readonly sheetCount: number;
  readonly activeSheetIndex: number | undefined;
  readonly onSelectSheet: (index: number) => void;
};

/**
 * Hook for managing sheet tab keyboard shortcuts
 */
export function useSheetTabKeyboard(options: UseSheetTabKeyboardOptions): void {
  const { sheetCount, onSelectSheet } = options;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) {
        return;
      }

      const key = e.key;
      const numKey = Number.parseInt(key, 10);

      if (Number.isNaN(numKey) || numKey < 1 || numKey > 9) {
        return;
      }

      const targetIndex = numKey - 1;
      if (targetIndex >= sheetCount) {
        return;
      }

      e.preventDefault();
      onSelectSheet(targetIndex);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sheetCount, onSelectSheet]);
}
