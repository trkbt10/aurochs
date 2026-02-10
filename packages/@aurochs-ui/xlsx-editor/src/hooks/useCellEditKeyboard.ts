/**
 * @file useCellEditKeyboard
 *
 * Keyboard routing for spreadsheet cell editing.
 *
 * Returns a `getKeyAction` pure function that maps keyboard events to
 * semantic actions. The component layer translates these actions into
 * reducer dispatches. This separation keeps the routing logic testable
 * without DOM dependencies.
 */

import type { CellEditingState } from "../context/workbook/editor/types";

/**
 * Semantic keyboard actions.
 *
 * The component dispatches the appropriate reducer action(s) for each.
 */
export type CellEditKeyAction =
  | { readonly type: "commit_and_move"; readonly direction: "down" | "up" | "right" | "left" }
  | { readonly type: "cancel" }
  | { readonly type: "passthrough" };

/**
 * Context needed to resolve a keyboard event into a semantic action.
 */
export type CellEditKeyContext = {
  /** Current editing state (undefined = not editing) */
  readonly editing: CellEditingState | undefined;
};

/**
 * Map a keyboard event to a semantic cell-edit action.
 *
 * This function is a pure mapping with no side effects.
 * It does NOT call `preventDefault` — that is the caller's responsibility.
 *
 * @returns The action, or `undefined` if the event should not be handled.
 */
export function getCellEditKeyAction(
  key: string,
  shiftKey: boolean,
  isComposing: boolean,
): CellEditKeyAction | undefined {
  // During IME composition, all keyboard events are passthrough
  if (isComposing) {
    return undefined;
  }

  if (key === "Enter") {
    return { type: "commit_and_move", direction: shiftKey ? "up" : "down" };
  }

  if (key === "Tab") {
    return { type: "commit_and_move", direction: shiftKey ? "left" : "right" };
  }

  if (key === "Escape") {
    return { type: "cancel" };
  }

  // All other keys: pass through to the input element (arrow keys, characters, etc.)
  return { type: "passthrough" };
}
