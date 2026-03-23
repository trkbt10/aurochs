/**
 * @file PDF element addressing
 *
 * Provides a positional element identifier scheme for PDF documents.
 * PDF elements don't have intrinsic IDs, so we use `pageIndex:elementIndex` pairs.
 *
 * Used by both the builder (mutations) and renderer (lookups/bounds).
 */

// =============================================================================
// Element ID
// =============================================================================

/**
 * Element identifier: page index + element index within the page.
 *
 * Format: `"pageIndex:elementIndex"` (both 0-based).
 */
export type PdfElementId = `${number}:${number}`;

/** Create an element ID from page and element indices. */
export function createElementId(pageIndex: number, elementIndex: number): PdfElementId {
  return `${pageIndex}:${elementIndex}`;
}

/** Parse an element ID back to indices. */
export function parseElementId(id: PdfElementId): { pageIndex: number; elementIndex: number } {
  const [p, e] = id.split(":");
  return { pageIndex: Number(p), elementIndex: Number(e) };
}
