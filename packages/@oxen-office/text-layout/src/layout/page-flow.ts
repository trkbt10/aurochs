/**
 * @file Page Flow Engine
 *
 * Splits laid-out paragraphs into pages for continuous document display.
 * Handles page breaks, widow/orphan control, and keep-together rules.
 */

import type { Pixels } from "@oxen-office/ooxml/domain/units";
import { px } from "@oxen-office/ooxml/domain/units";
import {
  SPEC_DEFAULT_PAGE_WIDTH_TWIPS,
  SPEC_DEFAULT_PAGE_HEIGHT_TWIPS,
  SPEC_DEFAULT_MARGIN_TWIPS,
  twipsToPx,
} from "@oxen-office/docx/domain/ecma376-defaults";
import type {
  LayoutParagraphResult,
  LayoutLine,
  PageLayout,
  PagedLayoutResult,
  WritingMode,
  FloatingImageConfig,
  PositionedFloatingImage,
} from "../types";
import { isVertical } from "../writing-mode";

// =============================================================================
// Types
// =============================================================================

/**
 * Column configuration for multi-column layout.
 *
 * @see ECMA-376-1:2016 Section 17.6.4 (cols)
 */
export type ColumnConfig = {
  /** Number of columns (default: 1) */
  readonly num: number;
  /** Space between columns in pixels */
  readonly space: Pixels;
  /** Equal column widths (if true, columns are equal width) */
  readonly equalWidth: boolean;
  /** Individual column widths (only used if equalWidth is false) */
  readonly columnWidths?: readonly Pixels[];
};

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
  /**
   * Distance from top edge to header content in pixels.
   * @see ECMA-376-1:2016 Section 17.6.11 (pgMar - header)
   */
  readonly headerDistance?: Pixels;
  /**
   * Distance from bottom edge to footer content in pixels.
   * @see ECMA-376-1:2016 Section 17.6.11 (pgMar - footer)
   */
  readonly footerDistance?: Pixels;
  /** Writing mode for text direction */
  readonly writingMode?: WritingMode;
  /** Minimum lines to keep at bottom of page (widows) */
  readonly widowLines?: number;
  /** Minimum lines to keep at top of page (orphans) */
  readonly orphanLines?: number;
  /** Column configuration for multi-column layout */
  readonly columns?: ColumnConfig;
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
  /** Floating images to position on pages */
  readonly floatingImages?: readonly FloatingImageConfig[];
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
// Vertical Text Coordinate Transformation (ECMA-376 Section 17.18.93)
// =============================================================================

/**
 * Transform a line's coordinates from logical (horizontal) to physical (vertical-rl).
 *
 * ECMA-376-1:2016 Section 17.18.93 defines tbRl (top-to-bottom, right-to-left):
 * - Inline direction: top to bottom (text flows downward)
 * - Block direction: right to left (columns flow from right edge)
 *
 * Logical coordinates (horizontal layout):
 * - x = inline position (left to right, includes marginLeft)
 * - y = block position (baseline Y, includes marginTop)
 * - width = inline extent (text width)
 * - height = block extent (line height)
 *
 * Physical coordinates (vertical-rl layout):
 * - x = block position (right to left from page right edge)
 * - y = inline position (top to bottom)
 * - width = block extent (column width = line height)
 * - height = inline extent (column height = text width)
 *
 * @param line - Line with logical coordinates
 * @param config - Page configuration
 * @returns Line with physical coordinates for vertical-rl rendering
 */
function transformLineToVerticalRl(
  line: LayoutLine,
  config: PageFlowConfig,
): LayoutLine {
  const marginLeft = config.marginLeft as number;
  const marginRight = config.marginRight as number;
  const marginTop = config.marginTop as number;
  const pageWidth = config.pageWidth as number;

  const logicalX = line.x as number;
  const logicalY = line.y as number;
  const logicalWidth = line.width as number;
  const logicalHeight = line.height as number;

  // Block offset from content start (how far down the column is from the first column)
  const blockOffset = logicalY - marginTop;

  // Physical X: columns flow right-to-left
  // First column starts at right edge of content area
  // X is the LEFT edge of the column box
  const physicalX = pageWidth - marginRight - blockOffset - logicalHeight;

  // Physical Y: inline position becomes vertical position
  // marginTop becomes the inline start
  const physicalY = marginTop + (logicalX - marginLeft);

  return {
    ...line,
    x: px(physicalX),
    y: px(physicalY),
    width: px(logicalHeight),  // Block extent becomes width
    height: px(logicalWidth),  // Inline extent becomes height
  };
}

