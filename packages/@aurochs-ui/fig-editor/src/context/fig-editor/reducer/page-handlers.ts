/**
 * @file Page action handlers
 */

import { pushHistory } from "@aurochs-ui/editor-core/history";
import { createEmptySelection } from "@aurochs-ui/editor-core/selection";
import { addPage, removePage, reorderPage, renamePage } from "@aurochs-builder/fig/page-ops";
import type { FigNodeId } from "@aurochs/fig/domain";
import type { HandlerMap } from "./handler-types";

export const PAGE_HANDLERS: HandlerMap = {
  SELECT_PAGE(state, action) {
    if (state.activePageId === action.pageId) {
      return state;
    }
    return {
      ...state,
      activePageId: action.pageId,
      nodeSelection: createEmptySelection<FigNodeId>(),
    };
  },

  ADD_PAGE(state, action) {
    const doc = state.documentHistory.present;
    const result = addPage(doc, action.name);
    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, result.doc),
      activePageId: result.pageId,
      nodeSelection: createEmptySelection<FigNodeId>(),
    };
  },

  DELETE_PAGE(state, action) {
    const doc = state.documentHistory.present;
    const updated = removePage(doc, action.pageId);
    if (updated === doc) {
      return state; // No change (e.g., last page)
    }

    // If deleting the active page, switch to first available page
    const newActivePageId = state.activePageId === action.pageId ? updated.pages[0]?.id : state.activePageId;

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, updated),
      activePageId: newActivePageId,
      nodeSelection: createEmptySelection<FigNodeId>(),
    };
  },

  MOVE_PAGE(state, action) {
    const doc = state.documentHistory.present;
    const updated = reorderPage(doc, action.pageId, action.toIndex);
    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, updated),
    };
  },

  RENAME_PAGE(state, action) {
    const doc = state.documentHistory.present;
    const updated = renamePage(doc, action.pageId, action.name);
    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, updated),
    };
  },
};
