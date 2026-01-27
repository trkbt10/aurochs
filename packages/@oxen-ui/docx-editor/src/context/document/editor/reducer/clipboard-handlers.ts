/**
 * @file DOCX Editor Clipboard Handlers
 *
 * Handlers for copy, cut, and paste operations.
 */

import type { HandlerMap } from "./handler-types";
import { markAsCut, markAsCopy } from "../../state";

// =============================================================================
// Clipboard Handlers
// =============================================================================

export const clipboardHandlers: HandlerMap = {
  COPY: (state) => {
    // TODO: Implement actual copy logic in Phase 4
    // For now, just mark existing clipboard as copy (not cut)
    if (!state.clipboard) {
      return state;
    }

    return {
      ...state,
      clipboard: markAsCopy(state.clipboard),
    };
  },

  CUT: (state) => {
    // TODO: Implement actual cut logic in Phase 4
    // For now, just mark existing clipboard as cut
    if (!state.clipboard) {
      return state;
    }

    return {
      ...state,
      clipboard: markAsCut(state.clipboard),
    };
  },

  PASTE: (state) => {
    // TODO: Implement actual paste logic in Phase 4
    // This will need to:
    // 1. Get content from clipboard
    // 2. Insert at current cursor/selection position
    // 3. Update document history
    return state;
  },

  PASTE_PLAIN_TEXT: (state) => {
    // TODO: Implement plain text paste in Phase 4
    // Similar to PASTE but strips formatting
    return state;
  },

  SET_CLIPBOARD: (state, action) => ({
    ...state,
    clipboard: action.content,
  }),

  CLEAR_CLIPBOARD: (state) => ({
    ...state,
    clipboard: undefined,
  }),
};