/**
 * Transform a line's coordinates from logical (horizontal) to physical (vertical-lr).
 *
 * ECMA-376-1:2016 Section 17.18.93 defines tbLrV (top-to-bottom, left-to-right):
 * - Inline direction: top to bottom
 * - Block direction: left to right (columns flow from left edge)
 */
function transformLineToVerticalLr(
  line: LayoutLine,
  config: PageFlowConfig,
): LayoutLine {
  const marginLeft = config.marginLeft as number;
  const marginTop = config.marginTop as number;

  const logicalX = line.x as number;
  const logicalY = line.y as number;
  const logicalWidth = line.width as number;
  const logicalHeight = line.height as number;

  // Block offset from content start
  const blockOffset = logicalY - marginTop;

  // Physical X: columns flow left-to-right from left margin
  const physicalX = marginLeft + blockOffset;

  // Physical Y: inline position becomes vertical position
  const physicalY = marginTop + (logicalX - marginLeft);

  return {
    ...line,
    x: px(physicalX),
    y: px(physicalY),
    width: px(logicalHeight),
    height: px(logicalWidth),
  };
}

/**
 * Transform a paragraph's coordinates for vertical writing mode.
 */
function transformParagraphForVertical(
  paragraph: LayoutParagraphResult,
  writingMode: WritingMode,
  config: PageFlowConfig,
): LayoutParagraphResult {
  if (writingMode === "horizontal-tb") {
    return paragraph;
  }

  const transformLine = getLineTransformerForVertical(writingMode, config);

  return {
    ...paragraph,
    lines: paragraph.lines.map(transformLine),
  };
}

function getLineTransformerForVertical(
  writingMode: Exclude<WritingMode, "horizontal-tb">,
  config: PageFlowConfig,
): (line: LayoutLine) => LayoutLine {
  if (writingMode === "vertical-rl") {
    return (line) => transformLineToVerticalRl(line, config);
  }
  return (line) => transformLineToVerticalLr(line, config);
}

/**
 * Transform page dimensions for vertical writing mode.
 * In vertical mode, logical width/height are swapped for physical display.
 */
function transformPageForVertical(
  page: PageLayout,
  writingMode: WritingMode,
  config: PageFlowConfig,
): PageLayout {
  if (writingMode === "horizontal-tb") {
    return page;
  }

  return {
    ...page,
    // Swap page dimensions for vertical layout
    width: config.pageHeight,
    height: config.pageWidth,
    paragraphs: page.paragraphs.map((para) =>
      transformParagraphForVertical(para, writingMode, config)
    ),
  };
}

/**
 * Split a paragraph at a specific line index.
 * Returns two paragraph results: lines before the split and lines after.
 *
 * @param paragraph - The paragraph to split
 * @param splitIndex - The line index where the split occurs (lines 0 to splitIndex-1 in first part)
 * @returns Tuple of [first part, second part] or null if split is not possible
 */
function splitParagraphAtLine(
  paragraph: LayoutParagraphResult,
  splitIndex: number,
): [LayoutParagraphResult, LayoutParagraphResult] | null {
  if (splitIndex <= 0 || splitIndex >= paragraph.lines.length) {
    return null;
  }

  const firstLines = paragraph.lines.slice(0, splitIndex);
  const secondLines = paragraph.lines.slice(splitIndex);

  // First part keeps the bullet (if any)
  const firstPart: LayoutParagraphResult = {
    ...paragraph,
    lines: firstLines,
  };

  // Second part has no bullet (continuation)
  const secondPart: LayoutParagraphResult = {
    ...paragraph,
    lines: secondLines,
    bullet: undefined,
    bulletWidth: px(0),
  };

  return [firstPart, secondPart];
}

/**
 * Calculate how many lines can fit in the remaining space.
 */
