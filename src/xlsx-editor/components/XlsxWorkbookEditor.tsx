/**
 * @file XlsxWorkbookEditor
 *
 * Minimal workbook editor UI (sheet tabs + grid).
 */

import { useState, type CSSProperties } from "react";
import type { XlsxWorkbook } from "../../xlsx/domain/workbook";
import { spacingTokens } from "../../office-editor-components";
import { XlsxWorkbookEditorProvider, useXlsxWorkbookEditor } from "../context/workbook/XlsxWorkbookEditorContext";
import { XlsxSheetGrid, type XlsxGridMetrics } from "./XlsxSheetGrid";
import { XlsxWorkbookToolbar } from "./toolbar/XlsxWorkbookToolbar";
import { XlsxCellFormatPanel } from "./format-panel/XlsxCellFormatPanel";
import { XlsxSheetTabBar } from "./sheet-tab-bar";

export type XlsxWorkbookEditorProps = {
  readonly workbook: XlsxWorkbook;
  readonly grid: XlsxGridMetrics;
  readonly style?: CSSProperties;
  readonly onWorkbookChange?: (workbook: XlsxWorkbook) => void;
};

function XlsxWorkbookEditorInner({ grid }: { readonly grid: XlsxGridMetrics }) {
  const { workbook, activeSheetIndex } = useXlsxWorkbookEditor();
  const [isFormatPanelOpen, setIsFormatPanelOpen] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);

  const activeSheet = activeSheetIndex !== undefined ? workbook.sheets[activeSheetIndex] : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, height: "100%" }}>
      {activeSheet && activeSheetIndex !== undefined && (
        <div style={{ display: "flex", flexDirection: "column", gap: spacingTokens.sm, minHeight: 0, flex: 1 }}>
          <XlsxWorkbookToolbar
            sheetIndex={activeSheetIndex}
            isFormatPanelOpen={isFormatPanelOpen}
            onToggleFormatPanel={() => setIsFormatPanelOpen((v) => !v)}
            zoom={zoom}
            onZoomChange={setZoom}
          />
          <div style={{ flex: 1, minHeight: 0, display: "flex", gap: spacingTokens.sm }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <XlsxSheetGrid sheetIndex={activeSheetIndex} metrics={grid} zoom={zoom} />
            </div>
            {isFormatPanelOpen && (
              <XlsxCellFormatPanel sheetIndex={activeSheetIndex} onClose={() => setIsFormatPanelOpen(false)} />
            )}
          </div>
        </div>
      )}
      <XlsxSheetTabBar />
    </div>
  );
}

/**
 * Top-level XLSX workbook editor component.
 *
 * Mounts workbook editor state provider and renders the workbook UI (tabs + grid).
 */
export function XlsxWorkbookEditor({ workbook, grid, style, onWorkbookChange }: XlsxWorkbookEditorProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      <XlsxWorkbookEditorProvider initialWorkbook={workbook} onWorkbookChange={onWorkbookChange}>
        <XlsxWorkbookEditorInner grid={grid} />
      </XlsxWorkbookEditorProvider>
    </div>
  );
}
