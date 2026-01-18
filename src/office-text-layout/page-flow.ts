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
 * Section break type for page flow.
 *
 * @see ECMA-376-1:2016 Section 17.18.77 (ST_SectionMark)
 */
export type SectionBreakType =
  | "continuous"  // No page break (continuous flow)
  | "nextPage"    // Break to next page
  | "evenPage"    // Break to next even page
  | "oddPage"     // Break to next odd page
  | "nextColumn"; // Break to next column (not yet supported)

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
  /**
   * Widow/orphan control.
   * When true, prevents creating orphan lines at the bottom of a page
   * or widow lines at the top of a page when splitting paragraphs.
   * Defaults to true if not specified.
   *
   * @see ECMA-376-1:2016 Section 17.3.1.44 (widowControl)
   */
  readonly widowControl?: boolean;
  /**
   * Section break after this paragraph.
   * Indicates the type of section break that follows.
   *
   * @see ECMA-376-1:2016 Section 17.6.22 (type)
   */
  readonly sectionBreakAfter?: SectionBreakType;
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
 *
 * Handles widow/orphan control by ensuring:
 * - At least `orphanLines` stay on the current page when splitting
 * - At least `widowLines` go to the next page when splitting
 * - If these constraints can't be met, the entire paragraph moves to the next page
 */
function addParagraphToPage(
  state: FlowState,
  paragraph: LayoutParagraphResult,
  config: PageFlowConfig,
  hint?: PageBreakHint,
): void {
  const contentHeight = getContentHeight(config);
  const paragraphHeight = getParagraphHeight(paragraph);

  // X offset adds the page left margin
  const xOffset = config.marginLeft as number;

  // Check if paragraph fits on current page
  const remainingSpace = contentHeight - state.currentPage.currentY + (config.marginTop as number);

  // Widow/orphan control settings (default to config values or 2)
  const widowLines = config.widowLines ?? 2;
  const orphanLines = config.orphanLines ?? 2;
  const minLinesForSplit = widowLines + orphanLines;

  // Check if widowControl is enabled (defaults to true per ECMA-376)
  const widowControlEnabled = hint?.widowControl !== false;

  // Check if paragraph should be kept together
  const keepTogether = hint?.keepTogether === true;

  if (paragraphHeight <= remainingSpace) {
    // Paragraph fits entirely - add it with page-relative coordinates
    addParagraphWithOffset(state, paragraph, xOffset);
  } else if (keepTogether) {
    // Keep together is set - move entire paragraph to next page
    startNewPage(state, config);
    addParagraphWithOffset(state, paragraph, xOffset);
  } else if (widowControlEnabled && paragraph.lines.length <= minLinesForSplit) {
    // Widow control: short paragraphs should not be split
    // If the paragraph has too few lines, move it entirely to the next page
    startNewPage(state, config);
    addParagraphWithOffset(state, paragraph, xOffset);
  } else {
    // Paragraph doesn't fit and can be split
    // For now, just move to next page (proper splitting is complex)
    // TODO: Implement proper paragraph splitting with widow/orphan lines
    startNewPage(state, config);
    addParagraphWithOffset(state, paragraph, xOffset);
  }

  state.totalHeight = Math.max(
    state.totalHeight,
    state.currentPage.pageStartY + state.currentPage.currentY,
  );
}

/**
 * Add a paragraph with the given X offset, adjusting Y position.
 */
function addParagraphWithOffset(
  state: FlowState,
  paragraph: LayoutParagraphResult,
  xOffset: number,
): void {
  const paragraphHeight = getParagraphHeight(paragraph);
  const originalFirstLineY = paragraph.lines.length > 0
    ? (paragraph.lines[0].y as number) - (paragraph.lines[0].height as number) * 0.8
    : 0;
  const yOffset = state.currentPage.currentY - originalFirstLineY;
  const adjustedParagraph = adjustParagraphPosition(paragraph, xOffset, yOffset);
  state.currentPage.paragraphs.push(adjustedParagraph);
  state.currentPage.currentY += paragraphHeight;
}

/**
 * Handle section break.
 *
 * @see ECMA-376-1:2016 Section 17.18.77 (ST_SectionMark)
 */
function handleSectionBreak(
  state: FlowState,
  config: PageFlowConfig,
  breakType: SectionBreakType,
): void {
  switch (breakType) {
    case "nextPage":
      // Start a new page
      if (state.currentPage.paragraphs.length > 0) {
        startNewPage(state, config);
      }
      break;

    case "evenPage": {
      // Start on next even page (page 2, 4, 6...)
      // First ensure we're on a new page
      if (state.currentPage.paragraphs.length > 0) {
        startNewPage(state, config);
      }
      // If we're on an odd page (1, 3, 5...), add another blank page
      const nextPageNum = state.pages.length + 1;
      if (nextPageNum % 2 !== 0) {
        startNewPage(state, config);
      }
      break;
    }

    case "oddPage": {
      // Start on next odd page (page 1, 3, 5...)
      // First ensure we're on a new page
      if (state.currentPage.paragraphs.length > 0) {
        startNewPage(state, config);
      }
      // If we're on an even page (2, 4, 6...), add another blank page
      const nextPageNum = state.pages.length + 1;
      if (nextPageNum % 2 === 0) {
        startNewPage(state, config);
      }
      break;
    }

    case "continuous":
      // No page break - continue on same page
      break;

    case "nextColumn":
      // Column break - not supported yet, treat as continuous
      break;
  }
}

/**
 * Check if paragraphs can fit in remaining space.
 * Used for keepWithNext calculations.
 */
function canFitInRemainingSpace(
  state: FlowState,
  paragraphsToFit: readonly LayoutParagraphResult[],
  config: PageFlowConfig,
): boolean {
  const contentHeight = getContentHeight(config);
  const remainingSpace = contentHeight - state.currentPage.currentY + (config.marginTop as number);
  const totalHeight = paragraphsToFit.reduce(
    (sum, para) => sum + getParagraphHeight(para),
    0,
  );
  return totalHeight <= remainingSpace;
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

    // Handle page break before (from paragraph properties)
    if (hint?.breakBefore === true && state.currentPage.paragraphs.length > 0) {
      startNewPage(state, config);
    }

    // Handle keepWithNext: check if current and next paragraph fit together
    // @see ECMA-376-1:2016 Section 17.3.1.14 (keepNext)
    if (hint?.keepWithNext === true && i + 1 < paragraphs.length) {
      const nextParagraph = paragraphs[i + 1];
      const paragraphsToKeep = [paragraph, nextParagraph];

      // If both don't fit on current page and we have content, start new page
      if (
        !canFitInRemainingSpace(state, paragraphsToKeep, config) &&
        state.currentPage.paragraphs.length > 0
      ) {
        startNewPage(state, config);
      }
    }

    // Add paragraph to page (with hint for widow/orphan control)
    addParagraphToPage(state, paragraph, config, hint);

    // Handle inline page breaks (w:br type="page")
    // Check if any line in the paragraph has pageBreakAfter
    const hasInlinePageBreak = paragraph.lines.some((line) => line.pageBreakAfter === true);
    if (hasInlinePageBreak) {
      startNewPage(state, config);
    }

    // Handle section breaks after paragraph
    if (hint?.sectionBreakAfter !== undefined) {
      handleSectionBreak(state, config, hint.sectionBreakAfter);
    }
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