function countLinesThatFit(
  paragraph: LayoutParagraphResult,
  remainingSpace: number,
): number {
  const accumulated = { height: 0, count: 0 };

  for (const line of paragraph.lines) {
    const lineHeight = line.height as number;
    if (accumulated.height + lineHeight > remainingSpace) {
      break;
    }
    accumulated.height += lineHeight;
    accumulated.count++;
  }

  return accumulated.count;
}

/**
 * Get height of first N lines of a paragraph.
 */

// =============================================================================
// Page Flow Algorithm
// =============================================================================

type PageState = {
  paragraphs: LayoutParagraphResult[];
  currentY: number;
  pageStartY: number;
  /** Current column index (0-based) */
  currentColumn: number;
};

type FlowState = {
  pages: PageLayout[];
  currentPage: PageState;
  totalHeight: number;
};

/**
 * Get column configuration with defaults.
 */
function getColumnConfig(config: PageFlowConfig): ColumnConfig {
  if (config.columns !== undefined) {
    return config.columns;
  }
  // Default: single column
  return {
    num: 1,
    space: px(0),
    equalWidth: true,
  };
}

/**
 * Calculate column width for a given column index.
 */
function getColumnWidth(config: PageFlowConfig, columnIndex: number): number {
  const columns = getColumnConfig(config);
  const contentWidth = (config.pageWidth as number) - (config.marginLeft as number) - (config.marginRight as number);

  if (columns.num <= 1) {
    return contentWidth;
  }

  if (columns.equalWidth) {
    const totalSpacing = (columns.space as number) * (columns.num - 1);
    return (contentWidth - totalSpacing) / columns.num;
  }

  // Use individual column widths if specified
  if (columns.columnWidths !== undefined && columnIndex < columns.columnWidths.length) {
    return columns.columnWidths[columnIndex] as number;
  }

  // Fallback to equal width
  const totalSpacing = (columns.space as number) * (columns.num - 1);
  return (contentWidth - totalSpacing) / columns.num;
}

/**
 * Calculate X offset for a given column index.
 */
function getColumnXOffset(config: PageFlowConfig, columnIndex: number): number {
  const columns = getColumnConfig(config);
  const marginLeft = config.marginLeft as number;

  if (columns.num <= 1 || columnIndex === 0) {
    return marginLeft;
  }

  return Array.from({ length: columnIndex }, (_, i) => i).reduce(
    (offset, i) => offset + getColumnWidth(config, i) + (columns.space as number),
    marginLeft,
  );
}

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
    currentColumn: 0, // Reset to first column
  };
}

/**
 * Start the next column on the current page.
 * If already on the last column, starts a new page.
 *
 * @see ECMA-376-1:2016 Section 17.18.77 (ST_SectionMark - nextColumn)
 */
