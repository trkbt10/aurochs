/**
 * @file DOCX Header/Footer Resolver
 *
 * Resolves the correct header and footer for a given page
 * based on section properties and document relationship maps.
 *
 * @see ECMA-376 Part 1, Section 17.10 (Headers and Footers)
 */

import type { DocxSectionProperties, DocxHeaderFooterRef } from "../../docx/domain/section";
import type { DocxHeader, DocxFooter, DocxBlockContent } from "../../docx/domain/document";
import type { DocxParagraph } from "../../docx/domain/paragraph";
import type { DocxRelId, HeaderFooterType } from "../../docx/domain/types";
import type { DocxNumbering } from "../../docx/domain/numbering";
import type { DocxStyles } from "../../docx/domain/styles";
import type { LayoutParagraphInput, LayoutParagraphResult, HeaderFooterLayout } from "../types";
import type { Pixels } from "../../ooxml/domain/units";
import { px } from "../../ooxml/domain/units";
import { paragraphToLayoutInput, createParagraphLayoutContext } from "./docx-adapter";
import { layoutDocument } from "../engine";

// =============================================================================
// Types
// =============================================================================

/**
 * Resolved header and footer for a page.
 */
export type ResolvedHeaderFooter = {
  /** Header for this page (if any) */
  readonly header: DocxHeader | undefined;
  /** Footer for this page (if any) */
  readonly footer: DocxFooter | undefined;
};

/**
 * Header/Footer resolution context.
 */
export type HeaderFooterContext = {
  /** Section properties */
  readonly sectPr: DocxSectionProperties | undefined;
  /** All headers by relationship ID */
  readonly headers: ReadonlyMap<DocxRelId, DocxHeader> | undefined;
  /** All footers by relationship ID */
  readonly footers: ReadonlyMap<DocxRelId, DocxFooter> | undefined;
  /** Whether even and odd headers are different */
  readonly evenAndOddHeaders?: boolean;
};

// =============================================================================
// Header/Footer Selection Logic
// =============================================================================

/**
 * Determine the header/footer type for a given page.
 *
 * @param pageIndex - Zero-based page index within the section
 * @param isFirstPage - Whether this is the first page of the section
 * @param titlePg - Whether section has a different first page header/footer
 * @param evenAndOddHeaders - Whether even and odd headers are different
 * @returns The header/footer type to use
 *
 * @see ECMA-376-1:2016 Section 17.10.1 (Header/Footer Overview)
 */
function getHeaderFooterType(
  pageIndex: number,
  isFirstPage: boolean,
  titlePg: boolean,
  evenAndOddHeaders: boolean,
): HeaderFooterType {
  // First page of section with titlePg enabled
  if (isFirstPage && titlePg) {
    return "first";
  }

  // Even/odd pages when enabled
  // Page numbers are 1-based for even/odd determination
  // pageIndex 0 = page 1 (odd), pageIndex 1 = page 2 (even), etc.
  if (evenAndOddHeaders) {
    const pageNumber = pageIndex + 1;
    return pageNumber % 2 === 0 ? "even" : "default";
  }

  return "default";
}

/**
 * Find a header/footer reference by type.
 *
 * @param references - Header or footer references from sectPr
 * @param type - The type to find
 * @returns The relationship ID if found
 */
function findRefByType(
  references: readonly DocxHeaderFooterRef[] | undefined,
  type: HeaderFooterType,
): DocxRelId | undefined {
  if (references === undefined) {
    return undefined;
  }
  const ref = references.find((r) => r.type === type);
  return ref?.rId;
}

/**
 * Get header for a reference type with fallback to default.
 *
 * @see ECMA-376-1:2016 Section 17.10.1 (fallback behavior)
 */
