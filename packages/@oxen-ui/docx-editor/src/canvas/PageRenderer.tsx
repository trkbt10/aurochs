/**
 * @file Page Renderer Component
 *
 * Renders a single page of a DOCX document using SVG.
 * Uses the unified layout engine for text rendering.
 */

import type { ReactNode, CSSProperties } from "react";
import type { Pixels } from "@oxen/ooxml/domain/units";
import { px } from "@oxen/ooxml/domain/units";
import type {
  LayoutResult,
  PageLayout,
  HeaderFooterLayout,
  SelectionRect,
  CursorCoordinates,
} from "@oxen/text-layout";
import { TextOverlay, CURSOR_ANIMATION_CSS } from "@oxen/text-layout";

// =============================================================================
// Types
// =============================================================================

export type PageRendererProps = {
  /** Page layout data */
  readonly page: PageLayout;
  /** Page index */
  readonly pageIndex: number;
  /** Selection rectangles on this page */
  readonly selection?: readonly SelectionRect[];
  /** Cursor coordinates if on this page */
  readonly cursor?: CursorCoordinates;
  /** Whether cursor should blink */
  readonly showCursor?: boolean;
  /** Page click handler */
  readonly onClick?: (pageIndex: number, x: number, y: number) => void;
  /** Page double-click handler */
  readonly onDoubleClick?: (pageIndex: number, x: number, y: number) => void;
};

// =============================================================================
// Page Styles
// =============================================================================

const pageContainerStyle: CSSProperties = {
  position: "relative",
  backgroundColor: "white",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
  marginBottom: "24px",
};

const pageSvgStyle: CSSProperties = {
  display: "block",
  userSelect: "none",
};

// =============================================================================
// Component
// =============================================================================

/**
 * Convert HeaderFooterLayout to LayoutResult for TextOverlay.
 */
function headerFooterToLayoutResult(
  layout: HeaderFooterLayout | undefined,
): LayoutResult | undefined {
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

/**
 * Renders a single page of a DOCX document.
 */
export function PageRenderer({
  page,
  pageIndex,
  selection,
  cursor,
  showCursor = false,
  onClick,
  onDoubleClick,
}: PageRendererProps): ReactNode {
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

  // Filter selection and cursor for this page
  const pageSelection = selection?.filter((rect) => rect.pageIndex === pageIndex);
  const pageCursor = cursor?.pageIndex === pageIndex ? cursor : undefined;

  // Event handlers
  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (onClick === undefined) {
      return;
    }
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    onClick(pageIndex, x, y);
  };

  const handleDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (onDoubleClick === undefined) {
      return;
    }
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    onDoubleClick(pageIndex, x, y);
  };

  return (
    <div
      className="docx-page"
      style={{
        ...pageContainerStyle,
        width: page.width as number,
        height: page.height as number,
      }}
      data-page-index={pageIndex}
    >
      <style>{CURSOR_ANIMATION_CSS}</style>
      <svg
        width={page.width as number}
        height={page.height as number}
        style={pageSvgStyle}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {/* Render header if present */}
        {headerResult !== undefined && page.header !== undefined && (
          <g transform={`translate(0, ${page.header.y as number})`}>
            <TextOverlay
              layoutResult={headerResult}
              selection={undefined}
              cursor={undefined}
              showCursor={false}
            />
          </g>
        )}

        {/* Render main content */}
        <TextOverlay
          layoutResult={layoutResult}
          selection={pageSelection}
          cursor={pageCursor}
          showCursor={showCursor}
        />

        {/* Render footer if present */}
        {footerResult !== undefined && page.footer !== undefined && (
          <g transform={`translate(0, ${page.footer.y as number})`}>
            <TextOverlay
              layoutResult={footerResult}
              selection={undefined}
              cursor={undefined}
              showCursor={false}
            />
          </g>
        )}
      </svg>
    </div>
  );
}

// =============================================================================
// Document Renderer
// =============================================================================

export type DocumentRendererProps = {
  /** All pages in the document */
  readonly pages: readonly PageLayout[];
  /** Selection rectangles */
  readonly selection?: readonly SelectionRect[];
  /** Cursor coordinates */
  readonly cursor?: CursorCoordinates;
  /** Whether cursor should blink */
  readonly showCursor?: boolean;
  /** Page click handler */
  readonly onPageClick?: (pageIndex: number, x: number, y: number) => void;
  /** Page double-click handler */
  readonly onPageDoubleClick?: (pageIndex: number, x: number, y: number) => void;
};

const documentContainerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "24px",
  backgroundColor: "var(--background-secondary, #f0f0f0)",
  minHeight: "100%",
};

/**
 * Renders all pages of a DOCX document.
 */
export function DocumentRenderer({
  pages,
  selection,
  cursor,
  showCursor,
  onPageClick,
  onPageDoubleClick,
}: DocumentRendererProps): ReactNode {
  return (
    <div className="docx-document" style={documentContainerStyle}>
      {pages.map((page, index) => (
        <PageRenderer
          key={index}
          page={page}
          pageIndex={index}
          selection={selection}
          cursor={cursor}
          showCursor={showCursor}
          onClick={onPageClick}
          onDoubleClick={onPageDoubleClick}
        />
      ))}
    </div>
  );
}
