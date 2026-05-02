/**
 * @file Node mutation action handlers
 */

import { pushHistory } from "@aurochs-ui/editor-core/history";
import { createSingleSelection, createMultiSelection, createEmptySelection } from "@aurochs-ui/editor-core/selection";
import { addNode, removeNode, updateNode, reorderNode, findNodeById, findParentNode, insertNodeInTree, updateNodeInTree } from "@aurochs-builder/fig/node-ops";
import type { FigNodeId, FigDesignNode } from "@aurochs/fig/domain";
import { nextNodeId, createIdCounter } from "@aurochs-builder/fig/types";
import type { HandlerMap } from "./handler-types";
import { getActivePage } from "../node-geometry";
import type { SelectionState } from "@aurochs-ui/editor-core/selection";
import type { FigEditorState } from "../types";
import { outlineNode } from "./outline-node";

function buildNodeSelection(newIds: FigNodeId[]): SelectionState<FigNodeId> {
  if (newIds.length === 1) {
    return createSingleSelection(newIds[0]!);
  }
  return createMultiSelection({ selectedIds: newIds, primaryId: newIds[0]! });
}

function getNodeParentId(nodes: readonly FigDesignNode[], nodeId: FigNodeId): FigNodeId | null | undefined {
  if (nodes.some((node) => node.id === nodeId)) {
    return null;
  }
  return findParentNode(nodes, nodeId)?.id;
}

function getSiblingList(pageChildren: readonly FigDesignNode[], parentId: FigNodeId | null): readonly FigDesignNode[] {
  if (parentId === null) {
    return pageChildren;
  }
  return findNodeById(pageChildren, parentId)?.children ?? [];
}

function replaceSiblingList(
  pageChildren: readonly FigDesignNode[],
  parentId: FigNodeId | null,
  nextSiblings: readonly FigDesignNode[],
): readonly FigDesignNode[] {
  if (parentId === null) {
    return nextSiblings;
  }
  return updateNodeInTree(pageChildren, parentId, (parent) => ({ ...parent, children: nextSiblings }));
}

function computeGroupBounds(nodes: readonly FigDesignNode[]): { x: number; y: number; width: number; height: number } {
  const left = Math.min(...nodes.map((node) => node.transform.m02));
  const top = Math.min(...nodes.map((node) => node.transform.m12));
  const right = Math.max(...nodes.map((node) => node.transform.m02 + node.size.x));
  const bottom = Math.max(...nodes.map((node) => node.transform.m12 + node.size.y));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function wrapSelectedSiblings(
  pageChildren: readonly FigDesignNode[],
  selectedIds: readonly FigNodeId[],
  wrapperType: "GROUP" | "COMPONENT",
): { readonly children: readonly FigDesignNode[]; readonly wrapper: FigDesignNode } | null {
  if (selectedIds.length === 0) {
    return null;
  }
  const parentId = getNodeParentId(pageChildren, selectedIds[0]!);
  if (parentId === undefined || !selectedIds.every((id) => getNodeParentId(pageChildren, id) === parentId)) {
    return null;
  }

  const siblings = getSiblingList(pageChildren, parentId);
  const selectedSet = new Set(selectedIds);
  const selectedNodes = siblings.filter((node) => selectedSet.has(node.id));
  if (selectedNodes.length === 0) {
    return null;
  }

  const bounds = computeGroupBounds(selectedNodes);
  const counter = createIdCounter(Date.now());
  const wrapperId = nextNodeId(counter);
  const wrapper: FigDesignNode = {
    id: wrapperId,
    type: wrapperType,
    name: wrapperType === "GROUP" ? "Group" : "Component",
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: bounds.x, m10: 0, m11: 1, m12: bounds.y },
    size: { x: bounds.width, y: bounds.height },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    clipsContent: wrapperType === "COMPONENT" ? true : undefined,
    children: selectedNodes.map((node) => ({
      ...node,
      transform: {
        ...node.transform,
        m02: node.transform.m02 - bounds.x,
        m12: node.transform.m12 - bounds.y,
      },
    })),
  };

  const firstSelectedIndex = siblings.findIndex((node) => selectedSet.has(node.id));
  const nextSiblings: FigDesignNode[] = [];
  for (let index = 0; index < siblings.length; index += 1) {
    const node = siblings[index]!;
    if (index === firstSelectedIndex) {
      nextSiblings.push(wrapper);
    }
    if (!selectedSet.has(node.id)) {
      nextSiblings.push(node);
    }
  }

  const children = replaceSiblingList(pageChildren, parentId, nextSiblings);

  return { children, wrapper };
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

  RENAME_NODE(state, action) {
    const pageId = state.activePageId;
    if (!pageId) {
      return state;
    }
    const doc = updateNode({
      doc: state.documentHistory.present,
      pageId,
      nodeId: action.nodeId,
      updater: (node) => ({ ...node, name: action.name }),
    });
    return { ...state, documentHistory: pushHistory(state.documentHistory, doc) };
  },

  GROUP_SELECTION(state) {
    return wrapSelection(state, "GROUP");
  },

  MAKE_COMPONENT_FROM_SELECTION(state) {
    return wrapSelection(state, "COMPONENT");
  },

  OUTLINE_SELECTION(state) {
    const pageId = state.activePageId;
    if (!pageId || state.nodeSelection.selectedIds.length === 0) {
      return state;
    }
    const doc = state.documentHistory.present;
    let changed = false;
    const outlined = state.nodeSelection.selectedIds.reduce((acc, nodeId) => {
      return updateNode({
        doc: acc,
        pageId,
        nodeId,
        updater: (node) => {
          const next = outlineNode(node, doc);
          if (next) {
            changed = true;
            return next;
          }
          return node;
        },
      });
    }, doc);

    return !changed
      ? state
      : { ...state, documentHistory: pushHistory(state.documentHistory, outlined) };
  },
};

function wrapSelection(
  state: FigEditorState,
  wrapperType: "GROUP" | "COMPONENT",
): FigEditorState {
  const pageId = state.activePageId;
  if (!pageId || state.nodeSelection.selectedIds.length === 0) {
    return state;
  }
  const doc = state.documentHistory.present;
  const page = getActivePage(doc, pageId);
  if (!page) {
    return state;
  }

  const wrapped = wrapSelectedSiblings(page.children, state.nodeSelection.selectedIds, wrapperType);
  if (!wrapped) {
    return state;
  }

  const pages = doc.pages.map((p) => p.id === pageId ? { ...p, children: wrapped.children } : p);
  const components = wrapperType === "COMPONENT"
    ? new Map([...doc.components, [wrapped.wrapper.id, wrapped.wrapper]])
    : doc.components;
  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, { ...doc, pages, components }),
    nodeSelection: createSingleSelection(wrapped.wrapper.id),
  };
}
