/**
 * @file PDF editor page.
 *
 * Wraps PdfEditor with a header bar and back navigation.
 */

import type { PdfDocument } from "@aurochs/pdf";
import { PdfEditor } from "@aurochs-ui/pdf-editor/editor";
import { EditorPageLayout } from "../components/EditorPageLayout";

type Props = {
  readonly document: PdfDocument;
  readonly fileName: string;
  readonly onBack: () => void;
};

/** PDF editor page with header and PdfEditor. */
export function PdfEditorPage({ document, fileName, onBack }: Props) {
  return (
    <EditorPageLayout fileName={fileName} onBack={onBack}>
      <PdfEditor document={document} />
    </EditorPageLayout>
  );
}
