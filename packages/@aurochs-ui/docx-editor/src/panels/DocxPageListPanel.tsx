/**
 * @file DocxPageListPanel - Left panel for page navigation
 *
 * Readonly page thumbnail list using the shared ItemList component.
 * Follows the same pattern as PdfPageListPanel.
 */

import { useCallback, useMemo } from "react";
import type { PageLayout, LayoutResult } from "@aurochs-office/text-layout";
import { TextOverlay } from "@aurochs-office/text-layout";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { ItemList, thumbnailInnerStyle } from "@aurochs-ui/editor-controls/item-list";
import { useEditorShellContext } from "@aurochs-ui/editor-controls/editor-shell";

// =============================================================================
// Types
// =============================================================================

export type DocxPageListPanelProps = {
  readonly pages: readonly PageLayout[];
  readonly currentPageIndex: number;
  readonly onPageSelect: (pageIndex: number) => void;
};

type DocxPageItem = {
  readonly id: number;
  readonly page: PageLayout;
};

// =============================================================================
// Page Thumbnail
// =============================================================================

function PageThumbnail({ page }: { readonly page: PageLayout }) {
  const layoutResult: LayoutResult = useMemo(() => ({
    paragraphs: page.paragraphs,
    totalHeight: page.height,
    yOffset: px(0),
    writingMode: "horizontal-tb",
  }), [page]);

  return (
    <div style={thumbnailInnerStyle}>
      <svg
        style={{ width: "100%", height: "100%", backgroundColor: "white" }}
        viewBox={`0 0 ${page.width as number} ${page.height as number}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <TextOverlay layoutResult={layoutResult} showCursor={false} />
      </svg>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

/** Page list panel with thumbnails for the DOCX editor. */
export function DocxPageListPanel({
  pages,
  currentPageIndex,
  onPageSelect,
}: DocxPageListPanelProps) {
  const shell = useEditorShellContext();

  const handlePageClick = useCallback(
    (id: number) => {
      onPageSelect(id);
      shell?.dismissDrawer("left");
    },
    [onPageSelect, shell],
  );

  const items = useMemo(
    () => pages.map((page, i) => ({ id: i, page })),
    [pages],
  );

  const itemWidth = pages[0]?.width ?? 612;
  const itemHeight = pages[0]?.height ?? 792;

  return (
    <ItemList<DocxPageItem, number>
      items={items}
      itemWidth={itemWidth}
      itemHeight={itemHeight}
      orientation="vertical"
      mode="readonly"
      activeItemId={currentPageIndex}
      itemLabel="ページ"
      renderThumbnail={(item) => <PageThumbnail page={item.page} />}
      onItemClick={handlePageClick}
    />
  );
}
