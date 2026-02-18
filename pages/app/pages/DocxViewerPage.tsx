/**
 * @file DOCX viewer page.
 *
 * Read-only document viewer using ContinuousEditor in readOnly mode.
 */

import { useMemo } from "react";
import { ContinuousEditor } from "@aurochs-ui/docx-editor";
import type { DocxDocument } from "@aurochs-office/docx";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import { EditorPageLayout } from "../components/EditorPageLayout";
import { createDemoParagraphsAndNumbering } from "../demo-data/docx-demo";

type Props = {
  readonly document: DocxDocument | null;
  readonly fileName: string | null;
  readonly onBack: () => void;
};

/** DOCX viewer page with read-only ContinuousEditor. */
export function DocxViewerPage({ document, fileName, onBack }: Props) {
  const { paragraphs, numbering } = useMemo(() => {
    if (document) {
      return {
        paragraphs: document.body.content.filter((c): c is DocxParagraph => c.type === "paragraph"),
        numbering: document.numbering,
      };
    }
    return createDemoParagraphsAndNumbering();
  }, [document]);

  return (
    <EditorPageLayout
      fileName={fileName ?? "DOCX Demo"}
      onBack={onBack}
      editorContainerStyle={{ overflow: "auto", backgroundColor: "#525659" }}
    >
      <ContinuousEditor
        paragraphs={paragraphs}
        numbering={numbering}
        readOnly
      />
    </EditorPageLayout>
  );
}
