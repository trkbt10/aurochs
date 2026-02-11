/**
 * @file Document Renderer Component
 *
 * Renders all pages of a DOCX document.
 */

import type { ReactNode, CSSProperties } from "react";
import type { PageLayout, SelectionRect, CursorCoordinates } from "@aurochs-office/text-layout";
import { PageRenderer } from "./PageRenderer";

// =============================================================================
// Types
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

// =============================================================================
// Styles
// =============================================================================

const documentContainerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "24px",
  backgroundColor: "var(--background-secondary, #f0f0f0)",
  minHeight: "100%",
};

// =============================================================================
// Component
// =============================================================================

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