function startNextColumn(
  state: FlowState,
  config: PageFlowConfig,
): void {
  const columns = getColumnConfig(config);

  // If single column or on last column, start a new page
  if (columns.num <= 1 || state.currentPage.currentColumn >= columns.num - 1) {
    startNewPage(state, config);
    return;
  }

  // Move to next column on same page
  state.currentPage.currentColumn++;
  state.currentPage.currentY = config.marginTop as number;
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
  ...args: readonly [
    state: FlowState,
    paragraph: LayoutParagraphResult,
    config: PageFlowConfig,
    hint?: PageBreakHint,
  ]
): void {
  const [state, paragraph, config, hint] = args;
  const contentHeight = getContentHeight(config);
  const paragraphHeight = getParagraphHeight(paragraph);

  // X offset based on current column
  const xOffset = getColumnXOffset(config, state.currentPage.currentColumn);

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
    // Paragraph doesn't fit and can be split with widow/orphan control
    const linesThatFit = countLinesThatFit(paragraph, remainingSpace);

    if (widowControlEnabled) {
      // Check if we can satisfy widow/orphan constraints
      const linesRemaining = paragraph.lines.length - linesThatFit;

      // Can't satisfy orphan constraint - move entire paragraph
      if (linesThatFit < orphanLines) {
        startNewPage(state, config);
        addParagraphWithOffset(state, paragraph, xOffset);
        return;
      }

      // Can't satisfy widow constraint - move entire paragraph
      if (linesRemaining < widowLines) {
        startNewPage(state, config);
        addParagraphWithOffset(state, paragraph, xOffset);
        return;
      }

      // Both constraints can be satisfied - split at linesThatFit
      const splitResult = splitParagraphAtLine(paragraph, linesThatFit);
      if (splitResult !== null) {
        const [firstPart, secondPart] = splitResult;
        // Add first part to current page
        addParagraphWithOffset(state, firstPart, xOffset);
        // Start new page and add second part
        startNewPage(state, config);
        addParagraphWithOffset(state, secondPart, xOffset);
      } else {
        // Split failed, move entire paragraph
        startNewPage(state, config);
        addParagraphWithOffset(state, paragraph, xOffset);
      }
    } else {
      // Widow control disabled - split at any line that fits
      if (linesThatFit > 0) {
        const splitResult = splitParagraphAtLine(paragraph, linesThatFit);
        if (splitResult !== null) {
          const [firstPart, secondPart] = splitResult;
          addParagraphWithOffset(state, firstPart, xOffset);
          startNewPage(state, config);
          addParagraphWithOffset(state, secondPart, xOffset);
        } else {
          startNewPage(state, config);
          addParagraphWithOffset(state, paragraph, xOffset);
        }
      } else {
        // No lines fit, move entire paragraph
        startNewPage(state, config);
        addParagraphWithOffset(state, paragraph, xOffset);
      }
    }
    return; // Already handled totalHeight update in recursive calls
  }

  state.totalHeight = Math.max(
    state.totalHeight,
    state.currentPage.pageStartY + state.currentPage.currentY,
  );
}

/**
 * Add a paragraph with the given X offset, adjusting Y position.
 */
function getOriginalFirstLineY(paragraph: LayoutParagraphResult): number {
  const firstLine = paragraph.lines[0];
  if (firstLine === undefined) {
    return 0;
  }
  return (firstLine.y as number) - (firstLine.height as number) * 0.8;
}

