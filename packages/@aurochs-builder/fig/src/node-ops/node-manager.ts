/**
 * @file Node CRUD operations on FigDesignDocument
 *
 * All operations are pure functions that return new document instances.
 * They never mutate the input document.
 */

import type { FigDesignDocument, FigDesignNode, FigPage } from "../types/document";
import type { FigNodeId, FigPageId } from "../types/node-id";
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

/**
 * Add a new node to a page.
 *
 * @param doc - Current document
 * @param pageId - Target page
 * @param parentId - Parent node within the page (null for top-level)
 * @param spec - Node creation specification
 * @returns Updated document and the new node's ID
 */
export function addNode(
  doc: FigDesignDocument,
  pageId: FigPageId,
  parentId: FigNodeId | null,
  spec: NodeSpec,
): { readonly doc: FigDesignDocument; readonly nodeId: FigNodeId } {
  const node = createNodeFromSpec(spec);

  const updatedDoc = updatePage(doc, pageId, (page) => ({
    ...page,
    children: insertNodeInTree(page.children, parentId, node),
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

/**
 * Update a node within a page.
 *
 * The updater function receives the current node and returns the updated node.
 */
export function updateNode(
  doc: FigDesignDocument,
  pageId: FigPageId,
  nodeId: FigNodeId,
  updater: (node: FigDesignNode) => FigDesignNode,
): FigDesignDocument {
  return updatePage(doc, pageId, (page) => ({
    ...page,
    children: updateNodeInTree(page.children, nodeId, updater),
  }));
}

// =============================================================================
// Reorder Node
// =============================================================================

/**
 * Reorder a node within its parent's children list.
 *
 * @param direction - "front" | "back" | "forward" | "backward"
 */
export function reorderNode(
  doc: FigDesignDocument,
  pageId: FigPageId,
  nodeId: FigNodeId,
  direction: "front" | "back" | "forward" | "backward",
): FigDesignDocument {
  return updatePage(doc, pageId, (page) => ({
    ...page,
    children: reorderNodeInTree(page.children, nodeId, direction),
  }));
}

// =============================================================================
// Move Node Between Pages
// =============================================================================

/**
 * Move a node from one page to another.
 *
 * Removes the node from the source page and adds it as a top-level
 * node on the target page.
 */
export function moveNodeToPage(
  doc: FigDesignDocument,
  fromPageId: FigPageId,
  toPageId: FigPageId,
  nodeId: FigNodeId,
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

  // Remove from source
  let updated = updatePage(doc, fromPageId, (page) => ({
    ...page,
    children: removeNodeFromTree(page.children, nodeId),
  }));

  // Add to target
  updated = updatePage(updated, toPageId, (page) => ({
    ...page,
    children: [...page.children, node],
  }));

  return updated;
}
