/**
 * @file PPTX editor page.
 *
 * Wraps PresentationEditor with a header bar and back navigation.
 */

import { PresentationEditor } from "@aurochs-ui/pptx-editor";
import type { PresentationDocument } from "@aurochs-office/pptx/app";
import { EditorPageLayout } from "../components/EditorPageLayout";

type Props = {
  readonly document: PresentationDocument;
  readonly fileName: string;
  readonly onBack: () => void;
  readonly backLabel?: string;
};

/** PPTX editor page with header and PresentationEditor. */
export function PptxEditorPage({ document, fileName, onBack, backLabel }: Props) {
  return (
    <EditorPageLayout fileName={fileName} onBack={onBack} backLabel={backLabel}>
      <PresentationEditor initialDocument={document} showPropertyPanel showLayerPanel showToolbar />
    </EditorPageLayout>
  );
}
