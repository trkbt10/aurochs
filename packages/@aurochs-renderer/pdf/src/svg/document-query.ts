/**
 * @file PdfDocumentQuery — Domain query object for PDF documents
 *
 * Provides a single, canonical interface for querying PDF document structure.
 * Bridges domain lookups (from @aurochs/pdf) with SVG coordinate conversion.
 *
 * All coordinate conversions, font metric resolution, and element lookups
 * go through this object, ensuring consistency and SoT compliance.
 */

import type { PdfDocument, PdfPage, PdfElement } from "@aurochs/pdf";
import { type PdfElementId, parseElementId, createElementId } from "@aurochs/pdf";
import { resolveTextFontMetrics } from "./text-bounds";
import type { PdfElementBounds } from "./element-bounds";
import { elementToSvgBounds } from "./element-bounds";

// =============================================================================
// Types
// =============================================================================

/** Resolved font information for text editing. */
export type TextFontInfo = {
  readonly family: string;
  readonly size: number;
  readonly weight: string;
  readonly style: string;
  readonly ascender: number;
  readonly descender: number;
};

// =============================================================================
// PdfDocumentQuery
// =============================================================================

/**
 * Domain query object for a PDF document.
 *
 * Usage:
 * ```
 * const query = createDocumentQuery(doc);
 * const el = query.getElement(elementId);
 * const bounds = query.getElementBounds(elementId);
 * const font = query.getTextFontInfo(elementId);
 * ```
 */
export type PdfDocumentQuery = {
  /** Get a page by index. Throws if index is out of bounds. */
  readonly getPage: (pageIndex: number) => PdfPage;
  /** Get page height by index. */
  readonly getPageHeight: (pageIndex: number) => number;
  /** Get an element by ID. Returns undefined if not found. */
  readonly getElement: (id: PdfElementId) => PdfElement | undefined;
  /** Get SVG-space bounds for an element. Returns undefined if element not found. */
  readonly getElementBounds: (id: PdfElementId) => PdfElementBounds | undefined;
  /** Get font info for a text element (for TextEditInputFrame). Returns undefined if not text. */
  readonly getTextFontInfo: (id: PdfElementId) => TextFontInfo | undefined;
  /** Get all element IDs on a page. */
  readonly getPageElementIds: (pageIndex: number) => readonly PdfElementId[];
  /** The underlying document. */
  readonly document: PdfDocument;
};

/**
 * Create a document query from a PdfDocument.
 */
export function createDocumentQuery(doc: PdfDocument): PdfDocumentQuery {
  const getPage = (pageIndex: number): PdfPage => {
    const page = doc.pages[pageIndex];
    if (!page) { throw new Error(`Page index ${pageIndex} out of bounds (${doc.pages.length} pages)`); }
    return page;
  };

  const getPageHeight = (pageIndex: number): number => {
    return getPage(pageIndex).height;
  };

  const getElement = (id: PdfElementId): PdfElement | undefined => {
    const { pageIndex, elementIndex } = parseElementId(id);
    return doc.pages[pageIndex]?.elements[elementIndex];
  };

  const getElementBounds = (id: PdfElementId): PdfElementBounds | undefined => {
    const { pageIndex, elementIndex } = parseElementId(id);
    const page = doc.pages[pageIndex];
    if (!page) { return undefined; }
    const element = page.elements[elementIndex];
    if (!element) { return undefined; }
    return elementToSvgBounds({ element, elementIndex, pageIndex, pageHeight: page.height });
  };

  const getTextFontInfo = (id: PdfElementId): TextFontInfo | undefined => {
    const el = getElement(id);
    if (!el || el.type !== "text") { return undefined; }
    const metrics = resolveTextFontMetrics(el);
    return {
      family: el.baseFont ?? el.fontName,
      size: el.fontSize,
      weight: el.isBold ? "bold" : "normal",
      style: el.isItalic ? "italic" : "normal",
      ascender: metrics.ascender,
      descender: metrics.descender,
    };
  };

  const getPageElementIds = (pageIndex: number): readonly PdfElementId[] => {
    const page = doc.pages[pageIndex];
    if (!page) { return []; }
    return page.elements.map((_, i) => createElementId(pageIndex, i));
  };

  return {
    getPage,
    getPageHeight,
    getElement,
    getElementBounds,
    getTextFontInfo,
    getPageElementIds,
    document: doc,
  };
}
