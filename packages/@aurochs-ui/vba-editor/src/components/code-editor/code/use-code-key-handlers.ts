/**
 * @file Code key handlers hook
 *
 * Handles keyboard events for the VBA code editor.
 */

import { useCallback, type KeyboardEvent } from "react";
import type { VbaEditorAction } from "../../../context/vba-editor/types";
import type { CompositionState } from "./use-code-composition";

// =============================================================================
// Types
// =============================================================================

type UseCodeKeyHandlersArgs = {
  readonly composition: CompositionState;
  readonly dispatch: (action: VbaEditorAction) => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly moduleName: string | undefined;
};

type UseCodeKeyHandlersResult = {
  readonly handleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for handling keyboard events in code editor.
 *
 * Handles:
 * - Ctrl+Z: Undo
 * - Ctrl+Y / Ctrl+Shift+Z: Redo
 * - Tab: Insert spaces (optional)
 */
export function useCodeKeyHandlers({
  composition,
  dispatch,
  canUndo,
  canRedo,
  moduleName,
}: UseCodeKeyHandlersArgs): UseCodeKeyHandlersResult {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      // Skip during IME composition
      if (composition.isComposing) {
        return;
      }

      const { key, ctrlKey, metaKey, shiftKey } = event;
      const isModifierPressed = ctrlKey || metaKey;

      // Undo: Ctrl+Z / Cmd+Z
      if (isModifierPressed && key === "z" && !shiftKey) {
        event.preventDefault();
        if (canUndo) {
          dispatch({ type: "UNDO" });
        }
        return;
      }

      // Redo: Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z
      if (
        (isModifierPressed && key === "y") ||
        (isModifierPressed && key === "z" && shiftKey)
      ) {
        event.preventDefault();
        if (canRedo) {
          dispatch({ type: "REDO" });
        }
        return;
      }

      // Tab: Insert 4 spaces
      if (key === "Tab" && !isModifierPressed && moduleName) {
        event.preventDefault();
        const textarea = event.currentTarget;
        const { selectionStart, selectionEnd, value } = textarea;

        // Insert 4 spaces at cursor
        const spaces = "    ";
        const newValue =
          value.substring(0, selectionStart) +
          spaces +
          value.substring(selectionEnd);

        // Calculate new cursor position
        const newPosition = selectionStart + spaces.length;

        // Dispatch source update through React state
        dispatch({
          type: "UPDATE_MODULE_SOURCE",
          moduleName,
          source: newValue,
          cursorOffset: newPosition,
        });
        return;
      }

      // Let other keys pass through to textarea
    },
    [composition.isComposing, dispatch, canUndo, canRedo, moduleName]
  );

  return {
    handleKeyDown,
  };
}
