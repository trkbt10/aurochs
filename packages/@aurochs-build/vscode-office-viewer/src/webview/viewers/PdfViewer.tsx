/**
 * @file PDF page viewer with thumbnail sidebar and navigation.
 *
 * Supports two modes:
 * - **Eager mode** (`PdfDataMessage`): all pages are available as SVG strings
 *   upfront. Used for small PDFs (< INCREMENTAL_THRESHOLD pages).
 * - **Incremental mode** (`PdfMetaMessage`): only page count and first page
 *   are available initially. Additional pages are requested from the extension
 *   host on demand.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { PdfDataMessage, PdfMetaMessage, PdfPageResponseMessage } from "../types";
import { Toolbar, ToolbarSpacer, ToolbarInfo } from "../components/Toolbar";
import { ZoomControl } from "../components/ZoomControl";
import { ThumbnailSidebar } from "../components/ThumbnailSidebar";

type VsCodeApi = {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

/** Get the VS Code API instance exposed by main.tsx. */
function getVsCodeApi(): VsCodeApi {
  return (globalThis as Record<string, unknown>).__vscodeApi as VsCodeApi;
}

/** Viewer component for rendering PDF pages from pre-rendered SVGs (small PDFs). */
export function PdfViewer({ pages }: PdfDataMessage): React.JSX.Element {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const totalPages = pages.length;

  const goToPage = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalPages) {
        setCurrentPage(index);
      }
    },
    [totalPages],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          setCurrentPage((prev) => Math.max(0, prev - 1));
          break;
        case "ArrowRight":
        case "ArrowDown":
        case " ":
          e.preventDefault();
          setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
          break;
        case "Home":
          e.preventDefault();
          setCurrentPage(0);
          break;
        case "End":
          e.preventDefault();
          setCurrentPage(totalPages - 1);
          break;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [totalPages]);

  return (
    <div className="pdf-viewer">
      <Toolbar>
        <vscode-button
          icon="chevron-left"
          secondary
          disabled={currentPage === 0 || undefined}
          onClick={() => goToPage(currentPage - 1)}
        >
          Prev
        </vscode-button>
        <ToolbarInfo>
          Page {currentPage + 1} / {totalPages}
        </ToolbarInfo>
        <vscode-button
          icon-after="chevron-right"
          secondary
          disabled={currentPage === totalPages - 1 || undefined}
          onClick={() => goToPage(currentPage + 1)}
        >
          Next
        </vscode-button>
        <ToolbarSpacer />
        <ZoomControl zoom={zoom} min={25} max={300} onZoomChange={setZoom} />
      </Toolbar>
      <div className="pdf-content">
        <ThumbnailSidebar
          svgs={pages}
          activeIndex={currentPage}
          onSelect={goToPage}
          labelPrefix="Page"
        />
        <div className="main-area">
          <div
            className="pdf-page-container"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            <div
              className="pdf-page"
              dangerouslySetInnerHTML={{ __html: pages[currentPage] }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Incremental PDF viewer for large documents.
 *
 * Receives only metadata initially and requests page SVGs on demand
 * from the extension host. Caches received pages in a Map to avoid
 * re-requesting pages that have already been rendered.
 */
export function PdfIncrementalViewer({ pageCount, firstPageSvg }: PdfMetaMessage): React.JSX.Element {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const totalPages = pageCount;

  // Page SVG cache: 0-based index → SVG string.
  // Initialized with the first page.
  const pageCacheRef = useRef<Map<number, string>>(new Map([[0, firstPageSvg]]));

  // In-flight requests to avoid duplicates.
  const pendingRequestsRef = useRef<Set<number>>(new Set());

  // Force re-render when a page arrives.
  const [, setRenderTick] = useState(0);

  const requestPage = useCallback((pageIndex: number): void => {
    if (pageCacheRef.current.has(pageIndex)) {
      return;
    }
    if (pendingRequestsRef.current.has(pageIndex)) {
      return;
    }

    pendingRequestsRef.current.add(pageIndex);
    const msg = { type: "requestPdfPage" as const, pageIndex };
    getVsCodeApi().postMessage(msg);
  }, []);

  // Listen for page responses from extension.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data as PdfPageResponseMessage;
      if (msg.type === "pdfPage") {
        pageCacheRef.current.set(msg.pageIndex, msg.svg);
        pendingRequestsRef.current.delete(msg.pageIndex);
        setRenderTick((t) => t + 1);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Request current page when it changes.
  useEffect(() => {
    requestPage(currentPage);

    // Prefetch adjacent pages for smooth navigation.
    if (currentPage > 0) {
      requestPage(currentPage - 1);
    }
    if (currentPage < totalPages - 1) {
      requestPage(currentPage + 1);
    }
  }, [currentPage, totalPages]);

  const goToPage = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalPages) {
        setCurrentPage(index);
      }
    },
    [totalPages],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          setCurrentPage((prev) => Math.max(0, prev - 1));
          break;
        case "ArrowRight":
        case "ArrowDown":
        case " ":
          e.preventDefault();
          setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
          break;
        case "Home":
          e.preventDefault();
          setCurrentPage(0);
          break;
        case "End":
          e.preventDefault();
          setCurrentPage(totalPages - 1);
          break;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [totalPages]);

  const currentSvg = pageCacheRef.current.get(currentPage);

  // Build a sparse SVG array for ThumbnailSidebar.
  // Only pages that have been cached get their SVG; others get null.
  const thumbnailSvgs = useCallback((): ReadonlyMap<number, string> => {
    return pageCacheRef.current;
  }, [])();

  function renderCurrentPage(): React.JSX.Element {
    if (currentSvg) {
      return (
        <div
          className="pdf-page"
          dangerouslySetInnerHTML={{ __html: currentSvg }}
        />
      );
    }
    return <div className="pdf-page-loading">Loading page {currentPage + 1}...</div>;
  }

  return (
    <div className="pdf-viewer">
      <Toolbar>
        <vscode-button
          icon="chevron-left"
          secondary
          disabled={currentPage === 0 || undefined}
          onClick={() => goToPage(currentPage - 1)}
        >
          Prev
        </vscode-button>
        <ToolbarInfo>
          Page {currentPage + 1} / {totalPages}
        </ToolbarInfo>
        <vscode-button
          icon-after="chevron-right"
          secondary
          disabled={currentPage === totalPages - 1 || undefined}
          onClick={() => goToPage(currentPage + 1)}
        >
          Next
        </vscode-button>
        <ToolbarSpacer />
        <ZoomControl zoom={zoom} min={25} max={300} onZoomChange={setZoom} />
      </Toolbar>
      <div className="pdf-content">
        <VirtualThumbnailSidebar
          pageCount={totalPages}
          cachedSvgs={thumbnailSvgs}
          activeIndex={currentPage}
          onSelect={goToPage}
          onRequestPage={requestPage}
        />
        <div className="main-area">
          <div
            className="pdf-page-container"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            {renderCurrentPage()}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Virtual Thumbnail Sidebar
// =============================================================================

/**
 * Height of each thumbnail item in pixels.
 * Must match the CSS-rendered height for correct virtual scroll calculation.
 */
const THUMBNAIL_HEIGHT = 130;

type VirtualThumbnailSidebarProps = {
  readonly pageCount: number;
  readonly cachedSvgs: ReadonlyMap<number, string>;
  readonly activeIndex: number;
  readonly onSelect: (index: number) => void;
  readonly onRequestPage: (index: number) => void;
};

/**
 * Thumbnail sidebar with virtual scrolling.
 *
 * Only renders thumbnails that are within or near the visible scroll area.
 * For pages that haven't been rendered yet, shows a placeholder with the
 * page number.
 */
function VirtualThumbnailSidebar({
  pageCount,
  cachedSvgs,
  activeIndex,
  onSelect,
  onRequestPage,
}: VirtualThumbnailSidebarProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Measure container height on mount and resize.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(container);
    setContainerHeight(container.clientHeight);

    return () => observer.disconnect();
  }, []);

  // Scroll active thumbnail into view when activeIndex changes.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const activeTop = activeIndex * THUMBNAIL_HEIGHT;
    const activeBottom = activeTop + THUMBNAIL_HEIGHT;

    if (activeTop < container.scrollTop) {
      container.scrollTop = activeTop;
    } else if (activeBottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = activeBottom - container.clientHeight;
    }
  }, [activeIndex]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      setScrollTop(container.scrollTop);
    }
  }, []);

  // Determine visible range with overscan.
  const overscan = 3;
  const startIndex = Math.max(0, Math.floor(scrollTop / THUMBNAIL_HEIGHT) - overscan);
  const endIndex = Math.min(
    pageCount - 1,
    Math.ceil((scrollTop + containerHeight) / THUMBNAIL_HEIGHT) + overscan,
  );

  // Request SVGs for visible thumbnails that aren't cached.
  useEffect(() => {
    for (let i = startIndex; i <= endIndex; i++) {
      if (!cachedSvgs.has(i)) {
        onRequestPage(i);
      }
    }
  }, [startIndex, endIndex, cachedSvgs, onRequestPage]);

  const totalHeight = pageCount * THUMBNAIL_HEIGHT;

  function renderThumbnailContent(svg: string | undefined): React.JSX.Element {
    if (svg) {
      return <div className="thumbnail-svg" dangerouslySetInnerHTML={{ __html: svg }} />;
    }
    return <div className="thumbnail-placeholder" />;
  }

  function thumbnailClassName(index: number): string {
    return index === activeIndex ? "thumbnail active" : "thumbnail";
  }

  const visibleItems: React.JSX.Element[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const svg = cachedSvgs.get(i);
    visibleItems.push(
      <div
        key={i}
        className={thumbnailClassName(i)}
        style={{
          position: "absolute",
          top: i * THUMBNAIL_HEIGHT,
          left: 0,
          right: 0,
          height: THUMBNAIL_HEIGHT,
        }}
        title={`Page ${i + 1}`}
        onClick={() => onSelect(i)}
      >
        <div className="thumbnail-number">{i + 1}</div>
        {renderThumbnailContent(svg)}
      </div>,
    );
  }

  return (
    <div
      ref={containerRef}
      className="sidebar"
      style={{ overflow: "auto", position: "relative" }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItems}
      </div>
    </div>
  );
}
