/**
 * @file Keyboard shortcut handler for the fig editor
 *
 * Maps keyboard events to editor actions.
 */

import { useEffect } from "react";
import type { FigEditorAction } from "../../context/fig-editor/types";
import type { FigNodeId } from "@aurochs/fig/domain";

type UseFigKeyboardOptions = {
  readonly dispatch: (action: FigEditorAction) => void;
  readonly hasSelection: boolean;
  readonly selectedIds: readonly FigNodeId[];
  readonly canUndo: boolean;
  readonly canRedo: boolean;
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
}: UseFigKeyboardOptions): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
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
  }, [dispatch, hasSelection, selectedIds, canUndo, canRedo]);
}
