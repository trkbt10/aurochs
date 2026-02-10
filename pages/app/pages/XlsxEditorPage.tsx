/**
 * @file XLSX editor demo page.
 *
 * Wraps XlsxWorkbookEditor with header bar, file loading, and save functionality.
 */

import { useCallback, useMemo, useState } from "react";
import { XlsxWorkbookEditor } from "@aurochs-ui/xlsx-editor";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import { exportXlsx } from "@aurochs-builder/xlsx/exporter";
import { Button } from "@aurochs-ui/ui-components";
import { EditorPageLayout } from "../components/EditorPageLayout";
import { createDemoWorkbook } from "../demo-data/xlsx-demo";
import { downloadBlob } from "../utils/download";

type Props = {
  readonly workbook: XlsxWorkbook | null;
  readonly fileName: string | null;
  readonly onBack: () => void;
};

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** XLSX editor page with header, workbook editor, and save functionality. */
export function XlsxEditorPage({ workbook: inputWorkbook, fileName, onBack }: Props) {
  const initialWorkbook = useMemo(() => inputWorkbook ?? createDemoWorkbook(), [inputWorkbook]);
  const [currentWorkbook, setCurrentWorkbook] = useState<XlsxWorkbook>(initialWorkbook);
  const [workbookRevision, setWorkbookRevision] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Reset when input changes
  useMemo(() => {
    setCurrentWorkbook(initialWorkbook);
    setWorkbookRevision((v) => v + 1);
  }, [initialWorkbook]);

  const defaultSaveName = useMemo(() => {
    if (!fileName) {return "workbook.xlsx";}
    if (fileName.toLowerCase().endsWith(".xlsx")) {return fileName;}
    if (fileName.toLowerCase().endsWith(".xls")) {return fileName.replace(/\.xls$/i, ".xlsx");}
    return `${fileName}.xlsx`;
  }, [fileName]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const bytes = await exportXlsx(currentWorkbook);
      downloadBlob(bytes, defaultSaveName, XLSX_MIME);
    } finally {
      setIsSaving(false);
    }
  }, [currentWorkbook, defaultSaveName]);

  const headerActions = (
    <Button
      variant="primary"
      size="md"
      onClick={() => void handleSave()}
      disabled={isSaving}
      style={{ marginLeft: "auto" }}
    >
      {isSaving ? "Saving..." : "Save XLSX"}
    </Button>
  );

  return (
    <EditorPageLayout
      fileName={fileName ?? "XLSX Demo"}
      onBack={onBack}
      headerActions={headerActions}
    >
      <XlsxWorkbookEditor
        key={workbookRevision}
        workbook={initialWorkbook}
        onWorkbookChange={setCurrentWorkbook}
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
    </EditorPageLayout>
  );
}
