/**
 * @file VBA Editor Reducer
 *
 * Main reducer combining all handlers.
 */

import type { VbaProgramIr } from "@aurochs-office/vba";
import { createHistory } from "@aurochs-ui/editor-core/history";
import type { VbaEditorState, VbaEditorAction, ModifiedSourceMap } from "../types";
import { createInitialCursor } from "../types";
import { HANDLERS } from "./handlers";

// =============================================================================
// Initial State Factory
// =============================================================================

/**
 * Create initial editor state.
 */
export function createInitialState(program?: VbaProgramIr): VbaEditorState {
  const firstModule = program?.modules[0]?.name;
  return {
    program,
    sourceHistory: createHistory<ModifiedSourceMap>(new Map()),
    activeModuleName: firstModule,
    cursor: createInitialCursor(),
    selection: undefined,
    mode: "editing",
    selectedProcedureName: undefined,
    pendingCursorOffset: undefined,
  };
}

// =============================================================================
// Reducer
// =============================================================================

/**
 * VBA Editor reducer.
 */
export function vbaEditorReducer(
  state: VbaEditorState,
  action: VbaEditorAction
): VbaEditorState {
  const handler = HANDLERS[action.type];
  // Type assertion needed because TypeScript can't narrow the handler type
  return handler(state, action as never);
}
