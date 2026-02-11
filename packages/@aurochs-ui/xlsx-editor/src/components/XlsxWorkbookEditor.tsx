/**
 * @file XlsxWorkbookEditor
 *
 * Workbook editor UI using EditorShell for responsive layout.
 */

import { useMemo, useState, type CSSProperties } from "react";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import { EditorShell, type EditorPanel } from "@aurochs-ui/editor-controls/editor-shell";
import { editorShellTokens } from "@aurochs-ui/ui-components/design-tokens";
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
  const [zoom, setZoom] = useState<number>(1);

  const activeSheet = activeSheetIndex !== undefined ? workbook.sheets[activeSheetIndex] : undefined;

  const panels = useMemo<EditorPanel[]>(() => {
    if (activeSheetIndex === undefined) {
      return [];
    }
    return [
      {
        id: "format",
        position: "right",
        content: <XlsxCellFormatPanel sheetIndex={activeSheetIndex} />,
        size: editorShellTokens.panel.xlsxFormatPanelSize,
        resizable: false,
        drawerLabel: "Format",
      },
    ];
  }, [activeSheetIndex]);

  if (!activeSheet || activeSheetIndex === undefined) {
    return (
      <EditorShell bottomBar={<XlsxSheetTabBar />}>
        <div />
      </EditorShell>
    );
  }

  return (
    <EditorShell
      toolbar={
        <XlsxWorkbookToolbar
          sheetIndex={activeSheetIndex}
          zoom={zoom}
          onZoomChange={setZoom}
        />
      }
      panels={panels}
      bottomBar={<XlsxSheetTabBar />}
    >
      <div style={{ width: "100%", height: "100%", minWidth: 0, minHeight: 0 }}>
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
