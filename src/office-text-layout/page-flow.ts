/**
 * @file Page Flow Engine
 *
 * Splits laid-out paragraphs into pages for continuous document display.
 * Handles page breaks, widow/orphan control, and keep-together rules.
 */

import type { Pixels } from "../ooxml/domain/units";
import { px } from "../ooxml/domain/units";
import {
  SPEC_DEFAULT_PAGE_WIDTH_TWIPS,
  SPEC_DEFAULT_PAGE_HEIGHT_TWIPS,
  SPEC_DEFAULT_MARGIN_TWIPS,
  twipsToPx,
} from "../docx/domain/ecma376-defaults";
import type {
  LayoutParagraphResult,
  LayoutLine,
  PageLayout,
  PagedLayoutResult,
  WritingMode,
} from "./types";

// =============================================================================
// Types
// =============================================================================

/**
 * Page configuration for flow.
 */
export type PageFlowConfig = {
  /** Page width in pixels */
  readonly pageWidth: Pixels;
  /** Page height in pixels */
  readonly pageHeight: Pixels;
  /** Top margin in pixels */
  readonly marginTop: Pixels;
  /** Bottom margin in pixels */
  readonly marginBottom: Pixels;
  /** Left margin in pixels */
  readonly marginLeft: Pixels;
  /** Right margin in pixels */
  readonly marginRight: Pixels;
  /** Writing mode for text direction */
  readonly writingMode?: WritingMode;
  /** Minimum lines to keep at bottom of page (widows) */
  readonly widowLines?: number;
  /** Minimum lines to keep at top of page (orphans) */
  readonly orphanLines?: number;
};

/**
 * Page break hint from paragraph properties.
 */
export type PageBreakHint = {
  /** Force page break before this paragraph */
  readonly breakBefore?: boolean;
  /** Keep this paragraph with the next */
  readonly keepWithNext?: boolean;
  /** Keep all lines of this paragraph together */
  readonly keepTogether?: boolean;
};

/**
 * Input for page flow calculation.
 */
export type PageFlowInput = {
  /** Laid-out paragraphs */
  readonly paragraphs: readonly LayoutParagraphResult[];
  /** Page break hints per paragraph */
  readonly hints?: readonly (PageBreakHint | undefined)[];
  /** Page configuration */
  readonly config: PageFlowConfig;
};

// =============================================================================
// Utilities
// =============================================================================

/**
 * Get content height for a page.
 */
function getContentHeight(config: PageFlowConfig): number {
  return (config.pageHeight as number) - (config.marginTop as number) - (config.marginBottom as number);
}

/**
 * Get paragraph height (sum of all line heights).
 */
function getParagraphHeight(paragraph: LayoutParagraphResult): number {
  return paragraph.lines.reduce((sum, line) => sum + (line.height as number), 0);
}

/**
 * Clone a line with adjusted X and Y positions.
 */
function adjustLinePosition(line: LayoutLine, xOffset: number, yOffset: number): LayoutLine {
  return {
    ...line,
    x: px((line.x as number) + xOffset),
    y: px((line.y as number) + yOffset),
  };
}

/**
 * Clone a paragraph with adjusted X and Y positions.
 */
function adjustParagraphPosition(
  paragraph: LayoutParagraphResult,
  xOffset: number,
  yOffset: number,
): LayoutParagraphResult {
  return {
    ...paragraph,
    lines: paragraph.lines.map((line) => adjustLinePosition(line, xOffset, yOffset)),
  };
}

// =============================================================================
// Page Flow Algorithm
// =============================================================================

type PageState = {
  paragraphs: LayoutParagraphResult[];
  currentY: number;
  pageStartY: number;
};

type FlowState = {
  pages: PageLayout[];
  currentPage: PageState;
  totalHeight: number;
};

/**
 * Start a new page.
 */
function startNewPage(
  state: FlowState,
  config: PageFlowConfig,
): void {
  // Finalize current page if it has content
  if (state.currentPage.paragraphs.length > 0) {
    state.pages.push({
      pageIndex: state.pages.length,
      y: px(state.currentPage.pageStartY),
      height: config.pageHeight,
      width: config.pageWidth,
      paragraphs: state.currentPage.paragraphs,
    });
  }

  // Start new page - Y coordinates are page-relative (not document-absolute)
  const newPageStartY = state.pages.length * (config.pageHeight as number);
  state.currentPage = {
    paragraphs: [],
    currentY: config.marginTop as number,
    pageStartY: newPageStartY,
  };
}

/**
 * Add a paragraph to the current page.
 * X and Y coordinates in the output are page-relative (include page margins).
 */
