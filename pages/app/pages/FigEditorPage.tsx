/**
 * @file Fig editor page.
 *
 * Wraps FigEditor with EditorPageLayout for header and back navigation.
 */

import type { FigDesignDocument } from "@aurochs-builder/fig/types";
import { FigEditor } from "@aurochs-ui/fig-editor";
import { EditorPageLayout } from "../components/EditorPageLayout";

type Props = {
  readonly document: FigDesignDocument;
  readonly fileName: string;
  readonly onBack: () => void;
};

/** Fig design editor page with header and FigEditor. */
export function FigEditorPage({ document, fileName, onBack }: Props) {
  return (
    <EditorPageLayout fileName={fileName} onBack={onBack}>
      <FigEditor initialDocument={document} />
    </EditorPageLayout>
  );
}
