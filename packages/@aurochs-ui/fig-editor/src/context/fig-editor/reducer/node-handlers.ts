/**
 * @file Node mutation action handlers
 */

import { pushHistory } from "@aurochs-ui/editor-core/history";
import { createSingleSelection, createEmptySelection } from "@aurochs-ui/editor-core/selection";
import { addNode, removeNode, updateNode, reorderNode } from "@aurochs-builder/fig/node-ops";
import type { FigNodeId } from "@aurochs-builder/fig/types";
import type { HandlerMap } from "./handler-types";

export const NODE_HANDLERS: HandlerMap = {
  ADD_NODE(state, action) {
    const pageId = state.activePageId;
    if (!pageId) {
      return state;
    }

    const doc = state.documentHistory.present;
    const result = addNode(doc, pageId, action.parentId ?? null, action.spec);

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, result.doc),
      nodeSelection: createSingleSelection(result.nodeId),
    };
  },

  DELETE_NODES(state, action) {
    const pageId = state.activePageId;
    if (!pageId || action.nodeIds.length === 0) {
      return state;
    }

    let doc = state.documentHistory.present;
    for (const nodeId of action.nodeIds) {
      doc = removeNode(doc, pageId, nodeId);
    }

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, doc),
      nodeSelection: createEmptySelection<FigNodeId>(),
    };
  },

  UPDATE_NODE(state, action) {
    const pageId = state.activePageId;
    if (!pageId) {
      return state;
    }

    const doc = state.documentHistory.present;
    const updated = updateNode(doc, pageId, action.nodeId, action.updater);

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, updated),
    };
  },

  REORDER_NODE(state, action) {
    const pageId = state.activePageId;
    if (!pageId) {
      return state;
    }

    const doc = state.documentHistory.present;
    const updated = reorderNode(doc, pageId, action.nodeId, action.direction);

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, updated),
    };
  },
};
