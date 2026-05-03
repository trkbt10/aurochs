/**
 * @file Renderer debug view.
 *
 * SVG/WebGL renderer switching with inspector overlay.
 * Uses ParsedFigFile (low-level) for direct renderer access.
 */

import { useEffect, useMemo, useState, useCallback, type CSSProperties, type ReactNode } from "react";
import type { ParsedFigFile } from "@aurochs/fig/parser";
import { parseFigFile, buildNodeTree, findNodesByType } from "@aurochs/fig/parser";
import { loadFigFile } from "@aurochs/fig/roundtrip";
import { treeToDocument } from "@aurochs-builder/fig/context";
import type { FigDesignDocument, FigDesignNode } from "@aurochs/fig/domain";
import type { FigNode } from "@aurochs/fig/types";
import { preResolveSymbols } from "@aurochs/fig/symbols";
import { renderCanvas } from "@aurochs-renderer/fig/svg";
import { createBrowserFontLoader, isBrowserFontLoaderSupported } from "@aurochs-renderer/fig/font-drivers/browser";
import { createCachingFontLoader } from "@aurochs-renderer/fig/font";
import { buildSceneGraph } from "@aurochs-renderer/fig/scene-graph";
import type { SceneGraph } from "@aurochs-renderer/fig/scene-graph";
import { Button, Select, Tabs, Toggle, colorTokens, spacingTokens, fontTokens, radiusTokens } from "@aurochs-ui/ui-components";
import {
  InspectorCanvasOverlay,
  InspectorTreePanel,
  CategoryLegend,
} from "@aurochs-ui/editor-controls/inspector";
import {
  collectFigBoxes,
  figNodeToInspectorTree,
  getRootNormalizationTransform,
} from "../../src/inspector/fig-inspector-adapter";
import {
  FIG_NODE_CATEGORY_REGISTRY,
  FIG_LEGEND_ORDER,
} from "../../src/inspector/fig-node-categories";
import { useFigTextFontResolver } from "../../src/canvas/rendering/use-fig-text-font-resolver";
import { isUserVisibleCanvasNode } from "./visible-canvas";
import { WebGLCanvas } from "./WebGLCanvas";

// =============================================================================
// Types
// =============================================================================

type RendererMode = "svg" | "webgl";

type Props = {
  readonly raw: Uint8Array;
};

type CanvasInfo = {
  readonly node: FigNode;
  readonly name: string;
  readonly frames: readonly FrameInfo[];
};

type FrameInfo = {
  node: FigNode;
  name: string;
  width: number;
  height: number;
};

// =============================================================================
// Styles (layout only — visual via design tokens)
// =============================================================================

const containerStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.md,
  padding: spacingTokens.md,
};

const toolbarStyle: CSSProperties = {
  display: "flex",
  gap: spacingTokens.md,
  alignItems: "center",
  flexWrap: "wrap",
};

const toolbarGroupStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.xs,
};

const statStyle: CSSProperties = {
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  backgroundColor: colorTokens.background.tertiary,
  borderRadius: radiusTokens.sm,
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.secondary,
};

const contentStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  gap: spacingTokens.md,
  minHeight: 0,
};

const previewStyle: CSSProperties = {
  flex: 1,
  backgroundColor: colorTokens.background.primary,
  borderRadius: radiusTokens.md,
  overflow: "auto",
  padding: spacingTokens.md,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
};

const svgContainerStyle: CSSProperties = {
  maxWidth: "100%",
  overflow: "auto",
};

const sidebarStyle: CSSProperties = {
  width: "260px",
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.sm,
};

const frameListStyle: CSSProperties = {
  backgroundColor: colorTokens.background.tertiary,
  borderRadius: radiusTokens.md,
  padding: spacingTokens.sm,
  maxHeight: "400px",
  overflowY: "auto",
};

const frameListTitleStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  fontWeight: fontTokens.weight.semibold,
  marginBottom: spacingTokens.sm,
  color: colorTokens.text.secondary,
};

