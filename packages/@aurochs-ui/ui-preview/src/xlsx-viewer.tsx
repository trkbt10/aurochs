/**
 * @file XLSX Viewer preview with file upload
 *
 * Tests the viewer components from @aurochs-ui/xlsx-editor/viewer:
 * - WorkbookViewer: Full-featured viewer with sheet tabs
 * - EmbeddableSheet: Lightweight embed component
 */

import { StrictMode, useState, useCallback, useMemo, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { injectCSSVariables, colorTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import { Button, Tabs, type TabItem } from "@aurochs-ui/ui-components/primitives";
import { UploadIcon } from "@aurochs-ui/ui-components/icons";
import { WorkbookViewer } from "@aurochs-ui/xlsx-editor/viewer/WorkbookViewer";
import { EmbeddableSheet } from "@aurochs-ui/xlsx-editor/viewer/EmbeddableSheet";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import { detectSpreadsheetFileType, parseXlsWithReport } from "@aurochs-office/xls";
import { createGetZipTextFileContentFromBytes } from "@aurochs-office/opc";
import { parseXlsxWorkbook } from "@aurochs-office/xlsx/parser";

injectCSSVariables();

// =============================================================================
// Types
// =============================================================================

type ViewerMode = "full" | "embeddable";

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  width: "100vw",
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  background: colorTokens.background.primary,
  fontFamily: "system-ui, sans-serif",
  color: colorTokens.text.primary,
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `${spacingTokens.md} ${spacingTokens.lg}`,
  background: colorTokens.background.secondary,
  borderBottom: `1px solid ${colorTokens.border.subtle}`,
  flexShrink: 0,
};

const titleStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
};

const controlsStyle: CSSProperties = {
  display: "flex",
  gap: spacingTokens.sm,
  alignItems: "center",
};

const contentStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  position: "relative",
  padding: spacingTokens.lg,
};

const dropzoneStyle = (isDragging: boolean): CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: spacingTokens.md,
  padding: spacingTokens.xl,
  border: `2px dashed ${isDragging ? colorTokens.accent.primary : colorTokens.border.strong}`,
  borderRadius: "12px",
  background: isDragging ? "rgba(59, 130, 246, 0.1)" : colorTokens.background.secondary,
  transition: "all 0.2s",
  cursor: "pointer",
});

const dropzoneTextStyle: CSSProperties = {
  fontSize: "18px",
  fontWeight: 500,
  color: colorTokens.text.secondary,
};

const dropzoneSubtextStyle: CSSProperties = {
  fontSize: "14px",
  color: colorTokens.text.tertiary,
};

const viewerContainerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const componentInfoStyle: CSSProperties = {
  position: "absolute",
  bottom: spacingTokens.md,
  left: "50%",
  transform: "translateX(-50%)",
  padding: `${spacingTokens.sm} ${spacingTokens.md}`,
  background: "rgba(0, 0, 0, 0.7)",
  borderRadius: "6px",
  fontSize: "13px",
  color: colorTokens.overlay.lightText,
};

// =============================================================================
// File Parsing
// =============================================================================

async function parseWorkbookFromFile(file: File): Promise<XlsxWorkbook> {
  const data = new Uint8Array(await file.arrayBuffer());
  const fileType = detectSpreadsheetFileType(data);

  if (fileType === "unknown") {
    throw new Error("Unknown file format. Expected XLS or XLSX file.");
  }

  if (fileType === "xls") {
    const parsed = parseXlsWithReport(data, { mode: "lenient" });
    return parsed.workbook;
  }

  const getFileContent = await createGetZipTextFileContentFromBytes(data);
  return await parseXlsxWorkbook(getFileContent);
}

// =============================================================================
// Main Component
// =============================================================================

function App() {
  const [workbook, setWorkbook] = useState<XlsxWorkbook | null>(null);
  const [viewerMode, setViewerMode] = useState<ViewerMode>("full");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileLoad = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const wb = await parseWorkbookFromFile(file);
      setWorkbook(wb);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workbook");
      console.error("Failed to load workbook:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
        handleFileLoad(file);
      } else {
        setError("Please drop an .xlsx or .xls file");
      }
    },
    [handleFileLoad],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileLoad(file);
      }
    },
    [handleFileLoad],
  );

  const handleClear = useCallback(() => {
    setWorkbook(null);
    setError(null);
  }, []);

  const tabItems: TabItem<ViewerMode>[] = useMemo(
    () => [
      {
        id: "full",
        label: "WorkbookViewer",
        content: workbook ? (
          <div style={viewerContainerStyle}>
            <div style={{ width: "100%", height: "100%" }}>
              <WorkbookViewer
                workbook={workbook}
                showSheetTabs
                showToolbar
                showZoom
                showGridlines
                showHeaders
              />
            </div>
            <div style={componentInfoStyle}>WorkbookViewer component</div>
          </div>
        ) : null,
      },
      {
        id: "embeddable",
        label: "EmbeddableSheet",
        content: workbook ? (
          <div style={viewerContainerStyle}>
            <div style={{ maxWidth: "800px", width: "100%", height: "500px" }}>
              <EmbeddableSheet
                workbook={workbook}
                showSheetTabs
                showSheetIndicator
                showZoom
                maxHeight="500px"
              />
            </div>
            <div style={componentInfoStyle}>EmbeddableSheet component</div>
          </div>
        ) : null,
      },
    ],
    [workbook],
  );

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div style={titleStyle}>XLSX Viewer Preview</div>
        <div style={controlsStyle}>
          {workbook && (
            <Button variant="ghost" onClick={handleClear}>
              Clear
            </Button>
          )}
          {!workbook && (
            <label>
              <Button variant="primary" style={{ cursor: "pointer" }} onClick={() => {}}>
                <UploadIcon size={16} />
                Open File
              </Button>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileInput}
                style={{ display: "none" }}
              />
            </label>
          )}
        </div>
      </header>

      <div style={contentStyle}>
        {isLoading && (
          <div style={{ color: colorTokens.text.secondary }}>Loading workbook...</div>
        )}

        {error && (
          <div style={{ color: colorTokens.accent.danger, textAlign: "center" }}>
            <p style={{ marginBottom: spacingTokens.md }}>{error}</p>
            <Button variant="primary" onClick={handleClear}>
              Try Again
            </Button>
          </div>
        )}

        {!workbook && !isLoading && !error && (
          <div
            style={dropzoneStyle(isDragging)}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
          >
            <UploadIcon size={48} />
            <div style={dropzoneTextStyle}>Drop an Excel file here</div>
            <div style={dropzoneSubtextStyle}>Supports .xlsx and .xls files</div>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileInput}
              style={{ display: "none" }}
            />
          </div>
        )}

        {workbook && !isLoading && (
          <Tabs
            items={tabItems}
            value={viewerMode}
            onChange={setViewerMode}
            style={{ width: "100%", height: "100%" }}
          />
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
