/**
 * @file XLSX visual test harness entry point
 *
 * Renders an XlsxWorkbookEditor with a given workbook configuration
 * and allows screenshot capture via Puppeteer.
 */

import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import { XlsxWorkbookEditor } from "../../src";

declare global {
  interface Window {
    renderWorkbook: (json: string, config: RenderConfig) => Promise<void>;
    waitForRender: () => Promise<void>;
    __renderComplete?: boolean;
  }
}

type RenderConfig = {
  width: number;
  height: number;
  sheetIndex?: number;
  scrollTop?: number;
  scrollLeft?: number;
};

type AppState = {
  workbook: XlsxWorkbook | null;
  config: RenderConfig | null;
  renderKey: number;
};

// Root component that listens for render events
function Root() {
  const [appState, setAppState] = useState<AppState>({
    workbook: null,
    config: null,
    renderKey: 0,
  });

  // Listen for render requests from Puppeteer
  useEffect(() => {
    const handler = (e: CustomEvent<{ workbook: XlsxWorkbook; config: RenderConfig }>) => {
      // Reset render complete flag
      window.__renderComplete = false;
      setAppState((prev) => ({
        workbook: e.detail.workbook,
        config: e.detail.config,
        renderKey: prev.renderKey + 1,
      }));
    };

    window.addEventListener("xlsx-harness-render", handler as EventListener);
    return () => {
      window.removeEventListener("xlsx-harness-render", handler as EventListener);
    };
  }, []);

  // Signal render complete after DOM update
  useEffect(() => {
    if (appState.workbook && appState.config) {
      // Small delay to ensure React has finished rendering
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.__renderComplete = true;
        });
      });
    }
  }, [appState.workbook, appState.config, appState.renderKey]);

  if (!appState.workbook || !appState.config) {
    return null;
  }

  return (
    <div
      style={{
        width: appState.config.width,
        height: appState.config.height,
        overflow: "hidden",
      }}
    >
      <XlsxWorkbookEditor
        key={appState.renderKey}
        workbook={appState.workbook}
        onWorkbookChange={() => {}}
        initialSheetIndex={appState.config.sheetIndex ?? 0}
        grid={{
          rowCount: 1_048_576,
          colCount: 16_384,
          rowHeightPx: 22,
          colWidthPx: 120,
          headerSizePx: 32,
          colHeaderHeightPx: 22,
          rowHeaderWidthPx: 56,
          overscanRows: 4,
          overscanCols: 2,
        }}
      />
    </div>
  );
}

// Global render function called by Puppeteer
window.renderWorkbook = async (json: string, config: RenderConfig): Promise<void> => {
  const workbook = JSON.parse(json) as XlsxWorkbook;

  // Update state via a custom event
  window.dispatchEvent(
    new CustomEvent("xlsx-harness-render", {
      detail: { workbook, config },
    })
  );
};

// Wait for render to complete
window.waitForRender = async (): Promise<void> => {
  return new Promise((resolve) => {
    const check = () => {
      if (window.__renderComplete) {
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
