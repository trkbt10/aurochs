/**
 * @file DOCX editor demo page.
 *
 * Wraps DocxDocumentEditor with EditorShell layout.
 */

import { useMemo } from "react";
import { DocxDocumentEditor } from "@aurochs-ui/docx-editor";
import type { DocxDocument } from "@aurochs-office/docx";
import { EditorPageLayout } from "../components/EditorPageLayout";
import { createDemoDocxDocument } from "../demo-data/docx-demo";

type Props = {
  readonly document: DocxDocument | null;
  readonly fileName: string | null;
  readonly onBack: () => void;
};

/** DOCX editor page with DocxDocumentEditor. */
export function DocxEditorPage({ document, fileName, onBack }: Props) {
  const docxDocument = useMemo(() => {
    return document ?? createDemoDocxDocument();
  }, [document]);

  return (
    <EditorPageLayout
      fileName={fileName ?? "DOCX Demo"}
      onBack={onBack}
    >
      <DocxDocumentEditor initialDocument={docxDocument} />
    </EditorPageLayout>
  );
}
