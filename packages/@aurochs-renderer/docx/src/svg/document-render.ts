/**
 * @file Document to SVG rendering
 *
 * High-level API for rendering DOCX documents to SVG.
 * Orchestrates the full pipeline: parse → layout → page flow → render.
 */

import type { DocxDocument } from "@aurochs-office/docx/domain/document";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import type { DocxTable } from "@aurochs-office/docx/domain/table";
import {
  paragraphsToLayoutInputs,
  sectionPropertiesToPageConfig,
  tableToLayoutInput,
  resolveHeaderFooter,
  layoutHeader,
  layoutFooter,
} from "@aurochs-office/docx/adapters";
import type { PageLayout, LayoutTableResult, PageFlowConfig } from "@aurochs-office/text-layout";
import { layoutDocument, flowIntoPages, layoutTable, DEFAULT_PAGE_FLOW_CONFIG } from "@aurochs-office/text-layout";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { renderPageToSvg } from "./page-render";
import type { DocumentSvgConfig, DocumentSvgResult } from "./types";
import { createWarningsCollector } from "./types";

// =============================================================================
// Type Guards
// =============================================================================

function isParagraph(block: unknown): block is DocxParagraph {
  return (
    typeof block === "object" &&
    block !== null &&
    "type" in block &&
    (block as { type: string }).type === "paragraph"
  );
}

function isTable(block: unknown): block is DocxTable {
  return (
    typeof block === "object" && block !== null && "type" in block && (block as { type: string }).type === "table"
  );
}

// =============================================================================
// Helper Types
// =============================================================================

type LayoutAllTablesParams = {
  readonly tables: readonly DocxTable[];
  readonly contentWidth: Pixels;
  readonly pagedLayout: { pages: readonly PageLayout[] };
  readonly pageConfig: PageFlowConfig;
  readonly document: DocxDocument;
};

