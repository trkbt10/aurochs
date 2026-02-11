/**
 * @file Test Helper
 *
 * Utilities for loading and rendering DOCX fixtures in tests.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { loadDocx } from "@aurochs-office/docx";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import { paragraphsToLayoutInputs, sectionPropertiesToPageConfig } from "@aurochs-office/docx/adapters";
import { layoutDocument, flowIntoPages, DEFAULT_PAGE_FLOW_CONFIG } from "@aurochs-office/text-layout";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { renderPageToSvg, renderDocumentToSvgs } from "../../src/svg/page-render";
import type { PageLayout } from "@aurochs-office/text-layout";

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

export type RenderedFixture = {
  /** All pages as SVG strings */
  readonly svgs: readonly string[];
  /** Page layouts */
  readonly pages: readonly PageLayout[];
  /** First page SVG (convenience) */
  readonly svg: string;
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

  // Get paragraphs and section properties
  const paragraphs = doc.body.content.filter(isParagraph);
  const sectPr = doc.body.sectPr;
  const numbering = doc.numbering;

  // Derive page configuration
  const pageConfig = sectPr !== undefined ? sectionPropertiesToPageConfig(sectPr) : DEFAULT_PAGE_FLOW_CONFIG;

  // Calculate content width
  const contentWidth = px(
    (pageConfig.pageWidth as number) - (pageConfig.marginLeft as number) - (pageConfig.marginRight as number),
  );

  // Convert paragraphs to layout inputs and compute layout
  const layoutInputs = paragraphsToLayoutInputs(paragraphs, numbering);
  const { paragraphs: layoutedParagraphs } = layoutDocument(layoutInputs, contentWidth);

  // Flow into pages
  const pagedLayout = flowIntoPages({
    paragraphs: layoutedParagraphs,
    hints: [],
    config: pageConfig,
    floatingImages: [],
  });

  // Render each page to SVG
  const svgs = pagedLayout.pages.map((page) => renderPageToSvg(page).svg);

  return {
    svgs,
    pages: pagedLayout.pages,
    svg: svgs[0] ?? "",
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