const frameItemStyle: CSSProperties = {
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  marginBottom: "2px",
  backgroundColor: "transparent",
  borderRadius: radiusTokens.xs,
  fontSize: fontTokens.size.sm,
  cursor: "pointer",
  border: `1px solid transparent`,
  transition: "all 0.15s ease",
};

const frameItemActiveStyle: CSSProperties = {
  backgroundColor: `color-mix(in srgb, ${colorTokens.accent.primary} 15%, transparent)`,
  borderColor: colorTokens.accent.primary,
};

const frameNameStyle: CSSProperties = {
  color: colorTokens.text.primary,
  marginBottom: "2px",
};

const frameSizeStyle: CSSProperties = {
  color: colorTokens.text.tertiary,
  fontSize: fontTokens.size.xs,
};

const warningsStyle: CSSProperties = {
  backgroundColor: "rgba(251, 191, 36, 0.1)",
  borderRadius: radiusTokens.md,
  padding: spacingTokens.sm,
  maxHeight: "200px",
  overflowY: "auto",
};

const warningsTitleStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  fontWeight: fontTokens.weight.semibold,
  marginBottom: spacingTokens.sm,
  color: "#fbbf24",
};

const warningStyle: CSSProperties = {
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  marginBottom: "2px",
  backgroundColor: "rgba(251, 191, 36, 0.05)",
  borderRadius: radiusTokens.xs,
  fontSize: fontTokens.size.xs,
  color: "#fbbf24",
};

const emptyStateStyle: CSSProperties = {
  padding: spacingTokens.xl,
  textAlign: "center",
  color: colorTokens.text.tertiary,
};

const loadingStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: colorTokens.text.secondary,
  fontSize: fontTokens.size.md,
};

const labelStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.secondary,
};

const fontEnabledStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: colorTokens.accent.success,
};

function isFigNode(node: FigNode | null | undefined): node is FigNode {
  return node !== null && node !== undefined;
}

function collectFrameInfos(children: readonly (FigNode | null | undefined)[]): readonly FrameInfo[] {
  return children.filter(isFigNode).map((child) => {
    const size = child.size;
    return {
      node: child,
      name: child.name ?? "Unnamed Frame",
      width: size?.x ?? 100,
      height: size?.y ?? 100,
    };
  });
}

function findDesignNodeForFrame({
  designDoc,
  currentCanvas,
  currentFrame,
}: {
  readonly designDoc: FigDesignDocument;
  readonly currentCanvas: CanvasInfo | undefined;
  readonly currentFrame: FrameInfo;
}): FigDesignNode | undefined {
  const canvasName = currentCanvas?.name;
  return designDoc.pages
    .filter((page) => !canvasName || page.name === canvasName)
    .flatMap((page) => page.children)
    .find((candidate) => candidate.name === currentFrame.name);
}

function normalizeDesignNodeForFrameRender(designNode: FigDesignNode): FigDesignNode {
  const transform = designNode.transform;
  if (!transform) {
    return designNode;
  }
  return { ...designNode, transform: { ...transform, m02: 0, m12: 0 } };
}

function renderFontAccessControl({
  fontAccessSupported,
  fontAccessGranted,
  onRequestFontAccess,
}: {
  readonly fontAccessSupported: boolean;
  readonly fontAccessGranted: boolean;
  readonly onRequestFontAccess: () => void;
}): ReactNode {
  if (!fontAccessSupported) {
    return null;
  }
  if (fontAccessGranted) {
    return <span style={fontEnabledStyle}>Fonts enabled</span>;
  }
  return <Button variant="outline" size="sm" onClick={onRequestFontAccess}>Enable Fonts</Button>;
}

