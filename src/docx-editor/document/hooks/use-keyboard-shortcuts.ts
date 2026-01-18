/**
 * @file DOCX Editor keyboard shortcuts hook
 *
 * Attaches a global keydown handler and dispatches editor actions.
 */

import { useEffect } from "react";
import type { DocxEditorAction, DocxEditorState } from "../../context/document/editor/types";

type ShortcutContext = {
  readonly dispatch: (action: DocxEditorAction) => void;
  readonly state: DocxEditorState;
};

function isDocxTextEditTextarea(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLTextAreaElement &&
    target.dataset.testid === "docx-text-edit-textarea"
  );
}

function isNonEditorInputTarget(target: EventTarget | null): boolean {
  if (isDocxTextEditTextarea(target)) {
    return false;
  }
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return true;
  }
  return target instanceof HTMLElement && target.isContentEditable;
}

function isModKey(e: KeyboardEvent): boolean {
  return e.metaKey || e.ctrlKey;
}

function getKey(e: KeyboardEvent): string {
  return e.key.toLowerCase();
}

function isEditorActive(state: DocxEditorState): boolean {
  if (state.mode === "readonly") {
    return false;
  }
  if (state.textEdit.isEditing) {
    return true;
  }
  if (state.selection.mode === "text") {
    return true;
  }
  return state.selection.element.selectedIds.length > 0;
}

function handleUndo(e: KeyboardEvent, ctx: ShortcutContext): boolean {
  if (!isModKey(e) || getKey(e) !== "z" || e.shiftKey) {
    return false;
  }
  e.preventDefault();
  ctx.dispatch({ type: "UNDO" });
  return true;
}

function handleRedo(e: KeyboardEvent, ctx: ShortcutContext): boolean {
  if (!isModKey(e)) {
    return false;
  }
  const key = getKey(e);
  if (key !== "y" && !(key === "z" && e.shiftKey)) {
    return false;
  }
  e.preventDefault();
  ctx.dispatch({ type: "REDO" });
  return true;
}

function handleCopy(e: KeyboardEvent, ctx: ShortcutContext): boolean {
  if (!isModKey(e) || getKey(e) !== "c") {
    return false;
  }
  e.preventDefault();
  ctx.dispatch({ type: "COPY" });
  return true;
}

function handleCut(e: KeyboardEvent, ctx: ShortcutContext): boolean {
  if (!isModKey(e) || getKey(e) !== "x") {
    return false;
  }
  e.preventDefault();
  ctx.dispatch({ type: "CUT" });
  return true;
}

function handlePaste(e: KeyboardEvent, ctx: ShortcutContext): boolean {
  if (!isModKey(e) || getKey(e) !== "v") {
    return false;
  }
  e.preventDefault();
  ctx.dispatch({ type: "PASTE" });
  return true;
}

function handleSelectAll(e: KeyboardEvent, ctx: ShortcutContext): boolean {
  if (!isModKey(e) || getKey(e) !== "a") {
    return false;
  }
  if (ctx.state.textEdit.isEditing) {
    return false;
  }

  const contentLength = ctx.state.documentHistory.present.body.content.length;
  if (contentLength === 0) {
    return false;
  }

  const elementIds = Array.from({ length: contentLength }, (_, i) => String(i));
  e.preventDefault();
  ctx.dispatch({ type: "SELECT_ELEMENTS", elementIds });
  return true;
}

function handleToggleBold(e: KeyboardEvent, ctx: ShortcutContext): boolean {
  if (!ctx.state.textEdit.isEditing || !isModKey(e) || getKey(e) !== "b") {
    return false;
  }
  e.preventDefault();
  ctx.dispatch({ type: "TOGGLE_BOLD" });
  return true;
}

function handleToggleItalic(e: KeyboardEvent, ctx: ShortcutContext): boolean {
  if (!ctx.state.textEdit.isEditing || !isModKey(e) || getKey(e) !== "i") {
    return false;
  }
  e.preventDefault();
  ctx.dispatch({ type: "TOGGLE_ITALIC" });
  return true;
}

function handleToggleUnderline(e: KeyboardEvent, ctx: ShortcutContext): boolean {
  if (!ctx.state.textEdit.isEditing || !isModKey(e) || getKey(e) !== "u") {
    return false;
  }
  e.preventDefault();
  ctx.dispatch({ type: "TOGGLE_UNDERLINE" });
  return true;
}

function handleDeleteText(e: KeyboardEvent, ctx: ShortcutContext): boolean {
  const key = getKey(e);
  if (!ctx.state.textEdit.isEditing || (key !== "delete" && key !== "backspace")) {
    return false;
  }

  e.preventDefault();
  ctx.dispatch({
    type: "DELETE_TEXT",
    direction: key === "backspace" ? "backward" : "forward",
  });
  return true;
}

function handleEscape(e: KeyboardEvent, ctx: ShortcutContext): boolean {
  if (!ctx.state.textEdit.isEditing || getKey(e) !== "escape") {
    return false;
  }
  e.preventDefault();
  ctx.dispatch({ type: "END_TEXT_EDIT" });
  return true;
}

const SHORTCUT_HANDLERS = [
  handleUndo,
  handleRedo,
  handleCopy,
  handleCut,
  handlePaste,
  handleSelectAll,
  handleToggleBold,
  handleToggleItalic,
  handleToggleUnderline,
  handleDeleteText,
  handleEscape,
] as const;

export function useKeyboardShortcuts(
  dispatch: (action: DocxEditorAction) => void,
  state: DocxEditorState,
): void {
  useEffect(() => {
    const ctx: ShortcutContext = { dispatch, state };

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (!isEditorActive(state) || isNonEditorInputTarget(e.target)) {
        return;
      }

      // Skip during IME composition, but allow modifier shortcuts (cmd+x, etc.)
      if (e.isComposing && !isModKey(e)) {
        return;
      }

      for (const handler of SHORTCUT_HANDLERS) {
        if (handler(e, ctx)) {
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch, state]);
}

