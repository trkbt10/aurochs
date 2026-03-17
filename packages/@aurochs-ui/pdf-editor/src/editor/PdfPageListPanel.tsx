/**
 * @file PdfPageListPanel - Left panel for page navigation
 *
 * Shows a list of page thumbnails using the shared ItemList component
 * from editor-controls. Shares the same design and interaction patterns
 * as the PPTX slide list.
 */

import { useMemo } from "react";
import type { PdfPage } from "@aurochs/pdf";
import { PDF_PAGE_SIZES } from "@aurochs/pdf";
import { renderPdfPageToSvg } from "@aurochs-renderer/pdf/svg";
import { ItemList } from "@aurochs-ui/editor-controls/item-list";
import { thumbnailInnerStyle } from "@aurochs-ui/editor-controls/item-list";

// =============================================================================
// Types
// =============================================================================

export type PdfPageListPanelProps = {
  readonly pages: readonly PdfPage[];
  readonly currentPageIndex: number;
  readonly onPageSelect: (pageIndex: number) => void;
  readonly onAddPage?: (atIndex: number) => void;
  readonly onDeletePages?: (pageIndices: readonly number[]) => void;
  readonly onDuplicatePages?: (pageIndices: readonly number[]) => void;
  readonly onMovePages?: (pageIndices: readonly number[], toIndex: number) => void;
};

type PdfPageItem = {
  readonly id: number;
  readonly page: PdfPage;
};

// =============================================================================
// Page Thumbnail
// =============================================================================

function extractSvgInner(svgStr: string): string {
  const start = svgStr.indexOf(">") + 1;
  const end = svgStr.lastIndexOf("</svg>");
  return start > 0 && end > start ? svgStr.slice(start, end) : "";
}

function PageThumbnail({ page }: { readonly page: PdfPage }) {
  const innerContent = useMemo(() => extractSvgInner(renderPdfPageToSvg(page)), [page]);
  return (
    <div style={thumbnailInnerStyle}>
      <svg
        style={{ width: "100%", height: "100%" }}
        viewBox={`0 0 ${page.width} ${page.height}`}
        preserveAspectRatio="xMidYMid meet"
        dangerouslySetInnerHTML={{ __html: innerContent }}
      />
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

/** Page list panel with thumbnails for the PDF editor. */
export function PdfPageListPanel({
  pages,
  currentPageIndex,
  onPageSelect,
  onAddPage,
  onDeletePages,
  onDuplicatePages,
  onMovePages,
}: PdfPageListPanelProps) {
  // Build items with id for the generic ItemList
  const items = useMemo(
    () => pages.map((page, i) => ({ id: i, page })),
    [pages],
  );

  // Use first page dimensions for aspect ratio (fallback to US Letter)
  const itemWidth = pages[0]?.width ?? PDF_PAGE_SIZES.US_LETTER.width;
  const itemHeight = pages[0]?.height ?? PDF_PAGE_SIZES.US_LETTER.height;

  // Enable editable mode when any operation callback is provided
  const hasOperations = onAddPage || onDeletePages || onDuplicatePages || onMovePages;

  return (
    <ItemList<PdfPageItem, number>
      items={items}
      itemWidth={itemWidth}
      itemHeight={itemHeight}
      orientation="vertical"
      mode={hasOperations ? "editable" : "readonly"}
      activeItemId={currentPageIndex}
      itemLabel="Page"
      renderThumbnail={(item) => <PageThumbnail page={item.page} />}
      onItemClick={(id) => onPageSelect(id)}
      onAddItem={onAddPage}
      onDeleteItems={onDeletePages}
      onDuplicateItems={onDuplicatePages}
      onMoveItems={onMovePages}
    />
  );
}
