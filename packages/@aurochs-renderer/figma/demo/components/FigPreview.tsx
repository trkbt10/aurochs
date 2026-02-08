/**
 * @file Figma file preview component
 */

import { useEffect, useMemo, useState } from "react";
import type { ParsedFigFile } from "@aurochs/fig/parser";
import { buildNodeTree, findNodesByType, getNodeType } from "@aurochs/fig/parser";
import type { FigNode } from "@aurochs/fig/types";
import { preResolveSymbols } from "../../src/symbols/symbol-pre-resolver";
import { renderCanvas } from "../../src/svg/renderer";
import { BrowserFontLoader } from "../../src/font-drivers/browser";
import { CachingFontLoader } from "../../src/font";
import { buildSceneGraph } from "../../src/scene-graph/builder";
import { InspectorView } from "./InspectorView";
import { WebGLCanvas } from "./WebGLCanvas";

type RendererMode = "svg" | "webgl";

type Props = {
  readonly parsedFile: ParsedFigFile;
  readonly onClose: () => void;
};

type CanvasInfo = {
  node: FigNode;
  name: string;
  frames: FrameInfo[];
};

type FrameInfo = {
  node: FigNode;
  name: string;
  width: number;
  height: number;
};

const styles = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
  },
  info: {
    display: "flex",
    gap: "16px",
    alignItems: "center",
  },
  stat: {
    padding: "8px 16px",
    background: "rgba(99, 102, 241, 0.1)",
    borderRadius: "8px",
    fontSize: "14px",
  },
  closeButton: {
    padding: "8px 16px",
    fontSize: "14px",
    color: "#fff",
    background: "#4a5568",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  selectors: {
    display: "flex",
    gap: "16px",
    alignItems: "center",
    flexWrap: "wrap" as const,
  },
  selectorGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  selectorLabel: {
    fontSize: "14px",
    color: "#94a3b8",
  },
  select: {
    padding: "8px 12px",
    fontSize: "14px",
    color: "#fff",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "8px",
    cursor: "pointer",
    minWidth: "200px",
  },
  content: {
    flex: 1,
    display: "flex",
    gap: "20px",
    minHeight: 0,
  },
  preview: {
    flex: 1,
    background: "#fff",
    borderRadius: "12px",
    overflow: "auto",
    padding: "20px",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  svgContainer: {
    maxWidth: "100%",
    overflow: "auto",
  },
  sidebar: {
    width: "300px",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
  },
  frameList: {
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "12px",
    padding: "16px",
    maxHeight: "400px",
    overflowY: "auto" as const,
  },
  frameListTitle: {
    fontSize: "14px",
    fontWeight: 600,
    marginBottom: "12px",
    color: "#94a3b8",
  },
  frameItem: {
    padding: "10px 12px",
    marginBottom: "4px",
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "transparent",
    transition: "all 0.15s ease",
  },
  frameItemActive: {
    background: "rgba(99, 102, 241, 0.2)",
    borderColor: "#6366f1",
  },
  frameName: {
    color: "#e2e8f0",
    marginBottom: "4px",
  },
  frameSize: {
    color: "#64748b",
    fontSize: "11px",
  },
  checkbox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    fontSize: "14px",
    color: "#94a3b8",
  },
  checkboxInput: {
    width: "16px",
    height: "16px",
    cursor: "pointer",
  },
  warnings: {
    background: "rgba(251, 191, 36, 0.1)",
    borderRadius: "12px",
    padding: "16px",
    maxHeight: "200px",
    overflowY: "auto" as const,
  },
  warningsTitle: {
    fontSize: "14px",
    fontWeight: 600,
    marginBottom: "12px",
    color: "#fbbf24",
  },
  warning: {
    padding: "8px 12px",
    marginBottom: "4px",
    background: "rgba(251, 191, 36, 0.05)",
    borderRadius: "6px",
    fontSize: "12px",
    color: "#fbbf24",
  },
  emptyState: {
    padding: "40px",
    textAlign: "center" as const,
    color: "#64748b",
  },
  rendererToggle: {
    display: "flex",
    borderRadius: "8px",
    overflow: "hidden",
    border: "1px solid #334155",
  },
  rendererButton: {
    padding: "6px 14px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#94a3b8",
    background: "#1e293b",
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  rendererButtonActive: {
    color: "#fff",
    background: "#6366f1",
  },
};

// Create a singleton font loader instance
const browserFontLoader = new BrowserFontLoader();
const fontLoader = new CachingFontLoader(browserFontLoader);

export function FigPreview({ parsedFile, onClose }: Props) {
  const [selectedCanvasIndex, setSelectedCanvasIndex] = useState(0);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [showHiddenNodes, setShowHiddenNodes] = useState(false);
  const [fontAccessGranted, setFontAccessGranted] = useState(false);
  const [fontAccessSupported] = useState(() => BrowserFontLoader.isSupported());
  const [renderResult, setRenderResult] = useState<{ svg: string; warnings: readonly string[] }>({
    svg: "",
    warnings: [],
  });
  const [isRendering, setIsRendering] = useState(false);
  const [inspectorEnabled, setInspectorEnabled] = useState(false);
  const [rendererMode, setRendererMode] = useState<RendererMode>("svg");

  // Build node tree and extract canvas/frame info
  const { canvases, nodeCount, typeCount, symbolMap, resolvedSymbolCache, symbolResolveWarnings } = useMemo(() => {
    const { roots, nodeMap } = buildNodeTree(parsedFile.nodeChanges);
    const canvasNodes = findNodesByType(roots, "CANVAS");

    const canvases: CanvasInfo[] = canvasNodes.map((canvas) => {
      const frames: FrameInfo[] = [];
      for (const child of canvas.children ?? []) {
        const childData = child as Record<string, unknown>;
        const size = childData.size as { x?: number; y?: number } | undefined;
        frames.push({
          node: child,
          name: child.name ?? "Unnamed Frame",
          width: size?.x ?? 100,
          height: size?.y ?? 100,
        });
      }
      return {
        node: canvas,
        name: canvas.name ?? "Unnamed Page",
        frames,
      };
    });

    const warnings: string[] = [];
    const resolvedSymbolCache = preResolveSymbols(nodeMap, { warnings });

    return {
      canvases,
      nodeCount: parsedFile.nodeChanges.length,
      typeCount: countNodeTypes(parsedFile.nodeChanges),
      symbolMap: nodeMap,
      resolvedSymbolCache,
      symbolResolveWarnings: warnings,
    };
  }, [parsedFile]);
  const combinedWarnings = useMemo(
    () => [...symbolResolveWarnings, ...renderResult.warnings],
    [symbolResolveWarnings, renderResult.warnings],
  );

  // Get current selection
  const currentCanvas = canvases[selectedCanvasIndex];
  const currentFrame = currentCanvas?.frames[selectedFrameIndex];

  // Build scene graph for WebGL mode
  const sceneGraph = useMemo(() => {
    if (rendererMode !== "webgl" || !currentFrame) return null;
    try {
      // Normalize root transform to (0,0) — same as renderCanvas does for SVG
      const node = currentFrame.node;
      const transform = node.transform;
      const normalizedNode = transform ? ({ ...node, transform: { ...transform, m02: 0, m12: 0 } } as FigNode) : node;

      return buildSceneGraph([normalizedNode], {
        blobs: parsedFile.blobs,
        images: parsedFile.images,
        canvasSize: { width: currentFrame.width, height: currentFrame.height },
        symbolMap,
        showHiddenNodes,
      });
    } catch (e) {
      console.error("Failed to build scene graph:", e);
      return null;
    }
  }, [rendererMode, currentFrame, parsedFile.blobs, parsedFile.images, symbolMap, showHiddenNodes]);

  // Render the selected frame (async)
  useEffect(() => {
    if (!currentFrame) {
      setRenderResult({ svg: "", warnings: [] });
      return;
    }

    let cancelled = false;
    setIsRendering(true);

    renderCanvas(
      { children: [currentFrame.node] },
      {
        width: currentFrame.width,
        height: currentFrame.height,
        blobs: parsedFile.blobs,
        images: parsedFile.images,
        showHiddenNodes,
        symbolMap,
        resolvedSymbolCache,
        fontLoader: fontAccessGranted ? fontLoader : undefined,
      },
    ).then((result) => {
      if (!cancelled) {
        setRenderResult(result);
        setIsRendering(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentFrame, parsedFile.blobs, parsedFile.images, showHiddenNodes, fontAccessGranted]);

  // Request font access
  const handleRequestFontAccess = async () => {
    try {
      // Calling listFontFamilies will trigger permission prompt
      await fontLoader.isFontAvailable("Arial");
      setFontAccessGranted(browserFontLoader.hasPermission());
    } catch {
      // Permission denied or error
      setFontAccessGranted(false);
    }
  };

  // Handle canvas change
  const handleCanvasChange = (index: number) => {
    setSelectedCanvasIndex(index);
    setSelectedFrameIndex(0);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.info}>
          <div style={styles.stat}>
            <strong>{canvases.length}</strong> pages
          </div>
          <div style={styles.stat}>
            <strong>{currentCanvas?.frames.length ?? 0}</strong> frames
          </div>
          <div style={styles.stat}>
            <strong>{nodeCount}</strong> nodes
          </div>
          {combinedWarnings.length > 0 && (
            <div style={styles.stat}>
              <strong>{combinedWarnings.length}</strong> warnings
            </div>
          )}
        </div>
        <button style={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>

      {/* Page/Frame Selectors */}
      {canvases.length > 0 && (
        <div style={styles.selectors}>
          <div style={styles.selectorGroup}>
            <span style={styles.selectorLabel}>Page:</span>
            <select
              style={styles.select}
              value={selectedCanvasIndex}
              onChange={(e) => handleCanvasChange(Number(e.target.value))}
            >
              {canvases.map((canvas, index) => (
                <option key={index} value={index}>
                  {canvas.name} ({canvas.frames.length} frames)
                </option>
              ))}
            </select>
          </div>

          {currentCanvas && currentCanvas.frames.length > 0 && (
            <div style={styles.selectorGroup}>
              <span style={styles.selectorLabel}>Frame:</span>
              <select
                style={styles.select}
                value={selectedFrameIndex}
                onChange={(e) => setSelectedFrameIndex(Number(e.target.value))}
              >
                {currentCanvas.frames.map((frame, index) => (
                  <option key={index} value={index}>
                    {frame.name} ({frame.width}×{frame.height})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={styles.rendererToggle}>
            <button
              style={{
                ...styles.rendererButton,
                ...(rendererMode === "svg" ? styles.rendererButtonActive : {}),
              }}
              onClick={() => setRendererMode("svg")}
            >
              SVG
            </button>
            <button
              style={{
                ...styles.rendererButton,
                ...(rendererMode === "webgl" ? styles.rendererButtonActive : {}),
              }}
              onClick={() => setRendererMode("webgl")}
            >
              WebGL
            </button>
          </div>

          <label
            style={{
              ...styles.checkbox,
              ...(rendererMode === "webgl" ? { opacity: 0.4, pointerEvents: "none" as const } : {}),
            }}
          >
            <input
              type="checkbox"
              style={styles.checkboxInput}
              checked={inspectorEnabled}
              onChange={(e) => setInspectorEnabled(e.target.checked)}
              disabled={rendererMode === "webgl"}
            />
            Inspector
          </label>

          <label style={styles.checkbox}>
            <input
              type="checkbox"
              style={styles.checkboxInput}
              checked={showHiddenNodes}
              onChange={(e) => setShowHiddenNodes(e.target.checked)}
            />
            Show hidden nodes (styles)
          </label>

          {/* Font Access Button */}
          {fontAccessSupported &&
            (fontAccessGranted ? (
              <span style={{ ...styles.selectorLabel, color: "#22c55e" }}>Local fonts enabled</span>
            ) : (
              <button
                style={{
                  ...styles.closeButton,
                  background: "#6366f1",
                }}
                onClick={handleRequestFontAccess}
              >
                Enable Local Fonts
              </button>
            ))}
        </div>
      )}

      {/* Content */}
      <div style={styles.content}>
        {inspectorEnabled && rendererMode === "svg" && currentFrame ? (
          <InspectorView
            frameNode={currentFrame.node}
            frameWidth={currentFrame.width}
            frameHeight={currentFrame.height}
            showHiddenNodes={showHiddenNodes}
            svgHtml={renderResult.svg}
            isRendering={isRendering}
          />
        ) : (
          <>
            {/* Preview */}
            <div style={styles.preview}>
              {rendererMode === "webgl" ? (
                currentFrame ? (
                  <WebGLCanvas sceneGraph={sceneGraph} width={currentFrame.width} height={currentFrame.height} />
                ) : (
                  <div style={styles.emptyState}>No frames found in this file</div>
                )
              ) : isRendering ? (
                <div style={styles.emptyState}>Rendering...</div>
              ) : currentFrame ? (
                <div style={styles.svgContainer} dangerouslySetInnerHTML={{ __html: renderResult.svg }} />
              ) : (
                <div style={styles.emptyState}>No frames found in this file</div>
              )}
            </div>

            {/* Sidebar */}
            <div style={styles.sidebar}>
              {/* Frame List */}
              {currentCanvas && currentCanvas.frames.length > 0 && (
                <div style={styles.frameList}>
                  <div style={styles.frameListTitle}>Frames in "{currentCanvas.name}"</div>
                  {currentCanvas.frames.map((frame, index) => (
                    <div
                      key={index}
                      style={{
                        ...styles.frameItem,
                        ...(index === selectedFrameIndex ? styles.frameItemActive : {}),
                      }}
                      onClick={() => setSelectedFrameIndex(index)}
                    >
                      <div style={styles.frameName}>{frame.name}</div>
                      <div style={styles.frameSize}>
                        {frame.width} × {frame.height}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {combinedWarnings.length > 0 && (
                <div style={styles.warnings}>
                  <div style={styles.warningsTitle}>Render Warnings</div>
                  {combinedWarnings.slice(0, 10).map((warning, index) => (
                    <div key={index} style={styles.warning}>
                      {warning}
                    </div>
                  ))}
                  {combinedWarnings.length > 10 && (
                    <div style={styles.warning}>...and {combinedWarnings.length - 10} more</div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Count unique node types
 */
function countNodeTypes(nodes: readonly FigNode[]): number {
  const types = new Set(nodes.map((n) => getNodeType(n)));
  return types.size;
}
