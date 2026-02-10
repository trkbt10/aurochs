/**
 * @file DOCX editor demo page.
 *
 * Wraps ContinuousEditor with a header bar and demo document generation.
 */

import { useMemo, useState } from "react";
import { ContinuousEditor } from "@aurochs-ui/docx-editor";
import type { DocxDocument } from "@aurochs-office/docx";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import { Button } from "@aurochs-ui/ui-components";
import { EditorPageLayout } from "../components/EditorPageLayout";
import { createDemoDocument } from "../demo-data/docx-demo";

type Props = {
  readonly document: DocxDocument | null;
  readonly fileName: string | null;
  readonly onBack: () => void;
};

/** DOCX editor page with header, ContinuousEditor, and vertical/horizontal toggle. */
export function DocxEditorPage({ document, fileName, onBack }: Props) {
  const [isVertical, setIsVertical] = useState(false);

  const { paragraphs, numbering } = useMemo(() => {
    if (document) {
      return {
        paragraphs: document.body.content.filter((c): c is DocxParagraph => c.type === "paragraph"),
        numbering: document.numbering,
      };
    }
    return createDemoDocument();
  }, [document]);

  const headerActions = (
    <Button
      variant={isVertical ? "primary" : "outline"}
      size="md"
      onClick={() => setIsVertical((v) => !v)}
      style={{ marginLeft: "auto" }}
    >
      {isVertical ? "Vertical" : "Horizontal"}
    </Button>
  );

  return (
    <EditorPageLayout
      fileName={fileName ?? "DOCX Demo"}
      onBack={onBack}
      headerActions={headerActions}
      editorContainerStyle={{ overflow: "auto", backgroundColor: "#525659" }}
    >
      <ContinuousEditor
        paragraphs={paragraphs}
        numbering={numbering}
        sectPr={isVertical ? { textDirection: "tbRl" } : undefined}
      />
    </EditorPageLayout>
  );
}
