/**
 * @file Dev entry point for fig-editor.
 *
 * Two modes:
 * - Editor: Full FigEditor with .fig file
 * - Renderer Debug: SVG/WebGL renderer switching + inspector overlay
 *
 * Both modes share the same .fig file loading pipeline.
 */

import { useMemo, useState, useCallback, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import type { FigDesignDocument } from "@aurochs/fig/domain";
import { createFigDesignDocument, createEmptyFigDesignDocument } from "@aurochs-builder/fig";
import type { EditorPanel } from "@aurochs-ui/editor-controls/editor-shell";
import { Button, Tabs, Toggle, injectCSSVariables, colorTokens, spacingTokens, fontTokens, radiusTokens } from "@aurochs-ui/ui-components";
import { FigEditor } from "../src/editor/FigEditor";
import { PageListPanel } from "../src/panels/PageListPanel";
import { LayerPanel } from "../src/panels/LayerPanel";
import { PropertyPanel } from "../src/panels/PropertyPanel";
import { FigInspectorPanel } from "../src/panels/FigInspectorPanel";
import { FigInspectorDetailsPanel } from "../src/panels/FigInspectorDetailsPanel";
import { FigInspectorOverlay } from "../src/inspector/FigInspectorOverlay";
import { FigInspectorProvider } from "../src/inspector/FigInspectorContext";
import { FileDropZone } from "./components/FileDropZone";
import { RendererDebugView } from "./components/RendererDebugView";

injectCSSVariables();

// =============================================================================
// Types
// =============================================================================

type DevMode = "editor" | "renderer-debug";

type LoadedFile = {
  readonly document: FigDesignDocument;
  readonly raw: Uint8Array;
  readonly fileName: string;
};

// =============================================================================
// Styles (layout only — visual styling via design tokens)
// =============================================================================

const appStyle: CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  backgroundColor: colorTokens.background.secondary,
  color: colorTokens.text.primary,
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `${spacingTokens.sm} ${spacingTokens.lg}`,
  borderBottom: `1px solid ${colorTokens.border.primary}`,
  backgroundColor: colorTokens.background.secondary,
};

const headerLeftStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.md,
};

const titleStyle: CSSProperties = {
  fontSize: fontTokens.size.xl,
  fontWeight: fontTokens.weight.semibold,
  margin: 0,
};

const fileNameStyle: CSSProperties = {
  fontSize: fontTokens.size.md,
  color: colorTokens.text.secondary,
};

const headerRightStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
};

const mainStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
};

const mainPaddedStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  padding: spacingTokens.lg,
  minHeight: 0,
  overflow: "auto",
};

const errorStyle: CSSProperties = {
  margin: spacingTokens.lg,
  padding: spacingTokens.md,
  backgroundColor: "rgba(239, 68, 68, 0.1)",
  border: `1px solid ${colorTokens.accent.danger}`,
  borderRadius: radiusTokens.md,
  color: colorTokens.accent.danger,
  fontSize: fontTokens.size.md,
};

const tabsContainerStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
};

const leftPanelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "hidden",
};

const layerPanelWrapperStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
};

const rightPanelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "hidden",
};

const rightTabsStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
};

const inspectorTabStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: 0,
};

const inspectorTreeWrapperStyle: CSSProperties = {
  flex: "0 0 45%",
  minHeight: 0,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const inspectorDetailsWrapperStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  borderTop: `1px solid ${colorTokens.border.primary}`,
};

function InspectorTabContent() {
  return (
    <div style={inspectorTabStyle}>
      <div style={inspectorTreeWrapperStyle}>
        <FigInspectorPanel />
      </div>
      <div style={inspectorDetailsWrapperStyle}>
        <FigInspectorDetailsPanel />
      </div>
    </div>
  );
}

function LeftPanelContent() {
  return (
    <div style={leftPanelStyle}>
      <PageListPanel />
      <div style={layerPanelWrapperStyle}>
        <LayerPanel />
      </div>
    </div>
  );
}

type RightTab = "inspector" | "properties";

function RightPanelContent() {
  return (
    <div style={rightPanelStyle}>
      <Tabs<RightTab>
        items={[
          { id: "inspector", label: "Inspector", content: <InspectorTabContent /> },
          { id: "properties", label: "Properties", content: <PropertyPanel /> },
        ]}
        defaultValue="inspector"
        size="sm"
        style={rightTabsStyle}
      />
    </div>
  );
}

// =============================================================================
// App
// =============================================================================

function App() {
  const [loadedFile, setLoadedFile] = useState<LoadedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<DevMode>("editor");
  const [inspectorOverlayEnabled, setInspectorOverlayEnabled] = useState(false);

  const editorPanels = useMemo<EditorPanel[]>(
    () => [
      {
        id: "pages-layers",
        position: "left",
        content: <LeftPanelContent />,
        drawerLabel: "Pages & Layers",
        scrollable: false,
      },
      {
        id: "inspector-properties",
        position: "right",
        content: <RightPanelContent />,
        drawerLabel: "Inspector",
        scrollable: false,
      },
    ],
    [],
  );

  const handleFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      const document = await createFigDesignDocument(data);
      setLoadedFile({ document, raw: data, fileName: file.name });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to parse file";
      setError(message);
      setLoadedFile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleNewDocument = useCallback(() => {
    const document = createEmptyFigDesignDocument();
    setLoadedFile({ document, raw: new Uint8Array(), fileName: "Untitled.fig" });
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    setLoadedFile(null);
    setError(null);
  }, []);

  // No file loaded: show drop zone
  if (!loadedFile) {
    return (
      <div style={appStyle}>
        <header style={headerStyle}>
          <div style={headerLeftStyle}>
            <h1 style={titleStyle}>Fig Editor Dev</h1>
          </div>
          <div style={headerRightStyle}>
            <Button variant="secondary" size="sm" onClick={handleNewDocument}>
              New Document
            </Button>
          </div>
        </header>
        <main style={mainPaddedStyle}>
          <FileDropZone onFile={handleFile} isLoading={isLoading} />
          {error && <div style={errorStyle}>{error}</div>}
        </main>
      </div>
    );
  }

  // File loaded: Tabs for Editor / Renderer Debug
  return (
    <div style={appStyle}>
      <header style={headerStyle}>
        <div style={headerLeftStyle}>
          <h1 style={titleStyle}>Fig Editor Dev</h1>
          <span style={fileNameStyle}>{loadedFile.fileName}</span>
        </div>
        <div style={headerRightStyle}>
          {mode === "editor" && (
            <Toggle
              checked={inspectorOverlayEnabled}
              onChange={setInspectorOverlayEnabled}
              label="Inspect overlay"
            />
          )}
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Close
          </Button>
        </div>
      </header>
      <Tabs<DevMode>
        items={[
          {
            id: "editor",
            label: "Editor",
            content: (
              <div style={mainStyle}>
                <FigInspectorProvider>
                  <FigEditor
                    initialDocument={loadedFile.document}
                    panels={editorPanels}
                    canvasOverlay={inspectorOverlayEnabled ? <FigInspectorOverlay /> : null}
                  />
                </FigInspectorProvider>
              </div>
            ),
          },
          {
            id: "renderer-debug",
            label: "Renderer Debug",
            content: (
              <div style={mainStyle}>
                <RendererDebugView raw={loadedFile.raw} />
              </div>
            ),
          },
        ]}
        value={mode}
        onChange={setMode}
        size="sm"
        style={tabsContainerStyle}
      />
    </div>
  );
}

// =============================================================================
// Mount
// =============================================================================

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<App />);
}