function getHeaderForType(
  references: readonly DocxHeaderFooterRef[] | undefined,
  headers: ReadonlyMap<DocxRelId, DocxHeader> | undefined,
  type: HeaderFooterType,
): DocxHeader | undefined {
  if (headers === undefined || headers.size === 0) {
    return undefined;
  }

  // Try to find the specific type
  const rId = findRefByType(references, type);
  if (rId !== undefined) {
    return headers.get(rId);
  }

  // Fallback: even falls back to default, first has no fallback
  if (type === "even") {
    const defaultRId = findRefByType(references, "default");
    if (defaultRId !== undefined) {
      return headers.get(defaultRId);
    }
  }

  // For "first" type with no explicit first header, no header is shown
  // (per spec: "If no 'first' header is specified, the first page has no header")
  if (type === "first") {
    return undefined;
  }

  // Default type: just try to get any default
  return undefined;
}

/**
 * Get footer for a reference type with fallback to default.
 *
 * @see ECMA-376-1:2016 Section 17.10.1 (fallback behavior)
 */
function getFooterForType(
  references: readonly DocxHeaderFooterRef[] | undefined,
  footers: ReadonlyMap<DocxRelId, DocxFooter> | undefined,
  type: HeaderFooterType,
): DocxFooter | undefined {
  if (footers === undefined || footers.size === 0) {
    return undefined;
  }

  // Try to find the specific type
  const rId = findRefByType(references, type);
  if (rId !== undefined) {
    return footers.get(rId);
  }

  // Fallback: even falls back to default, first has no fallback
  if (type === "even") {
    const defaultRId = findRefByType(references, "default");
    if (defaultRId !== undefined) {
      return footers.get(defaultRId);
    }
  }

  // For "first" type with no explicit first footer, no footer is shown
  if (type === "first") {
    return undefined;
  }

  return undefined;
}

// =============================================================================
// Main Resolution Function
// =============================================================================

/**
 * Resolve the header and footer for a specific page.
 *
 * @param context - Header/footer resolution context
 * @param pageIndex - Zero-based page index within the section
 * @param isFirstPageOfSection - Whether this is the first page of the section
 * @returns Resolved header and footer for the page
 *
 * @example
 * ```typescript
 * const resolved = resolveHeaderFooter(
 *   {
 *     sectPr: document.body.sectPr,
 *     headers: document.headers,
 *     footers: document.footers,
 *     evenAndOddHeaders: document.settings?.evenAndOddHeaders,
 *   },
 *   0,  // first page
 *   true,
 * );
 * console.log(resolved.header?.content);
 * ```
 */
export function resolveHeaderFooter(
  context: HeaderFooterContext,
  pageIndex: number,
  isFirstPageOfSection: boolean,
): ResolvedHeaderFooter {
  const { sectPr, headers, footers, evenAndOddHeaders = false } = context;

  // Determine which type of header/footer to use
  const type = getHeaderFooterType(
    pageIndex,
    isFirstPageOfSection,
    sectPr?.titlePg ?? false,
    evenAndOddHeaders,
  );

  // Resolve header and footer
  const header = getHeaderForType(sectPr?.headerReference, headers, type);
  const footer = getFooterForType(sectPr?.footerReference, footers, type);

  return { header, footer };
}

/**
 * Check if a section has any headers defined.
 */
export function hasHeaders(
  sectPr: DocxSectionProperties | undefined,
  headers: ReadonlyMap<DocxRelId, DocxHeader> | undefined,
): boolean {
  if (sectPr?.headerReference === undefined || sectPr.headerReference.length === 0) {
    return false;
  }
  if (headers === undefined || headers.size === 0) {
    return false;
  }
  return sectPr.headerReference.some((ref) => headers.has(ref.rId));
}

/**
 * Check if a section has any footers defined.
 */
export function hasFooters(
  sectPr: DocxSectionProperties | undefined,
  footers: ReadonlyMap<DocxRelId, DocxFooter> | undefined,
): boolean {
  if (sectPr?.footerReference === undefined || sectPr.footerReference.length === 0) {
    return false;
  }
  if (footers === undefined || footers.size === 0) {
    return false;
  }
  return sectPr.footerReference.some((ref) => footers.has(ref.rId));
}

// =============================================================================
// Header/Footer Layout
// =============================================================================

