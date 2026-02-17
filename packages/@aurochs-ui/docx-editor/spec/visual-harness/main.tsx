/**
 * @file DOCX visual test harness entry point
 *
 * Renders a DOCX document with a given configuration
 * and allows screenshot capture via Puppeteer.
 */

import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import type { DocxParagraph, DocxNumbering, DocxSectionProperties } from "@aurochs-office/docx/domain";
import { PageRenderer, useDocumentLayout } from "@aurochs-renderer/docx/react";

// Window extension type for test harness functions
type HarnessWindow = Window & {
  renderDocument: (json: string, config: RenderConfig) => Promise<void>;
  waitForRender: () => Promise<void>;
  __renderComplete?: boolean;
};

// Type-safe accessor for the harness window
const harnessWindow = window as HarnessWindow;

type RenderConfig = {
  width: number;
  height: number;
  pageIndex?: number;
};

type DocumentData = {
  paragraphs: DocxParagraph[];
  numbering?: DocxNumbering;
  sectPr?: DocxSectionProperties;
};

type AppState = {
  documentData: DocumentData | null;
  config: RenderConfig | null;
  renderKey: number;
};

// Page component that uses the layout hook
function DocumentPage({
  documentData,
  config,
}: {
  documentData: DocumentData;
  config: RenderConfig;
}) {
  // Debug: log paragraph count
  console.log("[DOCX Harness] Rendering", documentData.paragraphs?.length ?? 0, "paragraphs");

  const { pagedLayout } = useDocumentLayout({
    paragraphs: documentData.paragraphs,
    numbering: documentData.numbering,
    sectPr: documentData.sectPr,
    mode: "paged",
  });

  // Debug: log page count
  console.log("[DOCX Harness] Layout produced", pagedLayout.pages?.length ?? 0, "pages");

  const pageIndex = config.pageIndex ?? 0;
  const page = pagedLayout.pages[pageIndex];

  if (!page) {
    console.error("[DOCX Harness] Page not found:", pageIndex, "of", pagedLayout.pages?.length);
    return (
      <div style={{
        color: "red",
        padding: 20,
        backgroundColor: "#fff",
        width: 612,
        height: 792,
      }}>
        Page {pageIndex} not found (total: {pagedLayout.pages?.length ?? 0})
      </div>
    );
  }

  console.log("[DOCX Harness] Page dimensions:", page.width, "x", page.height);

  return (
    <div
      style={{
        width: page.width as number,
        height: page.height as number,
        backgroundColor: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        overflow: "hidden",
      }}
    >
      <PageRenderer page={page} pageIndex={pageIndex} showCursor={false} />
    </div>
  );
}

// Root component that listens for render events
function Root() {
  const [appState, setAppState] = useState<AppState>({
    documentData: null,
    config: null,
    renderKey: 0,
  });

  // Listen for render requests from Puppeteer
  useEffect(() => {
    const handler = (e: CustomEvent<{ documentData: DocumentData; config: RenderConfig }>) => {
      // Reset render complete flag
      harnessWindow.__renderComplete = false;
      setAppState((prev) => ({
        documentData: e.detail.documentData,
        config: e.detail.config,
        renderKey: prev.renderKey + 1,
      }));
    };

    window.addEventListener("docx-harness-render", handler as EventListener);
    return () => {
      window.removeEventListener("docx-harness-render", handler as EventListener);
    };
  }, []);

  // Signal render complete after DOM update
  useEffect(() => {
    if (appState.documentData && appState.config) {
      // Small delay to ensure React has finished rendering
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          harnessWindow.__renderComplete = true;
        });
      });
    }
  }, [appState.documentData, appState.config, appState.renderKey]);

  if (!appState.documentData || !appState.config) {
    return null;
  }

  return (
    <div
      style={{
        width: appState.config.width,
        height: appState.config.height,
        overflow: "hidden",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: 20,
      }}
    >
      <DocumentPage
        key={appState.renderKey}
        documentData={appState.documentData}
        config={appState.config}
      />
    </div>
  );
}

// Global render function called by Puppeteer
harnessWindow.renderDocument = async (json: string, config: RenderConfig): Promise<void> => {
  const documentData = JSON.parse(json) as DocumentData;

  // Update state via a custom event
  window.dispatchEvent(
    new CustomEvent("docx-harness-render", {
      detail: { documentData, config },
    })
  );
};

// Wait for render to complete
harnessWindow.waitForRender = async (): Promise<void> => {
  return new Promise((resolve) => {
    const check = () => {
      if (harnessWindow.__renderComplete) {
        resolve();
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  });
};

// Mount application
const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <Root />
  </StrictMode>
);

// Signal readiness
document.title = "ready";
