/**
 * @file PDF page viewer with thumbnail sidebar and navigation.
 */

import { useState, useCallback, useEffect } from "react";
import type { PdfDataMessage } from "../types";
import { Toolbar, ToolbarSpacer, ToolbarInfo } from "../components/Toolbar";
import { ZoomControl } from "../components/ZoomControl";
import { ThumbnailSidebar } from "../components/ThumbnailSidebar";

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
