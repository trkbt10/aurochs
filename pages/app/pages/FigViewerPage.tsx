/**
 * @file Fig viewer page.
 *
 * Read-only viewer for .fig design files.
 * Renders each page as SVG with page navigation and zoom.
 * Uses React SVG elements (via FigSceneRenderer) instead of dangerouslySetInnerHTML.
 */

import { useCallback, useMemo, useState, useRef } from "react";
import type { FigDesignDocument, FigDesignNode, FigPage } from "@aurochs/fig/domain";
import { buildSceneGraph, type BuildSceneGraphOptions } from "@aurochs-renderer/fig/scene-graph";
import { FigSceneRenderer } from "@aurochs-renderer/fig/react";
import { UploadIcon } from "@aurochs-ui/ui-components/icons";
import { EditorPageLayout } from "../components/EditorPageLayout";

// =============================================================================
// Types
// =============================================================================

type Props = {
  readonly document: FigDesignDocument | null;
  readonly fileName: string | null;
  readonly onBack: () => void;
  readonly onFileSelect?: (file: File) => void;
  readonly onStartEditor?: () => void;
};

// =============================================================================
// Rendering
// =============================================================================

/**
 * Compute the bounding box of all nodes in a page.
 */
type PageBounds = { x: number; y: number; width: number; height: number };

const EMPTY_PAGE_BOUNDS: PageBounds = { x: 0, y: 0, width: 800, height: 600 };

function computePageBounds(children: readonly FigDesignNode[]): PageBounds {
  if (children.length === 0) {
    return EMPTY_PAGE_BOUNDS;
  }

  const extremes = children.reduce(
    (acc, node) => {
      const nx = node.transform.m02;
      const ny = node.transform.m12;
      return {
        minX: Math.min(acc.minX, nx),
        minY: Math.min(acc.minY, ny),
        maxX: Math.max(acc.maxX, nx + node.size.x),
        maxY: Math.max(acc.maxY, ny + node.size.y),
      };
    },
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );

  const padding = 40;
  return {
    x: extremes.minX - padding,
    y: extremes.minY - padding,
    width: extremes.maxX - extremes.minX + padding * 2,
    height: extremes.maxY - extremes.minY + padding * 2,
  };
}

// =============================================================================
// Page SVG Content Component
// =============================================================================

type PageSvgContentProps = {
  readonly page: FigPage;
  readonly document: FigDesignDocument;
  readonly bounds: { x: number; y: number; width: number; height: number };
};

/**
 * Renders page content as React SVG elements inside an <svg>.
 */
function PageSvgContent({ page, document: doc, bounds }: PageSvgContentProps) {
  const sceneGraph = useMemo(() => {
    if (page.children.length === 0) {
      return null;
    }
    return buildSceneGraph(page.children, {
      blobs: (doc._loaded?.blobs ?? []) as any,
      images: doc.images as BuildSceneGraphOptions["images"],
      canvasSize: { width: bounds.width, height: bounds.height },
      symbolMap: doc.components,
    });
  }, [page.children, doc, bounds.width, bounds.height]);

  if (!sceneGraph) {
    return null;
  }

  return (
    <svg
      viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
      style={{
        maxWidth: "100%",
        maxHeight: "100%",
        backgroundColor: "white",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        borderRadius: 4,
      }}
    >
      <FigSceneRenderer sceneGraph={sceneGraph} />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

const emptyMessageStyle = { color: "#999", fontSize: 14, marginTop: 80 } as const;

function renderPageContent(
  document: FigDesignDocument | null,
  activePage: FigPage | undefined,
  pageBounds: PageBounds,
) {
  if (document && activePage && activePage.children.length > 0) {
    return (
      <PageSvgContent
        page={activePage}
        document={document}
        bounds={pageBounds}
      />
    );
  }
  if (!document) {
    return (
      <div style={emptyMessageStyle}>
        No .fig file loaded. Upload a file or try the demo.
      </div>
    );
  }
  return <div style={emptyMessageStyle}>This page is empty.</div>;
}

function renderEditButton(onStartEditor: (() => void) | undefined) {
  if (!onStartEditor) {
    return undefined;
  }
  return (
    <button
      type="button"
      onClick={onStartEditor}
      style={{
        padding: "6px 16px",
        fontSize: 13,
        backgroundColor: "#4472C4",
        color: "#fff",
        border: "none",
        borderRadius: 4,
        cursor: "pointer",
      }}
    >
      Edit
    </button>
  );
}

/** Fig viewer page. */
export function FigViewerPage({ document, fileName, onBack, onFileSelect, onStartEditor }: Props) {
  const [activePageIndex, setActivePageIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const activePage = document?.pages[activePageIndex];
  const totalPages = document?.pages.length ?? 0;

  const pageBounds = useMemo(() => {
    if (!activePage) {
      return { x: 0, y: 0, width: 800, height: 600 };
    }
    return computePageBounds(activePage.children);
  }, [activePage]);

  const handlePrevPage = useCallback(() => {
    setActivePageIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setActivePageIndex((i) => Math.min(totalPages - 1, i + 1));
  }, [totalPages]);

  const handleFile = useCallback(
    (file: File) => {
      if (file.name.toLowerCase().endsWith(".fig")) {
        onFileSelect?.(file);
      }
    },
    [onFileSelect],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) { handleFile(file); }
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) { handleFile(file); }
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const headerActions = renderEditButton(onStartEditor);

  return (
    <EditorPageLayout
      fileName={fileName ?? "Fig Viewer"}
      onBack={onBack}
      headerActions={headerActions}
      editorContainerStyle={{ display: "flex", flexDirection: "column" }}
    >
      {/* Upload bar when no file loaded */}
      {!document && onFileSelect && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "10px 16px",
            backgroundColor: isDragging ? "rgba(68, 114, 196, 0.08)" : "#f8f9fa",
            borderBottom: "1px solid #e5e5e5",
            cursor: "pointer",
            transition: "background-color 0.15s",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".fig"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <UploadIcon size={16} style={{ color: "#666" }} />
          <span style={{ fontSize: 13, color: "#666" }}>
            Drop a .fig file here or click to upload
          </span>
        </div>
      )}

      {/* Page navigation */}
      {document && totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "6px 16px",
            borderBottom: "1px solid #e5e5e5",
            backgroundColor: "#fafafa",
            fontSize: 13,
          }}
        >
          <button
            onClick={handlePrevPage}
            disabled={activePageIndex === 0}
            style={{
              padding: "2px 8px",
              border: "1px solid #ddd",
              borderRadius: 4,
              backgroundColor: "white",
              cursor: activePageIndex === 0 ? "default" : "pointer",
              opacity: activePageIndex === 0 ? 0.4 : 1,
            }}
          >
            Prev
          </button>
          <span style={{ color: "#666" }}>
            {activePage?.name ?? `Page ${activePageIndex + 1}`} ({activePageIndex + 1} / {totalPages})
          </span>
          <button
            onClick={handleNextPage}
            disabled={activePageIndex >= totalPages - 1}
            style={{
              padding: "2px 8px",
              border: "1px solid #ddd",
              borderRadius: 4,
              backgroundColor: "white",
              cursor: activePageIndex >= totalPages - 1 ? "default" : "pointer",
              opacity: activePageIndex >= totalPages - 1 ? 0.4 : 1,
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* SVG content */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: 24,
          backgroundColor: "#f5f5f5",
        }}
      >
        {renderPageContent(document, activePage, pageBounds)}
      </div>
    </EditorPageLayout>
  );
}
