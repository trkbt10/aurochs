/**
 * @file Page to SVG String Rendering
 *
 * Provides functions to render DOCX pages to SVG strings.
 * Used primarily for visual regression testing and server-side rendering.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { createElement, Fragment } from "react";
import type { PageLayout, LayoutResult, HeaderFooterLayout, LayoutTableResult } from "@aurochs-office/text-layout";
import { TextOverlay, TableOverlay } from "@aurochs-office/text-layout";
import { px } from "@aurochs-office/drawing-ml/domain/units";

// =============================================================================
// Types
// =============================================================================

export type PageRenderResult = {
  /** Rendered SVG string */
  readonly svg: string;
  /** Page width in pixels */
  readonly width: number;
  /** Page height in pixels */
  readonly height: number;
};

export type DocumentRenderResult = {
  /** Array of rendered page SVGs */
  readonly pages: readonly PageRenderResult[];
  /** Total number of pages */
  readonly totalPages: number;
};

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Convert HeaderFooterLayout to LayoutResult for TextOverlay.
 */
function headerFooterToLayoutResult(layout: HeaderFooterLayout | undefined): LayoutResult | undefined {
  if (layout === undefined || layout.paragraphs.length === 0) {
    return undefined;
  }
  return {
    paragraphs: layout.paragraphs,
    totalHeight: layout.height,
    yOffset: px(0),
    writingMode: "horizontal-tb",
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Render a single page to SVG string.
 *
 * @param page - Page layout to render
 * @param tables - Optional array of table layouts to render on this page
 * @returns Render result with SVG string and dimensions
 */
export function renderPageToSvg(page: PageLayout, tables: readonly LayoutTableResult[] = []): PageRenderResult {
  const width = page.width as number;
  const height = page.height as number;

  // Convert PageLayout to LayoutResult for TextOverlay
  const layoutResult: LayoutResult = {
    paragraphs: page.paragraphs,
    totalHeight: page.height,
    yOffset: px(0),
    writingMode: "horizontal-tb",
  };

  // Convert header and footer
  const headerResult = headerFooterToLayoutResult(page.header);
  const footerResult = headerFooterToLayoutResult(page.footer);

  // Build SVG content elements
  const children: React.ReactElement[] = [];

  // Header
  if (headerResult !== undefined && page.header !== undefined) {
    children.push(
      createElement(
        "g",
        { key: "header", transform: `translate(0, ${page.header.y as number})` },
        createElement(TextOverlay, {
          layoutResult: headerResult,
          selection: undefined,
          cursor: undefined,
          showCursor: false,
        }),
      ),
    );
  }

  // Main content
  children.push(
    createElement(TextOverlay, {
      key: "content",
      layoutResult,
      selection: undefined,
      cursor: undefined,
      showCursor: false,
    }),
  );

  // Tables
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    if (table !== undefined) {
      children.push(createElement(TableOverlay, { key: `table-${i}`, table }));
    }
  }

  // Footer
  if (footerResult !== undefined && page.footer !== undefined) {
    children.push(
      createElement(
        "g",
        { key: "footer", transform: `translate(0, ${page.footer.y as number})` },
        createElement(TextOverlay, {
          layoutResult: footerResult,
          selection: undefined,
          cursor: undefined,
          showCursor: false,
        }),
      ),
    );
  }

  // Render SVG element
  const svgElement = createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
    },
    // White background rectangle
    createElement("rect", {
      x: 0,
      y: 0,
      width,
      height,
      fill: "white",
    }),
    createElement(Fragment, null, ...children),
  );

  const svg = renderToStaticMarkup(svgElement);

  return { svg, width, height };
}

/**
 * Render all pages of a document to SVG strings.
 *
 * @param pages - Array of page layouts
 * @returns Document render result with all page SVGs
 */
export function renderDocumentToSvgs(pages: readonly PageLayout[]): DocumentRenderResult {
  const renderedPages = pages.map((page) => renderPageToSvg(page));

  return {
    pages: renderedPages,
    totalPages: pages.length,
  };
}
