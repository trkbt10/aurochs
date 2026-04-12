/**
 * @file Selection action handlers
 */

import {
  createSingleSelection,
  createMultiSelection,
  createEmptySelection,
  addToSelection,
  toggleSelection,
} from "@aurochs-ui/editor-core/selection";
import type { FigNodeId } from "@aurochs-builder/fig/types";
import type { HandlerMap } from "./handler-types";

export const SELECTION_HANDLERS: HandlerMap = {
  SELECT_NODE(state, action) {
    const { nodeId, addToSelection: additive, toggle } = action;

    let nodeSelection;
    if (toggle) {
      nodeSelection = toggleSelection({
        selection: state.nodeSelection,
        id: nodeId,
        primaryFallback: "last",
      });
    } else if (additive) {
      nodeSelection = addToSelection(state.nodeSelection, nodeId);
    } else {
      nodeSelection = createSingleSelection(nodeId);
    }

    return { ...state, nodeSelection };
  },

  SELECT_MULTIPLE_NODES(state, action) {
    if (action.nodeIds.length === 0) {
      return {
        ...state,
        nodeSelection: createEmptySelection<FigNodeId>(),
      };
    }

    const primaryId = action.primaryId ?? action.nodeIds[0];
    return {
      ...state,
      nodeSelection: createMultiSelection({
        selectedIds: action.nodeIds,
        primaryId,
      }),
    };
  },

  CLEAR_NODE_SELECTION(state) {
    return {
      ...state,
      nodeSelection: createEmptySelection<FigNodeId>(),
    };
  },
};
