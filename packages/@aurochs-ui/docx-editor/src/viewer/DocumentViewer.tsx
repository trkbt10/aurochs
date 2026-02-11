/**
 * @file DocumentViewer
 *
 * Full-featured document viewer with thumbnail sidebar and navigation.
 */

import { useCallback, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { PageLayout } from "@aurochs-office/text-layout";
import { PageRenderer } from "@aurochs-renderer/docx/react";
import { ZoomControls, getNextZoomValue } from "@aurochs-ui/editor-controls/zoom";
import { spacingTokens, colorTokens, shadowTokens } from "@aurochs-ui/ui-components/design-tokens";
import {
  ViewerContainer,
  ViewerToolbar,
  ViewerMain,
  ViewerSidebar,
  ViewerContent,
  ViewerFooter,
  ThumbnailItem,
  PositionIndicator,
  NavigationControls,
  useItemNavigation,
  useViewerKeyboard,
} from "@aurochs-ui/ui-components/viewer";

export type DocumentViewerProps = {
  /** All pages in the document */
  readonly pages: readonly PageLayout[];
  /** Initial page to display (1-based, default: 1) */
  readonly initialPage?: number;
  /** Initial zoom level (default: 1.0) */
  readonly initialZoom?: number;
  /** Show thumbnail sidebar */
  readonly showThumbnails?: boolean;
  /** Show navigation controls */
  readonly showControls?: boolean;
  /** Show zoom controls */
  readonly showZoom?: boolean;
  /** Show toolbar */
  readonly showToolbar?: boolean;
  /** Callback when page changes */
  readonly onPageChange?: (pageNumber: number) => void;
  /** Callback when zoom changes */
  readonly onZoomChange?: (zoom: number) => void;
  /** Callback when exiting viewer */
  readonly onExit?: () => void;
  /** Custom header content */
  readonly header?: ReactNode;
  /** Custom footer content */
  readonly footer?: ReactNode;
  /** Additional CSS class */
  readonly className?: string;
  /** Additional inline styles */
  readonly style?: CSSProperties;
};

const pageContainerStyle: CSSProperties = {
  position: "relative",
  backgroundColor: colorTokens.background.primary,
  boxShadow: shadowTokens.md,
  marginBottom: spacingTokens.xl,
  transformOrigin: "top center",
};

function getPageStyle(zoom: number): CSSProperties {
  return {
    ...pageContainerStyle,
    transform: `scale(${zoom})`,
  };
}

/**
 * Full-featured document viewer with thumbnail sidebar and navigation.
 */
export function DocumentViewer({
  pages,
  initialPage = 1,
  initialZoom = 1.0,
  showThumbnails = true,
  showControls = true,
  showZoom = true,
  showToolbar = true,
  onPageChange,
  onZoomChange,
  onExit,
  header,
  footer,
  className,
  style,
}: DocumentViewerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const nav = useItemNavigation({
    totalItems: pages.length,
    initialIndex: initialPage - 1,
    onItemChange: (index) => onPageChange?.(index + 1),
  });

  const [zoom, setZoom] = useState(initialZoom);

  const handleZoomChange = useCallback(
    (next: number) => {
      setZoom(next);
      onZoomChange?.(next);
    },
    [onZoomChange],
  );

  const handleZoomIn = useCallback(() => {
    handleZoomChange(getNextZoomValue(zoom, "in"));
  }, [zoom, handleZoomChange]);

  const handleZoomOut = useCallback(() => {
    handleZoomChange(getNextZoomValue(zoom, "out"));
  }, [zoom, handleZoomChange]);

  useViewerKeyboard(
    useMemo(
      () => ({
        goToNext: nav.goToNext,
        goToPrev: nav.goToPrev,
        goToFirst: nav.goToFirst,
        goToLast: nav.goToLast,
        zoomIn: handleZoomIn,
        zoomOut: handleZoomOut,
        onExit,
      }),
      [nav, handleZoomIn, handleZoomOut, onExit],
    ),
  );

  const scrollToPage = useCallback((pageIndex: number) => {
    const pageElement = pageRefs.current.get(pageIndex);
    if (pageElement && scrollContainerRef.current) {
      pageElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleThumbnailClick = useCallback(
    (pageIndex: number) => {
      nav.goToIndex(pageIndex);
      scrollToPage(pageIndex);
    },
    [nav, scrollToPage],
  );

  const handlePageRef = useCallback((pageIndex: number, element: HTMLDivElement | null) => {
    if (element) {
      pageRefs.current.set(pageIndex, element);
    } else {
      pageRefs.current.delete(pageIndex);
    }
  }, []);

  const thumbnailScale = 0.15;

  return (
    <ViewerContainer style={style} className={className}>
      {header}

      {showToolbar && (
        <ViewerToolbar
          left={
            showControls && (
              <NavigationControls
                onPrev={nav.goToPrev}
                onNext={nav.goToNext}
                canGoPrev={!nav.isFirst}
                canGoNext={!nav.isLast}
                variant="inline"
              />
            )
          }
          center={<PositionIndicator current={nav.currentNumber} total={nav.totalItems} variant="default" />}
          right={showZoom && <ZoomControls zoom={zoom} onZoomChange={handleZoomChange} />}
        />
      )}

      <ViewerMain>
        {showThumbnails && (
          <ViewerSidebar title="Pages" count={pages.length}>
            {pages.map((page, index) => {
              const isActive = index === nav.currentIndex;
              return (
                <ThumbnailItem key={index} number={index + 1} active={isActive} onClick={() => handleThumbnailClick(index)}>
                  <div
                    style={{
                      width: (page.width as number) * thumbnailScale,
                      height: (page.height as number) * thumbnailScale,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        transform: `scale(${thumbnailScale})`,
                        transformOrigin: "top left",
                      }}
                    >
                      <PageRenderer page={page} pageIndex={index} showCursor={false} />
                    </div>
                  </div>
                </ThumbnailItem>
              );
            })}
          </ViewerSidebar>
        )}

        <ViewerContent ref={scrollContainerRef}>
          {pages.map((page, index) => (
            <div
              key={index}
              ref={(el) => handlePageRef(index, el)}
              style={{
                ...getPageStyle(zoom),
                width: page.width as number,
                height: page.height as number,
              }}
            >
              <PageRenderer page={page} pageIndex={index} showCursor={false} />
            </div>
          ))}
        </ViewerContent>
      </ViewerMain>

      {footer ?? (
        <ViewerFooter
          left={<PositionIndicator current={nav.currentNumber} total={nav.totalItems} variant="minimal" />}
          right={<span>{Math.round(zoom * 100)}% | Press +/- to zoom</span>}
        />
      )}
    </ViewerContainer>
  );
}
