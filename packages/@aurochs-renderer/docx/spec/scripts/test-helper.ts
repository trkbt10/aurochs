/**
 * @file Test Helper
 *
 * Utilities for loading and rendering DOCX fixtures in tests.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { loadDocx } from "@aurochs-office/docx";
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
import {
  layoutDocument,
  flowIntoPages,
  layoutTable,
  DEFAULT_PAGE_FLOW_CONFIG,
} from "@aurochs-office/text-layout";
import type { PageLayout, LayoutTableResult } from "@aurochs-office/text-layout";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { renderPageToSvg } from "../../src/svg/page-render";

/**
 * Check if a block content is a paragraph.
 */
function isParagraph(block: unknown): block is DocxParagraph {
  return (
    typeof block === "object" &&
    block !== null &&
    "type" in block &&
    (block as { type: string }).type === "paragraph"
  );
}

/**
 * Check if a block content is a table.
 */
function isTable(block: unknown): block is DocxTable {
  return (
    typeof block === "object" &&
    block !== null &&
    "type" in block &&
    (block as { type: string }).type === "table"
  );
}

export type RenderedFixture = {
  /** All pages as SVG strings */
  readonly svgs: readonly string[];
  /** Page layouts */
  readonly pages: readonly PageLayout[];
  /** First page SVG (convenience) */
  readonly svg: string;
  /** Table layouts (if any) */
  readonly tables: readonly LayoutTableResult[];
};

/**
 * Load a DOCX fixture file and render it to SVG.
 *
 * @param fixturePath - Path to .docx file relative to the calling spec file
 * @param callerUrl - import.meta.url of the calling spec file
 */
export async function loadAndRender(fixturePath: string, callerUrl: string): Promise<RenderedFixture> {
  const callerDir = path.dirname(new URL(callerUrl).pathname);
  const absolutePath = path.resolve(callerDir, fixturePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Fixture not found: ${absolutePath}\nRun: bun run spec/scripts/generate-fixtures.ts`);
  }

  const buffer = fs.readFileSync(absolutePath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const doc = await loadDocx(arrayBuffer);

  // Get paragraphs, tables, and section properties
  const paragraphs = doc.body.content.filter(isParagraph);
  const tables = doc.body.content.filter(isTable);
  const sectPr = doc.body.sectPr;
  const numbering = doc.numbering;
  const styles = doc.styles;

  // Derive page configuration
  const pageConfig = sectPr !== undefined ? sectionPropertiesToPageConfig(sectPr) : DEFAULT_PAGE_FLOW_CONFIG;

  // Calculate content width
  const contentWidth = px(
    (pageConfig.pageWidth as number) - (pageConfig.marginLeft as number) - (pageConfig.marginRight as number),
  );

  // Convert paragraphs to layout inputs and compute layout
  const layoutInputs = paragraphsToLayoutInputs(paragraphs, numbering, styles);
  const { paragraphs: layoutedParagraphs } = layoutDocument(layoutInputs, contentWidth);

  // Flow paragraphs into pages
  const pagedLayout = flowIntoPages({
    paragraphs: layoutedParagraphs,
    hints: [],
    config: pageConfig,
    floatingImages: [],
  });

  // Layout tables
  const tableLayouts: LayoutTableResult[] = [];
  let tableY = pageConfig.marginTop as number;

  // Calculate Y position after paragraphs from the paged layout
  if (pagedLayout.pages.length > 0) {
    const firstPage = pagedLayout.pages[0];
    if (firstPage !== undefined && firstPage.paragraphs.length > 0) {
      // Get the last paragraph on the first page
      const lastParaOnPage = firstPage.paragraphs[firstPage.paragraphs.length - 1];
      if (lastParaOnPage !== undefined) {
        // Calculate paragraph total height from its lines
        const paraHeight = lastParaOnPage.lines.reduce((sum, line) => sum + (line.height as number), 0);
        // Get the Y from the first line (paragraph Y)
        const firstLine = lastParaOnPage.lines[0];
        const paraY = firstLine !== undefined ? (firstLine.y as number) : tableY;
        tableY = paraY + paraHeight + 12; // 12px spacing after paragraph
      }
    }
  }

  for (const table of tables) {
    const tableInput = tableToLayoutInput({
      table,
      containerWidth: contentWidth,
      numbering,
      styles,
    });
    const tableLayout = layoutTable(tableInput, {
      availableWidth: contentWidth,
      startY: px(tableY),
    });
    tableLayouts.push(tableLayout);
    tableY = (tableLayout.y as number) + (tableLayout.height as number) + 12;
  }

  // Resolve headers and footers for each page
  const headerFooterContext = {
    sectPr,
    headers: doc.headers,
    footers: doc.footers,
    evenAndOddHeaders: doc.settings?.evenAndOddHeaders,
  };

  const headerFooterConfig = {
    contentWidth,
    yPosition: px(sectPr?.pgMar?.header ?? 720 / 20 * 1.333), // Convert twips to pixels
    marginLeft: pageConfig.marginLeft,
    numbering,
    styles,
  };

  // Attach headers and footers to pages
  const pagesWithHeaderFooter = pagedLayout.pages.map((page, index) => {
    const { header: resolvedHeader, footer: resolvedFooter } = resolveHeaderFooter(
      headerFooterContext,
      index,
      index === 0,
    );

    const headerLayout = layoutHeader(resolvedHeader, headerFooterConfig);
    const footerLayout = layoutFooter(resolvedFooter, {
      ...headerFooterConfig,
      yPosition: px(
        (pageConfig.pageHeight as number) -
          (sectPr?.pgMar?.footer ?? 720 / 20 * 1.333),
      ),
    });

    return {
      ...page,
      header: headerLayout,
      footer: footerLayout,
    };
  });

  // Render each page to SVG (with tables on first page if any)
  const svgs = pagesWithHeaderFooter.map((page, index) =>
    renderPageToSvg(page, index === 0 ? tableLayouts : []).svg,
  );

  return {
    svgs,
    pages: pagesWithHeaderFooter,
    svg: svgs[0] ?? "",
    tables: tableLayouts,
  };
}

/**
 * Get fixture path relative to fixtures directory.
 */
export function fixture(name: string): string {
  return `fixtures/${name}.docx`;
}

/**
 * Get baseline PNG path for a fixture.
 */
export function baselinePath(fixturePath: string, callerUrl: string): string {
  const callerDir = path.dirname(new URL(callerUrl).pathname);
  const absolutePath = path.resolve(callerDir, fixturePath);
  return absolutePath.replace(/\.docx$/, ".png");
}

// Re-export compare utilities
export { compareToBaseline, type CompareResult, type CompareOptions } from "./compare";
