/**
 * @file XLSX viewer page.
 *
 * Read-only workbook viewer using WorkbookViewer component.
 */

import { useMemo } from "react";
import { WorkbookViewer } from "@aurochs-ui/xlsx-editor/viewer/WorkbookViewer";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import { EditorPageLayout } from "../components/EditorPageLayout";
import { createDemoWorkbook } from "../demo-data/xlsx-demo";

type Props = {
  readonly workbook: XlsxWorkbook | null;
  readonly fileName: string | null;
  readonly onBack: () => void;
};

/** XLSX viewer page with WorkbookViewer. */
export function XlsxViewerPage({ workbook: inputWorkbook, fileName, onBack }: Props) {
  const workbook = useMemo(() => inputWorkbook ?? createDemoWorkbook(), [inputWorkbook]);

  return (
    <EditorPageLayout
      fileName={fileName ?? "XLSX Demo"}
      onBack={onBack}
    >
      <WorkbookViewer
        workbook={workbook}
        showSheetTabs
        showToolbar
        showZoom
        showGridlines
        showHeaders
        style={{ height: "100%" }}
      />
    </EditorPageLayout>
  );
}