function renderPreviewContent({
  rendererMode,
  currentFrame,
  sceneGraph,
  isRendering,
  svgHtml,
}: {
  readonly rendererMode: RendererMode;
  readonly currentFrame: FrameInfo | undefined;
  readonly sceneGraph: SceneGraph | null;
  readonly isRendering: boolean;
  readonly svgHtml: string;
}): ReactNode {
  if (rendererMode === "webgl") {
    if (!currentFrame) {
      return <div style={emptyStateStyle}>No frames</div>;
    }
    return <WebGLCanvas sceneGraph={sceneGraph} width={currentFrame.width} height={currentFrame.height} />;
  }
  if (isRendering) {
    return <div style={emptyStateStyle}>Rendering...</div>;
  }
  if (!currentFrame) {
    return <div style={emptyStateStyle}>No frames</div>;
  }
  return <div style={svgContainerStyle} dangerouslySetInnerHTML={{ __html: svgHtml }} />;
}

function renderInspectorSvgContent({ isRendering, svgHtml }: { readonly isRendering: boolean; readonly svgHtml: string }): ReactNode {
  if (isRendering) {
    return <div style={emptyStateStyle}>Rendering...</div>;
  }
  return <div dangerouslySetInnerHTML={{ __html: svgHtml }} />;
}

function renderDebugMainContent({
  inspectorEnabled,
  rendererMode,
  currentFrame,
  showHiddenNodes,
  svgHtml,
  isRendering,
  sceneGraph,
  currentCanvas,
  selectedFrameIndex,
  onSelectFrame,
  combinedWarnings,
}: {
  readonly inspectorEnabled: boolean;
  readonly rendererMode: RendererMode;
  readonly currentFrame: FrameInfo | undefined;
  readonly showHiddenNodes: boolean;
  readonly svgHtml: string;
  readonly isRendering: boolean;
  readonly sceneGraph: SceneGraph | null;
  readonly currentCanvas: CanvasInfo | undefined;
  readonly selectedFrameIndex: number;
  readonly onSelectFrame: (index: number) => void;
  readonly combinedWarnings: readonly string[];
}): ReactNode {
  if (inspectorEnabled && rendererMode === "svg" && currentFrame) {
    return (
      <InspectorDebugComposition
        frameNode={currentFrame.node}
        frameWidth={currentFrame.width}
        frameHeight={currentFrame.height}
        showHiddenNodes={showHiddenNodes}
        svgHtml={svgHtml}
        isRendering={isRendering}
      />
    );
  }
  return (
    <>
      <div style={previewStyle}>
        {renderPreviewContent({
          rendererMode,
          currentFrame,
          sceneGraph,
          isRendering,
          svgHtml,
        })}
      </div>
      <div style={sidebarStyle}>
        {currentCanvas && currentCanvas.frames.length > 0 && (
          <div style={frameListStyle}>
            <div style={frameListTitleStyle}>Frames</div>
            {currentCanvas.frames.map((frame, index) => (
              <div
                key={index}
                style={{ ...frameItemStyle, ...(index === selectedFrameIndex ? frameItemActiveStyle : {}) }}
                onClick={() => onSelectFrame(index)}
              >
                <div style={frameNameStyle}>{frame.name}</div>
                <div style={frameSizeStyle}>{frame.width} x {frame.height}</div>
              </div>
            ))}
          </div>
        )}
        {combinedWarnings.length > 0 && (
          <div style={warningsStyle}>
            <div style={warningsTitleStyle}>Warnings</div>
            {combinedWarnings.slice(0, 10).map((warning, index) => <div key={index} style={warningStyle}>{warning}</div>)}
            {combinedWarnings.length > 10 && <div style={warningStyle}>...and {combinedWarnings.length - 10} more</div>}
          </div>
        )}
      </div>
    </>
  );
}

// Singleton font loader
const browserFontLoader = createBrowserFontLoader();
const fontLoader = createCachingFontLoader(browserFontLoader);

// =============================================================================
// Component
// =============================================================================