/**
 * Configuration for header/footer layout.
 */
export type HeaderFooterLayoutConfig = {
  /** Content width (page width - margins) */
  readonly contentWidth: Pixels;
  /** Y position from top of page for headers, or from bottom for footers */
  readonly yPosition: Pixels;
  /** Left margin offset */
  readonly marginLeft: Pixels;
  /** Numbering definitions */
  readonly numbering?: DocxNumbering;
  /** Style definitions */
  readonly styles?: DocxStyles;
};

/**
 * Extract paragraphs from header/footer content.
 */
function extractParagraphs(content: readonly DocxBlockContent[]): readonly DocxParagraph[] {
  const paragraphs: DocxParagraph[] = [];
  for (const block of content) {
    if (block.type === "paragraph") {
      paragraphs.push(block);
    }
    // Tables in headers/footers are not yet supported
  }
  return paragraphs;
}

/**
 * Layout header content.
 *
 * @param header - Header content
 * @param config - Layout configuration
 * @returns Header layout result
 */
export function layoutHeader(
  header: DocxHeader | undefined,
  config: HeaderFooterLayoutConfig,
): HeaderFooterLayout | undefined {
  if (header === undefined || header.content.length === 0) {
    return undefined;
  }

  const paragraphs = extractParagraphs(header.content);
  if (paragraphs.length === 0) {
    return undefined;
  }

  const context = createParagraphLayoutContext(config.numbering, config.styles);
  const layoutInputs: LayoutParagraphInput[] = paragraphs.map((p) => {
    const input = paragraphToLayoutInput(p, context);
    // Add left margin to paragraph's marginLeft
    return {
      ...input,
      marginLeft: px((input.marginLeft as number) + (config.marginLeft as number)),
    };
  });

  const layoutResult = layoutDocument(layoutInputs, config.contentWidth);

  // Calculate total height
  const totalHeight = layoutResult.paragraphs.reduce((sum, p) => {
    const paraHeight = p.lines.reduce((h, l) => h + (l.height as number), 0);
    return sum + paraHeight;
  }, 0);

  return {
    paragraphs: layoutResult.paragraphs,
    y: config.yPosition,
    height: px(totalHeight),
  };
}

/**
 * Layout footer content.
 *
 * @param footer - Footer content
 * @param config - Layout configuration
 * @returns Footer layout result with adjusted Y position
 */
export function layoutFooter(
  footer: DocxFooter | undefined,
  config: HeaderFooterLayoutConfig,
): HeaderFooterLayout | undefined {
  if (footer === undefined || footer.content.length === 0) {
    return undefined;
  }

  const paragraphs = extractParagraphs(footer.content);
  if (paragraphs.length === 0) {
    return undefined;
  }

  const context = createParagraphLayoutContext(config.numbering, config.styles);
  const layoutInputs: LayoutParagraphInput[] = paragraphs.map((p) => {
    const input = paragraphToLayoutInput(p, context);
    // Add left margin to paragraph's marginLeft
    return {
      ...input,
      marginLeft: px((input.marginLeft as number) + (config.marginLeft as number)),
    };
  });

  const layoutResult = layoutDocument(layoutInputs, config.contentWidth);

  // Calculate total height
  const totalHeight = layoutResult.paragraphs.reduce((sum, p) => {
    const paraHeight = p.lines.reduce((h, l) => h + (l.height as number), 0);
    return sum + paraHeight;
  }, 0);

  // Footer Y position is measured from the bottom edge
  // config.yPosition is the footer distance from bottom edge
  // We need to position the footer so its bottom aligns with (pageHeight - yPosition)
  // But since we're given the distance from bottom edge to footer TOP,
  // the Y coordinate in page space is: pageHeight - yPosition - totalHeight
  // However, this calculation should be done by the caller since they have pageHeight
  // Here we just return the configured Y position
  return {
    paragraphs: layoutResult.paragraphs,
    y: config.yPosition,
    height: px(totalHeight),
  };
}
