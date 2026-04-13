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
import type { FigNodeId } from "@aurochs/fig/domain";
import type { HandlerMap } from "./handler-types";

export const SELECTION_HANDLERS: HandlerMap = {
  SELECT_NODE(state, action) {
    const { nodeId, addToSelection: additive, toggle } = action;

    const resolveSelection = () => {
      if (toggle) { return toggleSelection({ selection: state.nodeSelection, id: nodeId, primaryFallback: "last" }); }
      if (additive) { return addToSelection(state.nodeSelection, nodeId); }
      return createSingleSelection(nodeId);
    };
    const nodeSelection = resolveSelection();

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
