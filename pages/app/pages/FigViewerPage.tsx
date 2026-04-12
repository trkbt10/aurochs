/**
 * @file Fig viewer page.
 *
 * Read-only viewer for .fig design files.
 * Renders each page as SVG with page navigation and zoom.
 */

import { useCallback, useMemo, useState, useRef } from "react";
import type { FigDesignDocument, FigDesignNode, FigPage } from "@aurochs-builder/fig/types";
import type { FigNode } from "@aurochs/fig/types";
import { buildSceneGraph, type BuildSceneGraphOptions } from "@aurochs-renderer/fig/scene-graph";
import { renderSceneGraphToSvg } from "@aurochs-renderer/fig/svg";
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
 * Convert FigDesignNode to FigNode-like for scene graph building.
 */
function designNodeToFigNode(node: FigDesignNode): FigNode {
  const base: Record<string, unknown> = {
    guid: { sessionID: 0, localID: 0 },
    type: { value: 0, name: node.type },
    phase: { value: 1, name: "CREATED" },
    name: node.name,
    visible: node.visible,
    opacity: node.opacity,
    transform: node.transform,
    size: node.size,
    fillPaints: node.fills,
    strokePaints: node.strokes,
    strokeWeight: node.strokeWeight,
    strokeAlign: node.strokeAlign,
    strokeJoin: node.strokeJoin,
    strokeCap: node.strokeCap,
    cornerRadius: node.cornerRadius,
    rectangleCornerRadii: node.rectangleCornerRadii,
    effects: node.effects,
    clipsContent: node.clipsContent,
    ...node._raw,
  };

  if (node.textData) {
    base.characters = node.textData.characters;
    base.fontSize = node.textData.fontSize;
    base.fontName = node.textData.fontName;
    base.textAlignHorizontal = node.textData.textAlignHorizontal;
    base.textAlignVertical = node.textData.textAlignVertical;
    base.textAutoResize = node.textData.textAutoResize;
    base.lineHeight = node.textData.lineHeight;
    base.letterSpacing = node.textData.letterSpacing;
  }

  if (node.children && node.children.length > 0) {
    base.children = node.children.map(designNodeToFigNode);
  }

  return base as FigNode;
}

/**
 * Compute the bounding box of all nodes in a page.
 */
function computePageBounds(children: readonly FigDesignNode[]): { x: number; y: number; width: number; height: number } {
  if (children.length === 0) {
    return { x: 0, y: 0, width: 800, height: 600 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of children) {
    const nx = node.transform.m02;
    const ny = node.transform.m12;
    minX = Math.min(minX, nx);
    minY = Math.min(minY, ny);
    maxX = Math.max(maxX, nx + node.size.x);
    maxY = Math.max(maxY, ny + node.size.y);
  }

  // Add padding
  const padding = 40;
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

/**
 * Render a page to SVG string.
 */
function renderPageSvg(page: FigPage, images: FigDesignDocument["images"]): string {
  if (page.children.length === 0) {
    return "";
  }

  const figNodes = page.children.map(designNodeToFigNode);
  const bounds = computePageBounds(page.children);

  const sceneGraph = buildSceneGraph(figNodes, {
    blobs: [],
    images: images as BuildSceneGraphOptions["images"],
    canvasSize: { width: bounds.width, height: bounds.height },
  });

  return renderSceneGraphToSvg(sceneGraph) as string;
}

// =============================================================================
// Component
// =============================================================================

/** Fig viewer page. */
export function FigViewerPage({ document, fileName, onBack, onFileSelect, onStartEditor }: Props) {
  const [activePageIndex, setActivePageIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const activePage = document?.pages[activePageIndex];
  const totalPages = document?.pages.length ?? 0;

  const svgContent = useMemo(() => {
    if (!activePage || !document) {
      return "";
    }
    return renderPageSvg(activePage, document.images);
  }, [activePage, document]);

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

  const headerActions = onStartEditor ? (
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
  ) : undefined;

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
        {document && svgContent ? (
          <svg
            viewBox={`${pageBounds.x} ${pageBounds.y} ${pageBounds.width} ${pageBounds.height}`}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              backgroundColor: "white",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              borderRadius: 4,
            }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : !document ? (
          <div style={{ color: "#999", fontSize: 14, marginTop: 80 }}>
            No .fig file loaded. Upload a file or try the demo.
          </div>
        ) : (
          <div style={{ color: "#999", fontSize: 14, marginTop: 80 }}>
            This page is empty.
          </div>
        )}
      </div>
    </EditorPageLayout>
  );
}
