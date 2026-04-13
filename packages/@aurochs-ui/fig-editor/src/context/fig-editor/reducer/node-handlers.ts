/**
 * @file Node mutation action handlers
 */

import { pushHistory } from "@aurochs-ui/editor-core/history";
import { createSingleSelection, createMultiSelection, createEmptySelection } from "@aurochs-ui/editor-core/selection";
import { addNode, removeNode, updateNode, reorderNode, findNodeById, findParentNode, insertNodeInTree } from "@aurochs-builder/fig/node-ops";
import type { FigNodeId, FigDesignNode } from "@aurochs/fig/domain";
import { nextNodeId, createIdCounter } from "@aurochs-builder/fig/types";
import type { HandlerMap } from "./handler-types";
import { getActivePage } from "../node-geometry";
import type { SelectionState } from "@aurochs-ui/editor-core/selection";

function buildNodeSelection(newIds: FigNodeId[]): SelectionState<FigNodeId> {
  if (newIds.length === 1) {
    return createSingleSelection(newIds[0]!);
  }
  return createMultiSelection({ selectedIds: newIds, primaryId: newIds[0]! });
}

export const NODE_HANDLERS: HandlerMap = {
  ADD_NODE(state, action) {
    const pageId = state.activePageId;
    if (!pageId) {
      return state;
    }

    const doc = state.documentHistory.present;
    const result = addNode({ doc, pageId, parentId: action.parentId ?? null, spec: action.spec });

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

    const doc = action.nodeIds.reduce(
      (acc, nodeId) => removeNode(acc, pageId, nodeId),
      state.documentHistory.present,
    );

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
    const updated = updateNode({ doc, pageId, nodeId: action.nodeId, updater: action.updater });

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, updated),
    };
  },

  DUPLICATE_NODES(state, action) {
    const pageId = state.activePageId;
    if (!pageId || action.nodeIds.length === 0) {
      return state;
    }

    const doc = state.documentHistory.present;
    const page = getActivePage(doc, pageId);
    if (!page) {
      return state;
    }

    // Use Date.now() as session ID to ensure uniqueness across duplicate operations.
    // Each invocation gets a distinct timestamp, so IDs never collide even if the user
    // duplicates rapidly. The localID counter starts at 1 within each session.
    const counter = createIdCounter(Date.now());
    const duplicateOffset = 10;
    const newIds: FigNodeId[] = [];

    /**
     * Deep-clone a node, assigning fresh IDs to it and all descendants.
     * Offsets the root node's position.
     */
    function cloneWithNewIds(node: FigDesignNode, isRoot: boolean): FigDesignNode {
      const newId = nextNodeId(counter);
      const offsetTransform = { ...node.transform, m02: node.transform.m02 + duplicateOffset, m12: node.transform.m12 + duplicateOffset };
      const cloned: FigDesignNode = {
        ...node,
        id: newId,
        transform: isRoot ? offsetTransform : node.transform,
        children: node.children ? node.children.map((child) => cloneWithNewIds(child, false)) : undefined,
      };
      return cloned;
    }

    const { updatedPages } = action.nodeIds.reduce(
      (acc, nodeId) => {
        const original = findNodeById(page.children, nodeId);
        if (!original) {
          return acc;
        }
        const cloned = cloneWithNewIds(original, true);
        newIds.push(cloned.id);

        // Find parent to insert sibling
        const parent = findParentNode(page.children, nodeId);
        const parentId = parent ? parent.id : null;

        return {
          updatedPages: acc.updatedPages.map((p) => {
            if (p.id !== pageId) {
              return p;
            }
            return {
              ...p,
              children: insertNodeInTree({ nodes: p.children, parentId, node: cloned }),
            };
          }),
        };
      },
      { updatedPages: doc.pages },
    );

    const updatedDoc = { ...doc, pages: updatedPages };

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, updatedDoc),
      nodeSelection: buildNodeSelection(newIds),
    };
  },

  REORDER_NODE(state, action) {
    const pageId = state.activePageId;
    if (!pageId) {
      return state;
    }

    const doc = state.documentHistory.present;
    const updated = reorderNode({ doc, pageId, nodeId: action.nodeId, direction: action.direction });

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, updated),
    };
  },
};
