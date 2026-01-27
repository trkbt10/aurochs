/**
 * @file Keyboard shortcuts hook
 *
 * Handles keyboard shortcuts for the presentation editor.
 */

import { useEffect } from "react";
import type { Slide, Shape } from "@oxen/pptx/domain";
import type { ShapeId } from "@oxen/pptx/domain/types";
import type { SelectionState } from "../../context/slide/state";
import type { PresentationEditorAction } from "../../context/presentation/editor/types";

export type UseKeyboardShortcutsParams = {
  readonly dispatch: (action: PresentationEditorAction) => void;
  readonly selection: SelectionState;
  readonly slide: Slide | undefined;
  readonly primaryShape: Shape | undefined;
};

type ShortcutContext = {
  readonly dispatch: (action: PresentationEditorAction) => void;
  readonly selection: SelectionState;
  readonly slide: Slide | undefined;
  readonly primaryShape: Shape | undefined;
  readonly isMac: boolean;
};

function isInputTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

function getModKey(e: KeyboardEvent, isMac: boolean): boolean {
  return isMac ? e.metaKey : e.ctrlKey;
}

function handleUndo(e: KeyboardEvent, ctx: ShortcutContext): boolean {
  const modKey = getModKey(e, ctx.isMac);
  if (modKey && e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    ctx.dispatch({ type: "UNDO" });
    return true;
  }
  return false;
}

function handleRedo(e: KeyboardEvent, ctx: ShortcutContext): boolean {
  const modKey = getModKey(e, ctx.isMac);
  if (modKey && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
    e.preventDefault();
    ctx.dispatch({ type: "REDO" });
    return true;
  }
  return false;
}

function handleCopy(e: KeyboardEvent, ctx: ShortcutContext): boolean {
  const modKey = getModKey(e, ctx.isMac);
  if (modKey && e.key === "c") {
    e.preventDefault();
    ctx.dispatch({ type: "COPY" });
    return true;
  }
  return false;
}

function handlePaste(e: KeyboardEvent, ctx: ShortcutContext): boolean {
  const modKey = getModKey(e, ctx.isMac);
  if (modKey && e.key === "v") {
    e.preventDefault();
    ctx.dispatch({ type: "PASTE" });
    return true;
  }
  return false;
}

function handleDelete(e: KeyboardEvent, ctx: ShortcutContext): boolean {
  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    ctx.dispatch({ type: "DELETE_SHAPES", shapeIds: ctx.selection.selectedIds });
    return true;
  }
  return false;
}

function handleDuplicate(e: KeyboardEvent, ctx: ShortcutContext): boolean {
  const modKey = getModKey(e, ctx.isMac);
  if (modKey && e.key === "d") {
    e.preventDefault();
    ctx.dispatch({ type: "COPY" });
    ctx.dispatch({ type: "PASTE" });
    return true;
  }
  return false;
}

function handleSelectAll(e: KeyboardEvent, ctx: ShortcutContext): boolean {
  const modKey = getModKey(e, ctx.isMac);
  if (!modKey || e.key !== "a" || !ctx.slide) {
    return false;
  }
  e.preventDefault();
  const allIds = ctx.slide.shapes
    .filter((s): s is Shape & { nonVisual: { id: ShapeId } } => "nonVisual" in s)
    .map((s) => s.nonVisual.id);
  ctx.dispatch({ type: "SELECT_MULTIPLE_SHAPES", shapeIds: allIds });
  return true;
}

function handleGroup(e: KeyboardEvent, ctx: ShortcutContext): boolean {
  const modKey = getModKey(e, ctx.isMac);
  if (!modKey || e.key !== "g" || e.shiftKey || !ctx.slide) {
    return false;
  }
  e.preventDefault();
  if (ctx.selection.selectedIds.length >= 2) {
    ctx.dispatch({ type: "GROUP_SHAPES", shapeIds: ctx.selection.selectedIds });
  }
  return true;
}

function handleUngroup(e: KeyboardEvent, ctx: ShortcutContext): boolean {
  const modKey = getModKey(e, ctx.isMac);
  if (!modKey || !e.shiftKey || e.key !== "g") {
    return false;
  }
  e.preventDefault();
  if (ctx.selection.primaryId && ctx.primaryShape?.type === "grpSp") {
    ctx.dispatch({ type: "UNGROUP_SHAPE", shapeId: ctx.selection.primaryId });
  }
  return true;
}

function handleEscape(e: KeyboardEvent, ctx: ShortcutContext): boolean {
  if (e.key === "Escape") {
    ctx.dispatch({ type: "CLEAR_SHAPE_SELECTION" });
    return true;
  }
  return false;
}

const SHORTCUT_HANDLERS = [
  handleUndo,
  handleRedo,
  handleCopy,
  handlePaste,
  handleDelete,
  handleDuplicate,
  handleSelectAll,
  handleGroup,
  handleUngroup,
  handleEscape,
] as const;

/**
 * Hook for handling keyboard shortcuts in the editor.
 */
export function useKeyboardShortcuts({ dispatch, selection, slide, primaryShape }: UseKeyboardShortcutsParams): void {
  useEffect(() => {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const ctx: ShortcutContext = { dispatch, selection, slide, primaryShape, isMac };

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (isInputTarget(e.target)) {
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
  }, [dispatch, selection, slide, primaryShape]);
}
