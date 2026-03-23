/**
 * @file PDF editor keyboard shortcuts
 *
 * Uses the processShortcutHandlers pattern from editor-core/keyboard,
 * same as pptx-editor's use-keyboard-shortcuts.ts.
 */

import { useEffect } from "react";
import {
  isInputTarget,
  isPlatformMac,
  getModKey,
  processShortcutHandlers,
  type ShortcutHandler,
} from "@aurochs-ui/editor-core/keyboard";

// =============================================================================
// Context type
// =============================================================================

export type PdfShortcutContext = {
  readonly dispatch: (action: PdfShortcutAction) => void;
};

export type PdfShortcutAction =
  | { readonly type: "UNDO" }
  | { readonly type: "REDO" }
  | { readonly type: "DELETE_SELECTED" }
  | { readonly type: "CLEAR_SELECTION" }
  | { readonly type: "COPY" }
  | { readonly type: "CUT" }
  | { readonly type: "PASTE" }
  | { readonly type: "DUPLICATE" }
  | { readonly type: "SELECT_ALL" }
  | { readonly type: "NUDGE_SELECTED"; readonly dx: number; readonly dy: number };

// =============================================================================
// Shortcut handlers
// =============================================================================

const isMac = typeof navigator !== "undefined" ? isPlatformMac() : false;

const undoHandler: ShortcutHandler<PdfShortcutContext> = (event, ctx) => {
  if (!getModKey(event, isMac) || event.key !== "z" || event.shiftKey) { return false; }
  event.preventDefault();
  ctx.dispatch({ type: "UNDO" });
  return true;
};

const redoHandler: ShortcutHandler<PdfShortcutContext> = (event, ctx) => {
  const mod = getModKey(event, isMac);
  if (!mod) { return false; }
  if (event.key === "y" || (event.shiftKey && event.key === "z")) {
    event.preventDefault();
    ctx.dispatch({ type: "REDO" });
    return true;
  }
  return false;
};

const deleteHandler: ShortcutHandler<PdfShortcutContext> = (event, ctx) => {
  if (event.key !== "Delete" && event.key !== "Backspace") { return false; }
  event.preventDefault();
  ctx.dispatch({ type: "DELETE_SELECTED" });
  return true;
};

const escapeHandler: ShortcutHandler<PdfShortcutContext> = (event, ctx) => {
  if (event.key !== "Escape") { return false; }
  ctx.dispatch({ type: "CLEAR_SELECTION" });
  return true;
};

const copyHandler: ShortcutHandler<PdfShortcutContext> = (event, ctx) => {
  if (!getModKey(event, isMac) || event.key !== "c") { return false; }
  event.preventDefault();
  ctx.dispatch({ type: "COPY" });
  return true;
};

const cutHandler: ShortcutHandler<PdfShortcutContext> = (event, ctx) => {
  if (!getModKey(event, isMac) || event.key !== "x") { return false; }
  event.preventDefault();
  ctx.dispatch({ type: "CUT" });
  return true;
};

const pasteHandler: ShortcutHandler<PdfShortcutContext> = (event, ctx) => {
  if (!getModKey(event, isMac) || event.key !== "v") { return false; }
  event.preventDefault();
  ctx.dispatch({ type: "PASTE" });
  return true;
};

const duplicateHandler: ShortcutHandler<PdfShortcutContext> = (event, ctx) => {
  if (!getModKey(event, isMac) || event.key !== "d") { return false; }
  event.preventDefault();
  ctx.dispatch({ type: "DUPLICATE" });
  return true;
};

const selectAllHandler: ShortcutHandler<PdfShortcutContext> = (event, ctx) => {
  if (!getModKey(event, isMac) || event.key !== "a") { return false; }
  event.preventDefault();
  ctx.dispatch({ type: "SELECT_ALL" });
  return true;
};

const nudgeHandler: ShortcutHandler<PdfShortcutContext> = (event, ctx) => {
  const amount = event.shiftKey ? 10 : 1;
  switch (event.key) {
    case "ArrowUp":
      event.preventDefault();
      ctx.dispatch({ type: "NUDGE_SELECTED", dx: 0, dy: -amount });
      return true;
    case "ArrowDown":
      event.preventDefault();
      ctx.dispatch({ type: "NUDGE_SELECTED", dx: 0, dy: amount });
      return true;
    case "ArrowLeft":
      event.preventDefault();
      ctx.dispatch({ type: "NUDGE_SELECTED", dx: -amount, dy: 0 });
      return true;
    case "ArrowRight":
      event.preventDefault();
      ctx.dispatch({ type: "NUDGE_SELECTED", dx: amount, dy: 0 });
      return true;
    default:
      return false;
  }
};

const PDF_SHORTCUT_HANDLERS: readonly ShortcutHandler<PdfShortcutContext>[] = [
  undoHandler,
  redoHandler,
  selectAllHandler,
  copyHandler,
  cutHandler,
  pasteHandler,
  duplicateHandler,
  nudgeHandler,
  deleteHandler,
  escapeHandler,
];

// =============================================================================
// Hook
// =============================================================================

/**
 * Attach keyboard shortcuts for the PDF editor.
 * Uses the same processShortcutHandlers pattern as pptx-editor.
 */
export function usePdfKeyboardShortcuts(dispatch: (action: PdfShortcutAction) => void): void {
  useEffect(() => {
    const context: PdfShortcutContext = { dispatch };

    function handleKeyDown(event: KeyboardEvent) {
      if (isInputTarget(event.target)) { return; }
      processShortcutHandlers(event, context, PDF_SHORTCUT_HANDLERS);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch]);
}
