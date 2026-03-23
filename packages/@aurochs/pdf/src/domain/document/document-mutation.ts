/**
 * @file PDF document mutation operations
 *
 * Pure, immutable functions for mutating PDF documents.
 * These are the SoT for all document-level operations.
 *
 * All functions return new document instances — they never mutate in place.
 */

import type { PdfDocument, PdfElement, PdfPage } from "./types";
import type { PdfElementId } from "./element-id";
import { parseElementId, createElementId } from "./element-id";

// =============================================================================
// Element-level mutations
// =============================================================================

/**
 * Apply an updater function to a specific element in a document page.
 * Returns a new document with the element replaced.
 */
export function updateElementInDocument(args: {
  readonly document: PdfDocument;
  readonly elementId: PdfElementId;
  readonly updater: (element: PdfElement) => PdfElement;
}): PdfDocument {
  const { document, elementId, updater } = args;
  const { pageIndex, elementIndex } = parseElementId(elementId);
  const page = document.pages[pageIndex];
  if (!page) { return document; }

  const newElements = page.elements.map((el, i) => {
    if (i === elementIndex) { return updater(el); }
    return el;
  });

  const newPages = document.pages.map((p, i) => {
    if (i === pageIndex) { return { ...p, elements: newElements }; }
    return p;
  });

  return { ...document, pages: newPages };
}

/**
 * Delete elements by their IDs from the document.
 * Returns a new document with the specified elements removed.
 */
export function deleteElements(doc: PdfDocument, elementIds: readonly PdfElementId[]): PdfDocument {
  const idsToDelete = new Set(elementIds);
  const newPages = doc.pages.map((page, pageIndex) => ({
    ...page,
    elements: page.elements.filter((_, elIndex) => !idsToDelete.has(createElementId(pageIndex, elIndex))),
  }));
  return { ...doc, pages: newPages };
}

/**
 * Add elements to a specific page.
 * Returns the new document and the IDs assigned to the added elements.
 */
export function addElementsToPage(doc: PdfDocument, pageIndex: number, elements: readonly PdfElement[]): {
  readonly document: PdfDocument;
  readonly newElementIds: readonly PdfElementId[];
} {
  const page = doc.pages[pageIndex];
  if (!page) { return { document: doc, newElementIds: [] }; }

  const startIndex = page.elements.length;
  const newElements = [...page.elements, ...elements];
  const newPages = doc.pages.map((p, i) => i === pageIndex ? { ...p, elements: newElements } : p);
  const newElementIds = elements.map((_, i) => createElementId(pageIndex, startIndex + i));

  return { document: { ...doc, pages: newPages }, newElementIds };
}

// =============================================================================
// Page-level mutations
// =============================================================================

/**
 * Insert a blank page after the specified index.
 * The new page inherits width/height from the reference page.
 *
 * @param afterIndex - Page index after which to insert. Use -1 to insert at the start.
 */
export function addPage(doc: PdfDocument, afterIndex: number): {
  readonly document: PdfDocument;
  readonly newPageIndex: number;
} {
  const sourcePage = doc.pages[afterIndex] ?? doc.pages[doc.pages.length - 1];
  if (!sourcePage) { return { document: doc, newPageIndex: 0 }; }

  const blankPage: PdfPage = { ...sourcePage, elements: [], pageNumber: doc.pages.length + 1 };
  const newPages = [...doc.pages];
  newPages.splice(afterIndex + 1, 0, blankPage);
  const newPageIndex = afterIndex + 1;

  return { document: { ...doc, pages: newPages }, newPageIndex };
}

/**
 * Delete pages by indices. Preserves at least 1 page.
 * Returns unchanged document if deletion would leave 0 pages.
 */
export function deletePages(doc: PdfDocument, pageIndices: readonly number[]): PdfDocument {
  if (doc.pages.length <= 1) { return doc; }
  const indicesToDelete = new Set(pageIndices);
  const newPages = doc.pages.filter((_, i) => !indicesToDelete.has(i));
  if (newPages.length === 0) { return doc; }
  return { ...doc, pages: newPages };
}

/**
 * Duplicate pages by indices. Inserts copies after the last selected page.
 */
export function duplicatePages(doc: PdfDocument, pageIndices: readonly number[]): {
  readonly document: PdfDocument;
  readonly insertedAtIndex: number;
} {
  const sorted = [...pageIndices].sort((a, b) => a - b);
  const duplicated = sorted.map((i) => doc.pages[i]).filter(Boolean);
  if (duplicated.length === 0) { return { document: doc, insertedAtIndex: 0 }; }

  const insertAt = sorted[sorted.length - 1] + 1;
  const newPages = [...doc.pages];
  newPages.splice(insertAt, 0, ...duplicated);

  return { document: { ...doc, pages: newPages }, insertedAtIndex: insertAt };
}

/**
 * Reorder pages by moving selected pages to a new position.
 *
 * Removes the selected pages from their original positions,
 * then inserts them as a contiguous block at `toIndex` in the remaining array.
 */
export function reorderPages(args: {
  readonly document: PdfDocument;
  readonly pageIndices: readonly number[];
  readonly toIndex: number;
}): PdfDocument {
  const { document: doc, pageIndices, toIndex } = args;
  const sortedIndices = [...pageIndices].sort((a, b) => a - b);
  const movedPages = sortedIndices.map((i) => doc.pages[i]).filter(Boolean);
  const remaining = doc.pages.filter((_, i) => !sortedIndices.includes(i));
  const result = [...remaining];
  result.splice(toIndex, 0, ...movedPages);
  return { ...doc, pages: result };
}

/**
 * Update the size of a specific page.
 */
export function updatePageSize(args: {
  readonly document: PdfDocument;
  readonly pageIndex: number;
  readonly width: number;
  readonly height: number;
}): PdfDocument {
  const { document: doc, pageIndex, width, height } = args;
  const page = doc.pages[pageIndex];
  if (!page) { return doc; }
  const newPage = { ...page, width, height };
  const newPages = doc.pages.map((p, i) => i === pageIndex ? newPage : p);
  return { ...doc, pages: newPages };
}
