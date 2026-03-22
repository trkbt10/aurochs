/**
 * @file Presentation Suite page.
 *
 * Combined slide + theme editor using presentation-suite.
 * Theme editor uses the same PresentationDocument as the slide editor
 * for consistent theme/layout data.
 */

import { useMemo } from "react";
import { PresentationEditor } from "@aurochs-ui/pptx-editor";
import { ThemeEditorProvider, PotxEditor } from "@aurochs-ui/potx-editor";
import { PresentationSuite } from "@aurochs-ui/presentation-suite";
import type { PresentationDocument } from "@aurochs-office/pptx/app";
import { buildSlideLayoutOptions } from "@aurochs-office/pptx/app";
import { EditorPageLayout } from "../components/EditorPageLayout";

type Props = {
  readonly document: PresentationDocument;
  readonly fileName: string;
  readonly onBack: () => void;
  readonly backLabel?: string;
};











/** Presentation suite page with editor and viewer modes. */
export function PresentationSuitePage({ document, fileName, onBack, backLabel }: Props) {
  const layoutOptions = useMemo(
    () => document.presentationFile ? buildSlideLayoutOptions(document.presentationFile) : [],
    [document.presentationFile],
  );

  return (
    <EditorPageLayout fileName={fileName} onBack={onBack} backLabel={backLabel}>
      <PresentationSuite
        slideEditor={
          <PresentationEditor initialDocument={document} showPropertyPanel showLayerPanel showToolbar />
        }
        themeEditor={
          <ThemeEditorProvider
            initProps={{
              colorScheme: document.colorContext.colorScheme,
              fontScheme: document.fontScheme,
              slideSize: { width: document.slideWidth, height: document.slideHeight },
              layoutOptions,
              presentationFile: document.presentationFile,
            }}
          >
            <PotxEditor
              presentationFile={document.presentationFile}
              slideSize={{ width: document.slideWidth, height: document.slideHeight }}
            />
          </ThemeEditorProvider>
        }
      />
    </EditorPageLayout>
  );
}