/** Render SVG/WebGL debug output for one loaded fig file. */
export function RendererDebugView({ raw }: Props) {
  const [parsedFile, setParsedFile] = useState<ParsedFigFile | null>(null);
  const [designDoc, setDesignDoc] = useState<FigDesignDocument | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (raw.length === 0) {
      setParsedFile(null);
      setDesignDoc(null);
      return;
    }
    const cancelled = { value: false };

    // Parse both low-level (for SVG renderer) and domain (for WebGL/SceneGraph)
    Promise.all([
      parseFigFile(raw),
      loadFigFile(raw).then((loaded) => {
        const tree = buildNodeTree(loaded.nodeChanges);
        return treeToDocument(tree, loaded);
      }),
    ]).then(
      ([parsed, doc]) => {
        if (!cancelled.value) {
          setParsedFile(parsed);
          setDesignDoc(doc);
        }
      },
      (err) => {
        if (!cancelled.value) {
          setParseError(err instanceof Error ? err.message : String(err));
        }
      },
    );
    return () => { cancelled.value = true; };
  }, [raw]);

  if (parseError) {return <div style={loadingStyle}>Parse error: {parseError}</div>;}
  if (!parsedFile || !designDoc) {return <div style={loadingStyle}>Parsing .fig for renderer debug...</div>;}
  return <RendererDebugContent parsedFile={parsedFile} designDoc={designDoc} />;
}

