/**
 * @file Renderer debug view.
 *
 * SVG/WebGL renderer switching with inspector overlay.
 * Uses ParsedFigFile (low-level) for direct renderer access.
 */

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { ParsedFigFile } from "@aurochs/fig/parser";
import { parseFigFile, buildNodeTree, findNodesByType } from "@aurochs/fig/parser";
import type { FigNode } from "@aurochs/fig/types";
import { preResolveSymbols } from "@aurochs/fig/symbols";
import { renderCanvas } from "@aurochs-renderer/fig/svg";
import { createBrowserFontLoader, isBrowserFontLoaderSupported } from "@aurochs-renderer/fig/font-drivers/browser";
import { createCachingFontLoader } from "@aurochs-renderer/fig/font";
import { buildSceneGraph } from "@aurochs-renderer/fig/scene-graph";
import type { SceneGraph } from "@aurochs-renderer/fig/scene-graph";
import { Button, Select, Tabs, Toggle, colorTokens, spacingTokens, fontTokens, radiusTokens } from "@aurochs-ui/ui-components";
import { FigInspectorView } from "../../src/inspector/FigInspectorView";
import { WebGLCanvas } from "./WebGLCanvas";

// =============================================================================
// Types
// =============================================================================

type RendererMode = "svg" | "webgl";

type Props = {
  readonly raw: Uint8Array;
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

// Singleton font loader
const browserFontLoader = createBrowserFontLoader();
const fontLoader = createCachingFontLoader(browserFontLoader);

// =============================================================================
// Component
// =============================================================================

export function RendererDebugView({ raw }: Props) {
  const [parsedFile, setParsedFile] = useState<ParsedFigFile | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (raw.length === 0) { setParsedFile(null); return; }
    let cancelled = false;
    parseFigFile(raw).then(
      (result) => { if (!cancelled) setParsedFile(result); },
      (err) => { if (!cancelled) setParseError(err instanceof Error ? err.message : String(err)); },
    );
    return () => { cancelled = true; };
  }, [raw]);

  if (parseError) return <div style={loadingStyle}>Parse error: {parseError}</div>;
  if (!parsedFile) return <div style={loadingStyle}>Parsing .fig for renderer debug...</div>;
  return <RendererDebugContent parsedFile={parsedFile} />;
}

