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
    // If there's a selection, just clear it (stay in drill-down scope).
    // If already empty, exit drill-down scope.
    // This matches Figma's Escape behavior:
    //   1st Escape: clear selection within scope
    //   2nd Escape: exit drill-down scope
    if (state.nodeSelection.selectedIds.length > 0) {
      return {
        ...state,
        nodeSelection: createEmptySelection<FigNodeId>(),
      };
    }

    return {
      ...state,
      nodeSelection: createEmptySelection<FigNodeId>(),
      drillDownScope: undefined,
    };
  },

  DRILL_INTO(state, action) {
    return {
      ...state,
      drillDownScope: { scopeNodeId: action.scopeNodeId },
      nodeSelection: createEmptySelection<FigNodeId>(),
    };
  },

  EXIT_DRILL_DOWN(state) {
    return {
      ...state,
      drillDownScope: undefined,
      nodeSelection: createEmptySelection<FigNodeId>(),
    };
  },
};
