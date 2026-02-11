/**
 * @file EmbeddableDocument
 *
 * Lightweight embeddable document viewer for iframes or cards.
 */

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import type { PageLayout } from "@aurochs-office/text-layout";
import { PageRenderer } from "@aurochs-renderer/docx/react";
import { ZoomControls, getNextZoomValue } from "@aurochs-ui/editor-controls/zoom";
import { colorTokens, shadowTokens } from "@aurochs-ui/ui-components/design-tokens";
import {
  EmbeddableContainer,
  EmbeddableContent,
  EmbeddableFooter,
  PositionIndicator,
  NavigationControls,
  useItemNavigation,
  useViewerKeyboard,
} from "@aurochs-ui/ui-components/viewer";

export type EmbeddableDocumentProps = {
  /** All pages in the document */
  readonly pages: readonly PageLayout[];
  /** Initial page to display (1-based, default: 1) */
  readonly initialPage?: number;
  /** Initial zoom level (default: 1.0) */
  readonly initialZoom?: number;
  /** Show navigation controls */
  readonly showNavigation?: boolean;
  /** Show page indicator */
  readonly showPageIndicator?: boolean;
  /** Show zoom controls */
  readonly showZoom?: boolean;
  /** Maximum width of the container */
  readonly maxWidth?: string | number;
  /** Maximum height of the container */
  readonly maxHeight?: string | number;
  /** Callback when page changes */
  readonly onPageChange?: (pageNumber: number) => void;
  /** Additional CSS class */
  readonly className?: string;
  /** Additional inline styles */
  readonly style?: CSSProperties;
};

const pageContainerStyle: CSSProperties = {
  position: "relative",
  backgroundColor: colorTokens.background.primary,
  boxShadow: shadowTokens.md,
  transformOrigin: "top center",
};

function getPageStyle(zoom: number): CSSProperties {
  return {
    ...pageContainerStyle,
    transform: `scale(${zoom})`,
  };
}

/**
 * Lightweight embeddable document viewer.
 */
export function EmbeddableDocument({
  pages,
  initialPage = 1,
  initialZoom = 1.0,
  showNavigation = true,
  showPageIndicator = true,
  showZoom = false,
  maxWidth,
  maxHeight,
  onPageChange,
  className,
  style,
}: EmbeddableDocumentProps) {
  const nav = useItemNavigation({
    totalItems: pages.length,
    initialIndex: initialPage - 1,
    onItemChange: (index) => onPageChange?.(index + 1),
  });

  const [zoom, setZoom] = useState(initialZoom);

  const handleZoomIn = useCallback(() => {
    setZoom(getNextZoomValue(zoom, "in"));
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(getNextZoomValue(zoom, "out"));
  }, [zoom]);

  useViewerKeyboard(
    useMemo(
      () => ({
        goToNext: nav.goToNext,
        goToPrev: nav.goToPrev,
        goToFirst: nav.goToFirst,
        goToLast: nav.goToLast,
        zoomIn: handleZoomIn,
        zoomOut: handleZoomOut,
      }),
      [nav, handleZoomIn, handleZoomOut],
    ),
  );

  const currentPage = pages[nav.currentIndex];

  if (currentPage === undefined) {
    return null;
  }

  return (
    <EmbeddableContainer maxWidth={maxWidth} maxHeight={maxHeight} style={style} className={className}>
      <EmbeddableContent>
        <div
          style={{
            ...getPageStyle(zoom),
            width: currentPage.width as number,
            height: currentPage.height as number,
          }}
        >
          <PageRenderer page={currentPage} pageIndex={nav.currentIndex} showCursor={false} />
        </div>
      </EmbeddableContent>

      <EmbeddableFooter
        left={
          <>
            {showNavigation && (
              <NavigationControls
                onPrev={nav.goToPrev}
                onNext={nav.goToNext}
                canGoPrev={!nav.isFirst}
                canGoNext={!nav.isLast}
                variant="minimal"
              />
            )}
            {showPageIndicator && (
              <PositionIndicator current={nav.currentNumber} total={nav.totalItems} variant="minimal" />
            )}
          </>
        }
        right={showZoom && <ZoomControls zoom={zoom} onZoomChange={setZoom} />}
      />
    </EmbeddableContainer>
  );
}
