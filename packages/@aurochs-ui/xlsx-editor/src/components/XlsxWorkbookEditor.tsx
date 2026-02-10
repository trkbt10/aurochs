/**
 * @file XlsxWorkbookEditor
 *
 * Workbook editor UI using EditorShell for responsive layout.
 */

import { useState, type CSSProperties } from "react";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import { EditorShell, type EditorShellPanel } from "@aurochs-ui/editor-controls/editor-shell";
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

function buildFormatRightPanel(
  sheetIndex: number,
  onClose: () => void,
): EditorShellPanel {
  return {
    content: <XlsxCellFormatPanel sheetIndex={sheetIndex} onClose={onClose} />,
    size: "320px",
    resizable: false,
  };
}

function XlsxWorkbookEditorInner({ grid }: { readonly grid: XlsxGridMetrics }) {
  const { workbook, activeSheetIndex } = useXlsxWorkbookEditor();
  const [isFormatPanelOpen, setIsFormatPanelOpen] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);

  const activeSheet = activeSheetIndex !== undefined ? workbook.sheets[activeSheetIndex] : undefined;

  if (!activeSheet || activeSheetIndex === undefined) {
    return (
      <EditorShell bottomBar={<XlsxSheetTabBar />}>
        <div />
      </EditorShell>
    );
  }

  function resolveRightPanel(sheetIndex: number) {
    if (isFormatPanelOpen) {
      return buildFormatRightPanel(sheetIndex, () => setIsFormatPanelOpen(false));
    }
    return undefined;
  }

  const rightPanel = resolveRightPanel(activeSheetIndex);

  return (
    <EditorShell
      toolbar={
        <XlsxWorkbookToolbar
          sheetIndex={activeSheetIndex}
          isFormatPanelOpen={isFormatPanelOpen}
          onToggleFormatPanel={() => setIsFormatPanelOpen((v) => !v)}
          zoom={zoom}
          onZoomChange={setZoom}
        />
      }
      rightPanel={rightPanel}
      bottomBar={<XlsxSheetTabBar />}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <XlsxSheetGrid sheetIndex={activeSheetIndex} metrics={grid} zoom={zoom} />
      </div>
    </EditorShell>
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
