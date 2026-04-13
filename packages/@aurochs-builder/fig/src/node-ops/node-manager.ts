/**
 * @file Node CRUD operations on FigDesignDocument
 *
 * All operations are pure functions that return new document instances.
 * They never mutate the input document.
 */

import type { FigDesignDocument, FigDesignNode, FigPage, FigNodeId, FigPageId } from "@aurochs/fig/domain";
import type { NodeSpec } from "../types/spec-types";
import { createNodeFromSpec } from "./node-factory";
import {
  findNodeById,
  updateNodeInTree,
  removeNodeFromTree,
  insertNodeInTree,
  reorderNodeInTree,
} from "./tree-utils";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Find a page by ID.
 */
function findPage(doc: FigDesignDocument, pageId: FigPageId): FigPage | undefined {
  return doc.pages.find((p) => p.id === pageId);
}

/**
 * Update a single page within a document.
 */
function updatePage(
  doc: FigDesignDocument,
  pageId: FigPageId,
  updater: (page: FigPage) => FigPage,
): FigDesignDocument {
  const pages = doc.pages.map((page) =>
    page.id === pageId ? updater(page) : page,
  );
  return { ...doc, pages };
}

// =============================================================================
// Add Node
// =============================================================================

type AddNodeOptions = {
  readonly doc: FigDesignDocument;
  readonly pageId: FigPageId;
  readonly parentId: FigNodeId | null;
  readonly spec: NodeSpec;
};

/**
 * Add a new node to a page.
 *
 * @returns Updated document and the new node's ID
 */
export function addNode(
  { doc, pageId, parentId, spec }: AddNodeOptions,
): { readonly doc: FigDesignDocument; readonly nodeId: FigNodeId } {
  const node = createNodeFromSpec(spec);

  const updatedDoc = updatePage(doc, pageId, (page) => ({
    ...page,
    children: insertNodeInTree({ nodes: page.children, parentId, node }),
  }));

  return { doc: updatedDoc, nodeId: node.id };
}

// =============================================================================
// Remove Node
// =============================================================================

/**
 * Remove a node from a page.
 *
 * Removes the node and all its descendants from the tree.
 */
export function removeNode(
  doc: FigDesignDocument,
  pageId: FigPageId,
  nodeId: FigNodeId,
): FigDesignDocument {
  return updatePage(doc, pageId, (page) => ({
    ...page,
    children: removeNodeFromTree(page.children, nodeId),
  }));
}

// =============================================================================
// Update Node
// =============================================================================

type UpdateNodeOptions = {
  readonly doc: FigDesignDocument;
  readonly pageId: FigPageId;
  readonly nodeId: FigNodeId;
  readonly updater: (node: FigDesignNode) => FigDesignNode;
};

/**
 * Update a node within a page.
 *
 * The updater function receives the current node and returns the updated node.
 */
export function updateNode(
  { doc, pageId, nodeId, updater }: UpdateNodeOptions,
): FigDesignDocument {
  return updatePage(doc, pageId, (page) => ({
    ...page,
    children: updateNodeInTree(page.children, nodeId, updater),
  }));
}

// =============================================================================
// Reorder Node
// =============================================================================

type ReorderNodeOptions = {
  readonly doc: FigDesignDocument;
  readonly pageId: FigPageId;
  readonly nodeId: FigNodeId;
  readonly direction: "front" | "back" | "forward" | "backward";
};

/**
 * Reorder a node within its parent's children list.
 */
export function reorderNode(
  { doc, pageId, nodeId, direction }: ReorderNodeOptions,
): FigDesignDocument {
  return updatePage(doc, pageId, (page) => ({
    ...page,
    children: reorderNodeInTree(page.children, nodeId, direction),
  }));
}

// =============================================================================
// Move Node Between Pages
// =============================================================================

type MoveNodeToPageOptions = {
  readonly doc: FigDesignDocument;
  readonly fromPageId: FigPageId;
  readonly toPageId: FigPageId;
  readonly nodeId: FigNodeId;
};

/**
 * Move a node from one page to another.
 *
 * Removes the node from the source page and adds it as a top-level
 * node on the target page.
 */
export function moveNodeToPage(
  { doc, fromPageId, toPageId, nodeId }: MoveNodeToPageOptions,
): FigDesignDocument {
  // Find the node first
  const sourcePage = findPage(doc, fromPageId);
  if (!sourcePage) {
    return doc;
  }

  const node = findNodeById(sourcePage.children, nodeId);
  if (!node) {
    return doc;
  }

  // Remove from source, then add to target
  const withoutNode = updatePage(doc, fromPageId, (page) => ({
    ...page,
    children: removeNodeFromTree(page.children, nodeId),
  }));
  return updatePage(withoutNode, toPageId, (page) => ({
    ...page,
    children: [...page.children, node],
  }));
}