function RendererDebugContent({ parsedFile }: { parsedFile: ParsedFigFile }) {
  const [selectedCanvasIndex, setSelectedCanvasIndex] = useState(0);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [showHiddenNodes, setShowHiddenNodes] = useState(false);
  const [fontAccessGranted, setFontAccessGranted] = useState(false);
  const [fontAccessSupported] = useState(() => isBrowserFontLoaderSupported());
  const [renderResult, setRenderResult] = useState<{ svg: string; warnings: readonly string[] }>({ svg: "", warnings: [] });
  const [isRendering, setIsRendering] = useState(false);
  const [inspectorEnabled, setInspectorEnabled] = useState(false);
  const [rendererMode, setRendererMode] = useState<RendererMode>("svg");

  const { canvases, nodeCount, symbolMap, resolvedSymbolCache, symbolResolveWarnings } = useMemo(() => {
    const { roots, nodeMap } = buildNodeTree(parsedFile.nodeChanges);
    const canvasNodes = findNodesByType(roots, "CANVAS");
    const canvasInfos: CanvasInfo[] = canvasNodes.map((canvas) => {
      const frames: FrameInfo[] = (canvas.children ?? []).map((child) => {
        const childData = child as Record<string, unknown>;
        const size = childData.size as { x?: number; y?: number } | undefined;
        return { node: child, name: child.name ?? "Unnamed Frame", width: size?.x ?? 100, height: size?.y ?? 100 };
      });
      return { node: canvas, name: canvas.name ?? "Unnamed Page", frames };
    });
    const warnings: string[] = [];
    const cache = preResolveSymbols(nodeMap, { warnings });
    return { canvases: canvasInfos, nodeCount: parsedFile.nodeChanges.length, symbolMap: nodeMap, resolvedSymbolCache: cache, symbolResolveWarnings: warnings };
  }, [parsedFile]);

  const combinedWarnings = useMemo(() => [...symbolResolveWarnings, ...renderResult.warnings], [symbolResolveWarnings, renderResult.warnings]);
  const currentCanvas = canvases[selectedCanvasIndex];
  const currentFrame = currentCanvas?.frames[selectedFrameIndex];

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

  const sceneGraph = useMemo(() => {
    if (rendererMode !== "webgl" || !currentFrame) return null;
    try {
      const node = currentFrame.node;
      const transform = node.transform;
      const normalizedNode = transform ? ({ ...node, transform: { ...transform, m02: 0, m12: 0 } } as FigNode) : node;
      return buildSceneGraph([normalizedNode], { blobs: parsedFile.blobs, images: parsedFile.images, canvasSize: { width: currentFrame.width, height: currentFrame.height }, symbolMap, showHiddenNodes });
    } catch (e) {
      console.error("Failed to build scene graph:", e);
      return null;
    }
  }, [rendererMode, currentFrame, parsedFile.blobs, parsedFile.images, symbolMap, showHiddenNodes]);

  useEffect(() => {
    if (!currentFrame) { setRenderResult({ svg: "", warnings: [] }); return; }
    const cancelRef = { value: false };
    setIsRendering(true);
    renderCanvas(
      { children: [currentFrame.node] },
      { width: currentFrame.width, height: currentFrame.height, blobs: parsedFile.blobs, images: parsedFile.images, showHiddenNodes, symbolMap, resolvedSymbolCache, fontLoader: fontAccessGranted ? fontLoader : undefined },
    ).then((result) => { if (!cancelRef.value) { setRenderResult(result); setIsRendering(false); } });
    return () => { cancelRef.value = true; };
  }, [currentFrame, parsedFile.blobs, parsedFile.images, showHiddenNodes, fontAccessGranted, symbolMap, resolvedSymbolCache]);

  const handleRequestFontAccess = async () => {
    try { await fontLoader.isFontAvailable("Arial"); setFontAccessGranted(browserFontLoader.hasPermission()); } catch { setFontAccessGranted(false); }
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

        {fontAccessSupported && (
          fontAccessGranted
            ? <span style={fontEnabledStyle}>Fonts enabled</span>
            : <Button variant="outline" size="sm" onClick={handleRequestFontAccess}>Enable Fonts</Button>
        )}
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {inspectorEnabled && rendererMode === "svg" && currentFrame ? (
          <FigInspectorView
            frameNode={currentFrame.node}
            frameWidth={currentFrame.width}
            frameHeight={currentFrame.height}
            showHiddenNodes={showHiddenNodes}
            svgHtml={renderResult.svg}
            isRendering={isRendering}
          />
        ) : (
          <>
            <div style={previewStyle}>
              {rendererMode === "webgl" ? (
                currentFrame ? <WebGLCanvas sceneGraph={sceneGraph} width={currentFrame.width} height={currentFrame.height} /> : <div style={emptyStateStyle}>No frames</div>
              ) : isRendering ? (
                <div style={emptyStateStyle}>Rendering...</div>
              ) : currentFrame ? (
                <div style={svgContainerStyle} dangerouslySetInnerHTML={{ __html: renderResult.svg }} />
              ) : (
                <div style={emptyStateStyle}>No frames</div>
              )}
            </div>
            <div style={sidebarStyle}>
              {currentCanvas && currentCanvas.frames.length > 0 && (
                <div style={frameListStyle}>
                  <div style={frameListTitleStyle}>Frames</div>
                  {currentCanvas.frames.map((frame, index) => (
                    <div
                      key={index}
                      style={{ ...frameItemStyle, ...(index === selectedFrameIndex ? frameItemActiveStyle : {}) }}
                      onClick={() => setSelectedFrameIndex(index)}
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
                  {combinedWarnings.slice(0, 10).map((w, i) => <div key={i} style={warningStyle}>{w}</div>)}
                  {combinedWarnings.length > 10 && <div style={warningStyle}>...and {combinedWarnings.length - 10} more</div>}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
