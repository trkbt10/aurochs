/**
 * @file Keyboard shortcut handler for the fig editor
 *
 * Maps keyboard events to editor actions.
 *
 * When the event target is an input element (HTMLInputElement or
 * HTMLTextAreaElement), all shortcuts are bypassed so that text
 * editing works normally. This is the same guard used by pptx-editor
 * via isInputTarget() from editor-core/keyboard.
 */

import { useEffect } from "react";
import type { FigEditorAction } from "../../context/fig-editor/types";
import type { FigNodeId } from "@aurochs/fig/domain";
import { isInputTarget } from "@aurochs-ui/editor-core/keyboard";

type UseFigKeyboardOptions = {
  readonly dispatch: (action: FigEditorAction) => void;
  readonly hasSelection: boolean;
  readonly selectedIds: readonly FigNodeId[];
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  /**
   * Whether inline text editing is currently active.
   *
   * When true, ALL keyboard shortcuts are suppressed — the hidden textarea
   * in the text edit overlay handles all key input. This is a defense-in-depth
   * guard: normally isInputTarget(e.target) catches textarea focus, but if
   * focus is briefly lost (React re-render, browser quirk), this prevents
   * destructive actions like Backspace triggering node deletion.
   */
  readonly isTextEditing: boolean;
};

/**
 * Attach global keyboard event handlers for editor shortcuts.
 */
export function useFigKeyboard({
  dispatch,
  hasSelection,
  selectedIds,
  canUndo,
  canRedo,
  isTextEditing,
}: UseFigKeyboardOptions): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // When an input/textarea has focus (e.g., text editing, property panel inputs),
      // let all keys pass through to the element. No editor shortcuts should fire.
      if (isInputTarget(e.target)) {
        return;
      }

      // Defense-in-depth: when text editing is active, suppress all editor shortcuts
      // even if the textarea has lost focus (e.g., brief React re-render race).
      // The only exception is Escape, which exits text editing.
      if (isTextEditing) {
        if (e.key === "Escape") {
          e.preventDefault();
          dispatch({ type: "EXIT_TEXT_EDIT" });
        }
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      // Delete/Backspace: delete selected nodes
      if ((e.key === "Delete" || e.key === "Backspace") && hasSelection) {
        e.preventDefault();
        dispatch({ type: "DELETE_NODES", nodeIds: selectedIds });
        return;
      }

      // Cmd/Ctrl + Z: Undo
      if (isMod && e.key === "z" && !e.shiftKey && canUndo) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
        return;
      }

      // Cmd/Ctrl + Shift + Z: Redo
      if (isMod && e.key === "z" && e.shiftKey && canRedo) {
        e.preventDefault();
        dispatch({ type: "REDO" });
        return;
      }

      // Cmd/Ctrl + D: Duplicate
      if (isMod && e.key === "d" && hasSelection) {
        e.preventDefault();
        dispatch({ type: "DUPLICATE_NODES", nodeIds: selectedIds });
        return;
      }

      // Cmd/Ctrl + C: Copy
      if (isMod && e.key === "c" && hasSelection) {
        e.preventDefault();
        dispatch({ type: "COPY" });
        return;
      }

      // Cmd/Ctrl + V: Paste
      if (isMod && e.key === "v") {
        e.preventDefault();
        dispatch({ type: "PASTE" });
        return;
      }

      // Escape: Clear selection or exit text edit
      if (e.key === "Escape") {
        e.preventDefault();
        dispatch({ type: "EXIT_TEXT_EDIT" });
        dispatch({ type: "CLEAR_NODE_SELECTION" });
        dispatch({ type: "SET_CREATION_MODE", mode: { type: "select" } });
        return;
      }

      // Tool shortcuts (single key, no modifier)
      if (!isMod && !e.altKey) {
        switch (e.key) {
          case "v":
          case "V":
            dispatch({ type: "SET_CREATION_MODE", mode: { type: "select" } });
            return;
          case "r":
          case "R":
            dispatch({ type: "SET_CREATION_MODE", mode: { type: "rectangle" } });
            return;
          case "o":
          case "O":
            dispatch({ type: "SET_CREATION_MODE", mode: { type: "ellipse" } });
            return;
          case "t":
          case "T":
            dispatch({ type: "SET_CREATION_MODE", mode: { type: "text" } });
            return;
          case "f":
          case "F":
            dispatch({ type: "SET_CREATION_MODE", mode: { type: "frame" } });
            return;
          case "l":
          case "L":
            dispatch({ type: "SET_CREATION_MODE", mode: { type: "line" } });
            return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch, hasSelection, selectedIds, canUndo, canRedo, isTextEditing]);
}