function RendererDebugContent({ parsedFile, designDoc }: { parsedFile: ParsedFigFile; designDoc: FigDesignDocument }) {
  const [selectedCanvasIndex, setSelectedCanvasIndex] = useState(0);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [showHiddenNodes, setShowHiddenNodes] = useState(false);
  const [fontAccessGranted, setFontAccessGranted] = useState(false);
  const [fontAccessSupported] = useState(() => isBrowserFontLoaderSupported());
  const [renderResult, setRenderResult] = useState<{ svg: string; warnings: readonly string[] }>({ svg: "", warnings: [] });
  const [isRendering, setIsRendering] = useState(false);
  const [inspectorEnabled, setInspectorEnabled] = useState(false);
  const [rendererMode, setRendererMode] = useState<RendererMode>("svg");

  const { canvases, nodeCount, symbolMap, symbolResolveWarnings } = useMemo(() => {
    const { roots, nodeMap } = buildNodeTree(parsedFile.nodeChanges);
    const canvasNodes = findNodesByType(roots, "CANVAS").filter(isUserVisibleCanvasNode);
    const canvasInfos: CanvasInfo[] = canvasNodes.map((canvas) => {
      const frames = collectFrameInfos(canvas.children ?? []);
      return { node: canvas, name: canvas.name ?? "Unnamed Page", frames };
    });
    const warnings: string[] = [];
    preResolveSymbols(nodeMap, { warnings });
    return { canvases: canvasInfos, nodeCount: parsedFile.nodeChanges.length, symbolMap: nodeMap, symbolResolveWarnings: warnings };
  }, [parsedFile]);

  const combinedWarnings = useMemo(() => [...symbolResolveWarnings, ...renderResult.warnings], [symbolResolveWarnings, renderResult.warnings]);
  const currentCanvas = canvases[selectedCanvasIndex];
  const currentFrame = currentCanvas?.frames[selectedFrameIndex];
  const currentDesignPage = useMemo(
    () => designDoc.pages.find((page) => !currentCanvas || page.name === currentCanvas.name),
    [designDoc.pages, currentCanvas],
  );
  const textFontResolver = useFigTextFontResolver({
    page: currentDesignPage,
    fontLoader: fontAccessGranted ? fontLoader : undefined,
  });

  // Page select options
  const pageOptions = useMemo(
    () => canvases.map((c, i) => ({ value: String(i), label: `${c.name} (${c.frames.length})` })),
    [canvases],
  );

  // Frame select options
  const frameOptions = useMemo(
    () => (currentCanvas?.frames ?? []).map((f, i) => ({ value: String(i), label: `${f.name} (${f.width}x${f.height})` })),
    [currentCanvas],
  );

  // Build SceneGraph for WebGL from the domain document (FigDesignNode).
  // The domain pipeline (loadFigFile → treeToDocument → FigDesignDocument) ensures
  // fills, strokes, effects, and other properties are correctly resolved.
  const sceneGraph = useMemo(() => {
    if (rendererMode !== "webgl" || !currentFrame) {return null;}
    try {
      const designNode = findDesignNodeForFrame({ designDoc, currentCanvas, currentFrame });
      if (!designNode) {
        console.warn(`Design node not found for frame "${currentFrame.name}"`);
        return null;
      }
      const normalizedNode = normalizeDesignNodeForFrameRender(designNode);
      return buildSceneGraph([normalizedNode], {
        blobs: designDoc.blobs,
        images: designDoc.images,
        canvasSize: { width: currentFrame.width, height: currentFrame.height },
        viewport: { x: 0, y: 0, width: currentFrame.width, height: currentFrame.height },
        symbolMap: designDoc.components,
        styleRegistry: designDoc.styleRegistry,
        showHiddenNodes,
        warnings: [],
        textFontResolver,
      });
    } catch (e) {
      console.error("Failed to build scene graph:", e);
      return null;
    }
  }, [rendererMode, currentFrame, currentCanvas, designDoc, showHiddenNodes, textFontResolver]);

  useEffect(() => {
    if (!currentFrame) {
      setRenderResult({ svg: "", warnings: [] });
      return;
    }
    const cancelRef = { value: false };
    setIsRendering(true);
    renderCanvas(
      { children: [currentFrame.node] },
      { width: currentFrame.width, height: currentFrame.height, blobs: parsedFile.blobs, images: parsedFile.images, showHiddenNodes, symbolMap, fontLoader: fontAccessGranted ? fontLoader : undefined },
    ).then((result) => { if (!cancelRef.value) { setRenderResult(result); setIsRendering(false); } });
    return () => { cancelRef.value = true; };
  }, [currentFrame, parsedFile.blobs, parsedFile.images, showHiddenNodes, fontAccessGranted, symbolMap]);

  const handleRequestFontAccess = async () => {
    try {
      await fontLoader.isFontAvailable("Arial");
      setFontAccessGranted(browserFontLoader.hasPermission());
    } catch (error) {
      console.debug("Font access request failed:", error);
      setFontAccessGranted(false);
    }
  };

  const handleCanvasChange = (value: string) => { setSelectedCanvasIndex(Number(value)); setSelectedFrameIndex(0); };

  return (
    <div style={containerStyle}>
      {/* Toolbar */}
      <div style={toolbarStyle}>
        <div style={statStyle}><strong>{canvases.length}</strong> pages</div>
        <div style={statStyle}><strong>{currentCanvas?.frames.length ?? 0}</strong> frames</div>
        <div style={statStyle}><strong>{nodeCount}</strong> nodes</div>
        {combinedWarnings.length > 0 && <div style={statStyle}><strong>{combinedWarnings.length}</strong> warnings</div>}

        <div style={toolbarGroupStyle}>
          <span style={labelStyle}>Page:</span>
          <Select value={String(selectedCanvasIndex)} onChange={handleCanvasChange} options={pageOptions} />
        </div>

        {currentCanvas && currentCanvas.frames.length > 0 && (
          <div style={toolbarGroupStyle}>
            <span style={labelStyle}>Frame:</span>
            <Select value={String(selectedFrameIndex)} onChange={(v) => setSelectedFrameIndex(Number(v))} options={frameOptions} />
          </div>
        )}

        <Tabs<RendererMode>
          items={[
            { id: "svg", label: "SVG", content: null },
            { id: "webgl", label: "WebGL", content: null },
          ]}
          value={rendererMode}
          onChange={setRendererMode}
          size="sm"
          style={{ flex: "none" }}
        />

        <Toggle
          checked={inspectorEnabled}
          onChange={setInspectorEnabled}
          label="Inspector"
          disabled={rendererMode === "webgl"}
        />

        <Toggle
          checked={showHiddenNodes}
          onChange={setShowHiddenNodes}
          label="Show hidden"
        />

        {renderFontAccessControl({ fontAccessSupported, fontAccessGranted, onRequestFontAccess: handleRequestFontAccess })}
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {renderDebugMainContent({
          inspectorEnabled,
          rendererMode,
          currentFrame,
          showHiddenNodes,
          svgHtml: renderResult.svg,
          isRendering,
          sceneGraph,
          currentCanvas,
          selectedFrameIndex,
          onSelectFrame: setSelectedFrameIndex,
          combinedWarnings,
        })}
      </div>
    </div>
  );
}