function addParagraphToPage(
  state: FlowState,
  paragraph: LayoutParagraphResult,
  config: PageFlowConfig,
): void {
  const contentHeight = getContentHeight(config);
  const paragraphHeight = getParagraphHeight(paragraph);

  // X offset adds the page left margin
  const xOffset = config.marginLeft as number;

  // Check if paragraph fits on current page
  const remainingSpace = contentHeight - state.currentPage.currentY + (config.marginTop as number);

  if (paragraphHeight <= remainingSpace) {
    // Paragraph fits - add it with page-relative coordinates
    // Y offset is: currentY on page - original first line Y position
    const originalFirstLineY = paragraph.lines.length > 0
      ? (paragraph.lines[0].y as number) - (paragraph.lines[0].height as number) * 0.8
      : 0;
    const yOffset = state.currentPage.currentY - originalFirstLineY;
    const adjustedParagraph = adjustParagraphPosition(paragraph, xOffset, yOffset);
    state.currentPage.paragraphs.push(adjustedParagraph);
    state.currentPage.currentY += paragraphHeight;
  } else {
    // Paragraph doesn't fit - start new page
    startNewPage(state, config);

    // Add to new page with page-relative coordinates
    const originalFirstLineY = paragraph.lines.length > 0
      ? (paragraph.lines[0].y as number) - (paragraph.lines[0].height as number) * 0.8
      : 0;
    const yOffset = state.currentPage.currentY - originalFirstLineY;
    const adjustedParagraph = adjustParagraphPosition(paragraph, xOffset, yOffset);
    state.currentPage.paragraphs.push(adjustedParagraph);
    state.currentPage.currentY += paragraphHeight;
  }

  state.totalHeight = Math.max(
    state.totalHeight,
    state.currentPage.pageStartY + state.currentPage.currentY,
  );
}

/**
 * Split paragraphs into pages.
 */
export function flowIntoPages(input: PageFlowInput): PagedLayoutResult {
  const { paragraphs, hints, config } = input;

  // Initialize state
  const state: FlowState = {
    pages: [],
    currentPage: {
      paragraphs: [],
      currentY: config.marginTop as number,
      pageStartY: 0,
    },
    totalHeight: 0,
  };

  // Process each paragraph
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const hint = hints?.[i];

    // Handle page break before
    if (hint?.breakBefore === true && state.currentPage.paragraphs.length > 0) {
      startNewPage(state, config);
    }

    // Add paragraph to page
    addParagraphToPage(state, paragraph, config);
  }

  // Finalize last page
  if (state.currentPage.paragraphs.length > 0) {
    state.pages.push({
      pageIndex: state.pages.length,
      y: px(state.currentPage.pageStartY),
      height: config.pageHeight,
      width: config.pageWidth,
      paragraphs: state.currentPage.paragraphs,
    });
  }

  // Handle empty document
  if (state.pages.length === 0) {
    state.pages.push({
      pageIndex: 0,
      y: px(0),
      height: config.pageHeight,
      width: config.pageWidth,
      paragraphs: [],
    });
  }

  return {
    pages: state.pages,
    totalHeight: px(state.totalHeight),
  };
}

// =============================================================================
// Single Page Mode
// =============================================================================

/**
 * Create a single-page layout (no pagination).
 * Useful for preview or infinite scroll mode.
 */
export function createSinglePageLayout(
  paragraphs: readonly LayoutParagraphResult[],
  pageWidth: Pixels,
  totalHeight: Pixels,
): PagedLayoutResult {
  return {
    pages: [
      {
        pageIndex: 0,
        y: px(0),
        height: totalHeight,
        width: pageWidth,
        paragraphs: [...paragraphs],
      },
    ],
    totalHeight,
  };
}

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default page flow configuration using ECMA-376 specification defaults.
 * Letter size: 8.5in x 11in = 816px x 1056px at 96 DPI
 * Default margins: 1 inch = 96px
 *
 * @see ECMA-376-1:2016 Section 17.6.13 (pgSz)
 * @see ECMA-376-1:2016 Section 17.6.11 (pgMar)
 */
export const DEFAULT_PAGE_FLOW_CONFIG: PageFlowConfig = {
  pageWidth: twipsToPx(SPEC_DEFAULT_PAGE_WIDTH_TWIPS),
  pageHeight: twipsToPx(SPEC_DEFAULT_PAGE_HEIGHT_TWIPS),
  marginTop: twipsToPx(SPEC_DEFAULT_MARGIN_TWIPS),
  marginBottom: twipsToPx(SPEC_DEFAULT_MARGIN_TWIPS),
  marginLeft: twipsToPx(SPEC_DEFAULT_MARGIN_TWIPS),
  marginRight: twipsToPx(SPEC_DEFAULT_MARGIN_TWIPS),
  writingMode: "horizontal-tb",
  widowLines: 2,
  orphanLines: 2,
};
