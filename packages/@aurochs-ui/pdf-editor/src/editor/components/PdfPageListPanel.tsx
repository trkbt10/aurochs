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
import type { FontProvider } from "@aurochs/pdf/domain/font";
import { renderPdfPageToSvgNode } from "@aurochs-renderer/pdf/svg";
import { svgElementToJsx } from "@aurochs-renderer/svg";
import { ItemList } from "@aurochs-ui/editor-controls/item-list";
import { thumbnailInnerStyle } from "@aurochs-ui/editor-controls/item-list";

// =============================================================================
// Types
// =============================================================================

export type PdfPageListPanelProps = {
  readonly pages: readonly PdfPage[];
  readonly currentPageIndex: number;
  readonly fontProvider?: FontProvider;
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

function PageThumbnail({ page, fontProvider }: { readonly page: PdfPage; readonly fontProvider?: FontProvider }) {
  const svgElement = useMemo(
    () => svgElementToJsx(renderPdfPageToSvgNode(page, { width: "100%", height: "100%", fontProvider })),
    [page, fontProvider],
  );
  return (
    <div style={thumbnailInnerStyle}>
      {svgElement}
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
  fontProvider,
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
      renderThumbnail={(item) => <PageThumbnail page={item.page} fontProvider={fontProvider} />}
      onItemClick={(id) => onPageSelect(id)}
      onAddItem={onAddPage}
      onDeleteItems={onDeletePages}
      onDuplicateItems={onDuplicatePages}
      onMoveItems={onMovePages}
    />
  );
}