function addParagraphWithOffset(
  state: FlowState,
  paragraph: LayoutParagraphResult,
  xOffset: number,
): void {
  const paragraphHeight = getParagraphHeight(paragraph);
  const originalFirstLineY = getOriginalFirstLineY(paragraph);
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
      // Column break - move to next column or new page if on last column
      startNextColumn(state, config);
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

// =============================================================================
// Floating Image Positioning
// =============================================================================

/**
 * Find the page index for a paragraph.
 */
function findPageForParagraph(
  pages: readonly PageLayout[],
  paragraphIndex: number,
): number {
  const resolved = pages.reduce(
    (acc, page, pageIndex) => {
      if (acc.pageIndex !== undefined) {
        return acc;
      }
      const nextParagraphCount = acc.paragraphCount + page.paragraphs.length;
      if (nextParagraphCount > paragraphIndex) {
        return { paragraphCount: nextParagraphCount, pageIndex };
      }
      return { paragraphCount: nextParagraphCount, pageIndex: undefined };
    },
    { paragraphCount: 0, pageIndex: undefined as number | undefined },
  );

  return resolved.pageIndex ?? Math.max(0, pages.length - 1);
}

/**
 * Get paragraph Y position for vertical reference.
 */
function getParagraphY(
  pages: readonly PageLayout[],
  paragraphIndex: number,
): number {
  const paragraphs = pages.flatMap((page) => page.paragraphs);
  const paragraph = paragraphs[paragraphIndex];
  const firstLine = paragraph?.lines[0];
  return firstLine !== undefined ? firstLine.y as number : 0;
}

/**
 * Calculate horizontal position for floating image.
 */
function calculateHorizontalPosition(
  image: FloatingImageConfig,
  config: PageFlowConfig,
): number {
  const pageWidth = config.pageWidth as number;
  const marginLeft = config.marginLeft as number;
  const marginRight = config.marginRight as number;
  const contentWidth = pageWidth - marginLeft - marginRight;

  // Handle alignment
  if (image.horizontalAlign !== undefined) {
    switch (image.horizontalAlign) {
      case "left":
        return getHorizontalRefX(image.horizontalRef, config);
      case "right":
        return getHorizontalRefX(image.horizontalRef, config) + contentWidth - (image.width as number);
      case "center":
        return getHorizontalRefX(image.horizontalRef, config) + (contentWidth - (image.width as number)) / 2;
      case "inside":
        return marginLeft; // Same as left for now
      case "outside":
        return pageWidth - marginRight - (image.width as number);
    }
  }

  // Handle offset
  return getHorizontalRefX(image.horizontalRef, config) + (image.horizontalOffset as number);
}

/**
 * Get X reference position based on horizontal reference type.
 */
function getHorizontalRefX(ref: FloatingImageConfig["horizontalRef"], config: PageFlowConfig): number {
  const pageWidth = config.pageWidth as number;
  const marginLeft = config.marginLeft as number;
  const marginRight = config.marginRight as number;

  switch (ref) {
    case "page":
      return 0;
    case "margin":
    case "column":
      return marginLeft;
    case "leftMargin":
      return 0;
    case "rightMargin":
      return pageWidth - marginRight;
    case "insideMargin":
      return marginLeft; // Same as left for non-facing pages
    case "outsideMargin":
      return pageWidth - marginRight;
    case "character":
      return marginLeft; // Fall back to column
  }
}

/**
 * Calculate vertical position for floating image.
 */
function calculateVerticalPosition(
  image: FloatingImageConfig,
  config: PageFlowConfig,
  paragraphY: number,
): number {
  const pageHeight = config.pageHeight as number;
  const marginTop = config.marginTop as number;
  const marginBottom = config.marginBottom as number;
  const contentHeight = pageHeight - marginTop - marginBottom;

  // Handle alignment
  if (image.verticalAlign !== undefined) {
    switch (image.verticalAlign) {
      case "top":
        return getVerticalRefY(image.verticalRef, config, paragraphY);
      case "bottom":
        return getVerticalRefY(image.verticalRef, config, paragraphY) + contentHeight - (image.height as number);
      case "center":
        return getVerticalRefY(image.verticalRef, config, paragraphY) + (contentHeight - (image.height as number)) / 2;
      case "inside":
        return marginTop;
      case "outside":
        return pageHeight - marginBottom - (image.height as number);
    }
  }

  // Handle offset
  return getVerticalRefY(image.verticalRef, config, paragraphY) + (image.verticalOffset as number);
}

/**
 * Get Y reference position based on vertical reference type.
 */
function getVerticalRefY(
  ref: FloatingImageConfig["verticalRef"],
  config: PageFlowConfig,
  paragraphY: number,
): number {
  const pageHeight = config.pageHeight as number;
  const marginTop = config.marginTop as number;
  const marginBottom = config.marginBottom as number;

  switch (ref) {
    case "page":
      return 0;
    case "margin":
      return marginTop;
    case "paragraph":
    case "line":
      return paragraphY;
    case "topMargin":
      return 0;
    case "bottomMargin":
      return pageHeight - marginBottom;
    case "insideMargin":
      return marginTop;
    case "outsideMargin":
      return pageHeight - marginBottom;
  }
}

/**
 * Position floating images on pages.
 */
function positionFloatingImages(
  floatingImages: readonly FloatingImageConfig[],
  pages: readonly PageLayout[],
  config: PageFlowConfig,
): Map<number, { behind: PositionedFloatingImage[]; front: PositionedFloatingImage[] }> {
  const imagesByPage = new Map<number, { behind: PositionedFloatingImage[]; front: PositionedFloatingImage[] }>();

  for (const image of floatingImages) {
    // Find page for this image based on its anchor paragraph
    const paragraphIndex = image.anchorParagraphIndex ?? 0;
    const pageIndex = findPageForParagraph(pages, paragraphIndex);
    const page = pages[pageIndex];

    if (page === undefined) {
      continue;
    }

    // Get paragraph Y for positioning
    const paragraphY = getParagraphY(pages, paragraphIndex);

    // Calculate X and Y positions
    const x = calculateHorizontalPosition(image, config);
    const y = calculateVerticalPosition(image, config, paragraphY);

    const positionedImage: PositionedFloatingImage = {
      ...image,
      x: px(x),
      y: px(y),
    };

    // Add to page's image list
    if (!imagesByPage.has(pageIndex)) {
      imagesByPage.set(pageIndex, { behind: [], front: [] });
    }

    const pageImages = imagesByPage.get(pageIndex);
    if (pageImages !== undefined) {
      if (image.behindDoc) {
        pageImages.behind.push(positionedImage);
      } else {
        pageImages.front.push(positionedImage);
      }
    }
  }

  // Sort images by relativeHeight for z-ordering
  for (const [, images] of imagesByPage) {
    images.behind.sort((a, b) => a.relativeHeight - b.relativeHeight);
    images.front.sort((a, b) => a.relativeHeight - b.relativeHeight);
  }

  return imagesByPage;
}

function addFloatingImagesToPages(
  pages: readonly PageLayout[],
  floatingImages: readonly FloatingImageConfig[],
  config: PageFlowConfig,
): PageLayout[] {
  const imagesByPage = positionFloatingImages(floatingImages, pages, config);
  return pages.map((page, pageIndex) => {
    const pageImages = imagesByPage.get(pageIndex);
    if (pageImages === undefined) {
      return page;
    }
    return {
      ...page,
      floatingImagesBehind: pageImages.behind.length > 0 ? pageImages.behind : undefined,
      floatingImagesFront: pageImages.front.length > 0 ? pageImages.front : undefined,
    };
  });
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
      currentColumn: 0,
    },
    totalHeight: 0,
  };

  // Process each paragraph
  paragraphs.forEach((paragraph, i) => {
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
  });

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

  // Position floating images on pages
  const floatingImages = input.floatingImages ?? [];
  const writingMode = config.writingMode ?? "horizontal-tb";

  const pagesWithImages = addFloatingImagesToPagesIfNeeded(state.pages, floatingImages, config);
  const finalPages = transformPagesForWritingMode(pagesWithImages, writingMode, config);

  return {
    pages: finalPages,
    totalHeight: px(state.totalHeight),
    writingMode,
  };
}