type AttachHeadersFootersParams = {
  readonly pages: readonly PageLayout[];
  readonly document: DocxDocument;
  readonly pageConfig: PageFlowConfig;
  readonly contentWidth: Pixels;
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate initial Y position for tables based on paged layout.
 */
function calculateInitialTableY(
  pagedLayout: { pages: readonly PageLayout[] },
  defaultY: number,
): number {
  if (pagedLayout.pages.length === 0) {
    return defaultY;
  }

  const firstPage = pagedLayout.pages[0];
  if (firstPage === undefined || firstPage.paragraphs.length === 0) {
    return defaultY;
  }

  const lastParaOnPage = firstPage.paragraphs[firstPage.paragraphs.length - 1];
  if (lastParaOnPage === undefined) {
    return defaultY;
  }

  const paraHeight = lastParaOnPage.lines.reduce((sum, line) => sum + (line.height as number), 0);
  const firstLine = lastParaOnPage.lines[0];
  const paraY = firstLine !== undefined ? (firstLine.y as number) : defaultY;
  return paraY + paraHeight + 12; // 12px spacing after paragraph
}

/**
 * Layout all tables in the document using reduce for immutable accumulation.
 */
function layoutAllTables(params: LayoutAllTablesParams): LayoutTableResult[] {
  const { tables, contentWidth, pagedLayout, pageConfig, document } = params;
  const initialY = calculateInitialTableY(pagedLayout, pageConfig.marginTop as number);

  type Accumulator = { readonly layouts: LayoutTableResult[]; readonly nextY: number };

  const result = tables.reduce<Accumulator>(
    (acc, table) => {
      const tableInput = tableToLayoutInput({
        table,
        containerWidth: contentWidth,
        numbering: document.numbering,
        styles: document.styles,
      });
      const tableLayout = layoutTable(tableInput, {
        availableWidth: contentWidth,
        startY: px(acc.nextY),
      });
      return {
        layouts: [...acc.layouts, tableLayout],
        nextY: (tableLayout.y as number) + (tableLayout.height as number) + 12,
      };
    },
    { layouts: [], nextY: initialY },
  );

  return result.layouts;
}

/**
 * Attach headers and footers to each page.
 */
function attachHeadersFooters(params: AttachHeadersFootersParams): PageLayout[] {
  const { pages, document, pageConfig, contentWidth } = params;
  const sectPr = document.body.sectPr;

  const headerFooterContext = {
    sectPr,
    headers: document.headers,
    footers: document.footers,
    evenAndOddHeaders: document.settings?.evenAndOddHeaders,
  };

  const headerFooterConfig = {
    contentWidth,
    yPosition: px((sectPr?.pgMar?.header ?? 720) / 20 * 1.333), // Convert twips to pixels
    marginLeft: pageConfig.marginLeft,
    numbering: document.numbering,
    styles: document.styles,
  };

  return pages.map((page, index) => {
    const { header: resolvedHeader, footer: resolvedFooter } = resolveHeaderFooter(
      headerFooterContext,
      index,
      index === 0,
    );

    const headerLayout = layoutHeader(resolvedHeader, headerFooterConfig);
    const footerLayout = layoutFooter(resolvedFooter, {
      ...headerFooterConfig,
      yPosition: px((pageConfig.pageHeight as number) - ((sectPr?.pgMar?.footer ?? 720) / 20 * 1.333)),
    });

    return {
      ...page,
      header: headerLayout,
      footer: footerLayout,
    };
  });
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Render a DOCX document to SVG.
 *
 * This is the high-level API that orchestrates the full rendering pipeline:
 * 1. Extract paragraphs and tables from document
 * 2. Derive page configuration from section properties
 * 3. Layout paragraphs using text layout engine
 * 4. Flow paragraphs into pages
 * 5. Layout tables
 * 6. Attach headers and footers
 * 7. Render each page to SVG
 *
 * @example
 * ```typescript
 * import { loadDocx } from "@aurochs-office/docx";
 * import { renderDocumentToSvg } from "@aurochs-renderer/docx/svg";
 *
 * const doc = await loadDocx(buffer);
 * const result = renderDocumentToSvg({ document: doc });
 *
 * console.log(result.totalPages);
 * console.log(result.pages[0].svg);
 * ```
 */
export function renderDocumentToSvg(config: DocumentSvgConfig): DocumentSvgResult {
  const { document, pageConfigOverride } = config;
  const warnings = createWarningsCollector();

  // 1. Derive page configuration from section properties
  const sectPr = document.body.sectPr;
  const baseConfig = sectPr !== undefined ? sectionPropertiesToPageConfig(sectPr) : DEFAULT_PAGE_FLOW_CONFIG;
  const pageConfig: PageFlowConfig = { ...baseConfig, ...pageConfigOverride };

  // 2. Calculate content width (page width minus margins)
  const contentWidth = px(
    (pageConfig.pageWidth as number) - (pageConfig.marginLeft as number) - (pageConfig.marginRight as number),
  );

  // 3. Extract paragraphs and tables from document body
  const paragraphs = document.body.content.filter(isParagraph);
  const tables = document.body.content.filter(isTable);

  // 4. Convert paragraphs to layout inputs and compute layout
  const layoutInputs = paragraphsToLayoutInputs(paragraphs, document.numbering, document.styles);
  const { paragraphs: layoutedParagraphs } = layoutDocument(layoutInputs, contentWidth);

  // 5. Flow paragraphs into pages
  const pagedLayout = flowIntoPages({
    paragraphs: layoutedParagraphs,
    hints: [],
    config: pageConfig,
    floatingImages: [],
  });

  // Handle empty document
  if (pagedLayout.pages.length === 0) {
    const emptyPage: PageLayout = {
      pageIndex: 0,
      y: px(0),
      width: pageConfig.pageWidth,
      height: pageConfig.pageHeight,
      paragraphs: [],
    };
    const emptyResult = renderPageToSvg(emptyPage, []);
    return {
      pages: [emptyResult],
      totalPages: 1,
      warnings: warnings.getAll(),
    };
  }

  // 6. Layout tables
  const tableLayouts = layoutAllTables({
    tables,
    contentWidth,
    pagedLayout,
    pageConfig,
    document,
  });

  // 7. Attach headers and footers to each page
  const pagesWithHeaderFooter = attachHeadersFooters({
    pages: pagedLayout.pages,
    document,
    pageConfig,
    contentWidth,
  });

  // 8. Render each page to SVG (tables on first page only, matching test-helper pattern)
  const renderedPages = pagesWithHeaderFooter.map((page, index) =>
    renderPageToSvg(page, index === 0 ? tableLayouts : []),
  );

  return {
    pages: renderedPages,
    totalPages: renderedPages.length,
    warnings: warnings.getAll(),
  };
}