// =============================================================================
// InspectorDebugComposition
// =============================================================================

type InspectorDebugCompositionProps = {
  readonly frameNode: FigNode;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly showHiddenNodes: boolean;
  readonly svgHtml: string;
  readonly isRendering: boolean;
};

const inspectorLayoutStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  gap: spacingTokens.md,
  minHeight: 0,
};

const inspectorMainStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.sm,
  minHeight: 0,
};

const inspectorCanvasStyle: CSSProperties = {
  position: "relative",
  flex: 1,
  overflow: "auto",
  backgroundColor: colorTokens.background.primary,
  borderRadius: radiusTokens.md,
  border: `1px solid ${colorTokens.border.subtle}`,
  padding: spacingTokens.md,
};

const inspectorStageStyle: CSSProperties = {
  position: "relative",
  display: "inline-block",
};

const inspectorOverlaySvgStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
};

const inspectorTreeStyle: CSSProperties = {
  width: 320,
  flexShrink: 0,
  overflow: "hidden",
  backgroundColor: colorTokens.background.secondary,
  borderRadius: radiusTokens.md,
  border: `1px solid ${colorTokens.border.subtle}`,
};

/**
 * Composes the shared inspector parts (overlay + tree + legend) around
 * the SVG produced by renderCanvas. Lives in the dev app only — the
 * real editor uses FigInspectorOverlay inside FigEditorCanvas instead.
 */
function InspectorDebugComposition({
  frameNode,
  frameWidth,
  frameHeight,
  showHiddenNodes,
  svgHtml,
  isRendering,
}: InspectorDebugCompositionProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const initialTransform = useMemo(
    () => getRootNormalizationTransform(frameNode),
    [frameNode],
  );

  const boxes = useMemo(
    () => collectFigBoxes(frameNode, initialTransform, showHiddenNodes),
    [frameNode, initialTransform, showHiddenNodes],
  );

  const treeRoot = useMemo(() => figNodeToInspectorTree(frameNode), [frameNode]);

  const handleNodeClick = useCallback((id: string) => {
    setHighlightedId((prev) => (prev === id ? null : id));
  }, []);

  const handleHover = useCallback((id: string | null) => {
    setHoveredId(id);
  }, []);

  return (
    <div style={inspectorLayoutStyle}>
      <div style={inspectorMainStyle}>
        <CategoryLegend registry={FIG_NODE_CATEGORY_REGISTRY} order={FIG_LEGEND_ORDER} />
        <div style={inspectorCanvasStyle}>
          <div style={inspectorStageStyle}>
            {renderInspectorSvgContent({ isRendering, svgHtml })}
            <svg
              style={inspectorOverlaySvgStyle}
              viewBox={`0 0 ${frameWidth} ${frameHeight}`}
              width={frameWidth}
              height={frameHeight}
              preserveAspectRatio="xMinYMin meet"
            >
              <InspectorCanvasOverlay
                boxes={boxes}
                registry={FIG_NODE_CATEGORY_REGISTRY}
                highlightedNodeId={highlightedId}
                hoveredNodeId={hoveredId}
                onNodeHover={handleHover}
                onNodeClick={handleNodeClick}
                interactive
              />
            </svg>
          </div>
        </div>
      </div>
      <div style={inspectorTreeStyle}>
        <InspectorTreePanel
          rootNode={treeRoot}
          registry={FIG_NODE_CATEGORY_REGISTRY}
          highlightedNodeId={highlightedId}
          hoveredNodeId={hoveredId}
          onNodeHover={handleHover}
          onNodeClick={handleNodeClick}
          showHiddenNodes={showHiddenNodes}
        />
      </div>
    </div>
  );
}