function addFloatingImagesToPagesIfNeeded(
  pages: readonly PageLayout[],
  floatingImages: readonly FloatingImageConfig[],
  config: PageFlowConfig,
): PageLayout[] {
  if (floatingImages.length === 0) {
    return [...pages];
  }
  return addFloatingImagesToPages(pages, floatingImages, config);
}

function transformPagesForWritingMode(
  pages: readonly PageLayout[],
  writingMode: WritingMode,
  config: PageFlowConfig,
): PageLayout[] {
  if (!isVertical(writingMode)) {
    return [...pages];
  }
  return pages.map((page) => transformPageForVertical(page, writingMode, config));
}

// =============================================================================
// Single Page Mode
// =============================================================================

/**
 * Create a single-page layout (no pagination).
 * Useful for preview or infinite scroll mode.
 *
 * @param paragraphs - Paragraphs to include
 * @param pageWidth - Page width in pixels
 * @param totalHeight - Total height in pixels
 * @param config - Optional page config for vertical text transformation
 */
export function createSinglePageLayout(
  ...args: readonly [
    paragraphs: readonly LayoutParagraphResult[],
    pageWidth: Pixels,
    totalHeight: Pixels,
    config?: PageFlowConfig,
  ]
): PagedLayoutResult {
  const [paragraphs, pageWidth, totalHeight, config] = args;
  const writingMode = config?.writingMode ?? "horizontal-tb";

  // For vertical mode, transform coordinates and swap dimensions
  if (isVertical(writingMode) && config !== undefined) {
    const transformedParagraphs = paragraphs.map((para) =>
      transformParagraphForVertical(para, writingMode, config)
    );

    return {
      pages: [
        {
          pageIndex: 0,
          y: px(0),
          height: pageWidth,  // Swap: logical width becomes physical height
          width: totalHeight as Pixels,  // Swap: logical height becomes physical width
          paragraphs: [...transformedParagraphs],
        },
      ],
      totalHeight: pageWidth,  // Physical height is the logical width
      writingMode,
    };
  }

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
    writingMode,
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
