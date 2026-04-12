/**
 * @file Page CRUD operations on FigDesignDocument
 *
 * All operations are pure functions that return new document instances.
 * Pages map to CANVAS nodes in the .fig format.
 */

import type { FigDesignDocument, FigPage } from "../types/document";
import { DEFAULT_PAGE_BACKGROUND } from "../types/document";
import type { FigPageId } from "../types/node-id";
import { nextPageId, createIdCounter, toPageId } from "../types/node-id";

// =============================================================================
// ID Generation
// =============================================================================

/**
 * Shared counter for generating page IDs.
 * Uses session 0 (structural nodes).
 */
let pageCounter = createIdCounter(0, 100);

/**
 * Reset the page counter (useful for testing).
 */
export function resetPageIdCounter(startLocalID = 100): void {
  pageCounter = createIdCounter(0, startLocalID);
}

/**
 * Generate a new unique page ID.
 */
function generatePageId(): FigPageId {
  return nextPageId(pageCounter);
}

// =============================================================================
// Add Page
// =============================================================================

/**
 * Add a new empty page to the document.
 *
 * @param doc - Current document
 * @param name - Page name (defaults to "Page N" based on current count)
 * @returns Updated document and the new page's ID
 */
export function addPage(
  doc: FigDesignDocument,
  name?: string,
): { readonly doc: FigDesignDocument; readonly pageId: FigPageId } {
  const pageId = generatePageId();
  const pageName = name ?? `Page ${doc.pages.length + 1}`;

  const page: FigPage = {
    id: pageId,
    name: pageName,
    backgroundColor: DEFAULT_PAGE_BACKGROUND,
    children: [],
  };

  return {
    doc: { ...doc, pages: [...doc.pages, page] },
    pageId,
  };
}

// =============================================================================
// Remove Page
// =============================================================================

/**
 * Remove a page from the document.
 *
 * If the document has only one page, this is a no-op (documents must
 * have at least one page).
 */
export function removePage(
  doc: FigDesignDocument,
  pageId: FigPageId,
): FigDesignDocument {
  if (doc.pages.length <= 1) {
    return doc;
  }

  const pages = doc.pages.filter((p) => p.id !== pageId);
  return { ...doc, pages };
}

// =============================================================================
// Reorder Page
// =============================================================================

/**
 * Move a page to a new position within the document.
 *
 * @param newIndex - Target index (clamped to valid range)
 */
export function reorderPage(
  doc: FigDesignDocument,
  pageId: FigPageId,
  newIndex: number,
): FigDesignDocument {
  const currentIndex = doc.pages.findIndex((p) => p.id === pageId);
  if (currentIndex === -1) {
    return doc;
  }

  const clampedIndex = Math.max(0, Math.min(newIndex, doc.pages.length - 1));
  if (currentIndex === clampedIndex) {
    return doc;
  }

  const pages = [...doc.pages];
  const [page] = pages.splice(currentIndex, 1);
  pages.splice(clampedIndex, 0, page);

  return { ...doc, pages };
}

// =============================================================================
// Duplicate Page
// =============================================================================

/**
 * Duplicate a page and all its contents.
 *
 * The duplicated page is inserted immediately after the original.
 * All node IDs in the duplicate are regenerated to ensure uniqueness.
 */
export function duplicatePage(
  doc: FigDesignDocument,
  pageId: FigPageId,
): { readonly doc: FigDesignDocument; readonly newPageId: FigPageId } {
  const sourceIndex = doc.pages.findIndex((p) => p.id === pageId);
  if (sourceIndex === -1) {
    // Page not found; return unchanged with a placeholder ID
    return { doc, newPageId: toPageId("0:0") };
  }

  const source = doc.pages[sourceIndex];
  const newPageId = generatePageId();

  // Deep clone children with new IDs
  const clonedChildren = deepCloneNodes(source.children);

  const newPage: FigPage = {
    id: newPageId,
    name: `${source.name} (copy)`,
    backgroundColor: source.backgroundColor,
    children: clonedChildren,
  };

  const pages = [...doc.pages];
  pages.splice(sourceIndex + 1, 0, newPage);

  return {
    doc: { ...doc, pages },
    newPageId,
  };
}

// =============================================================================
// Rename Page
// =============================================================================

/**
 * Rename a page.
 */
export function renamePage(
  doc: FigDesignDocument,
  pageId: FigPageId,
  name: string,
): FigDesignDocument {
  const pages = doc.pages.map((page) =>
    page.id === pageId ? { ...page, name } : page,
  );
  return { ...doc, pages };
}

// =============================================================================
// Deep Clone Helpers
// =============================================================================

import { nextNodeId } from "../types/node-id";

/**
 * Deep clone a list of design nodes, regenerating all IDs.
 */
function deepCloneNodes(
  nodes: readonly import("../types/document").FigDesignNode[],
): import("../types/document").FigDesignNode[] {
  return nodes.map((node) => {
    const newId = nextNodeId(pageCounter);
    return {
      ...node,
      id: newId,
      children: node.children ? deepCloneNodes(node.children) : undefined,
      _raw: undefined, // Clone loses raw data (different IDs)
    };
  });
}
