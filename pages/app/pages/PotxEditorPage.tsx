/**
 * @file POTX theme editor page.
 *
 * Loads demo.pptx as the base presentation, extracts theme and layout data,
 * and renders PotxEditor with the full set of layouts for preview.
 */

import { useEffect, useState } from "react";
import { ThemeEditorProvider, PotxEditor } from "@aurochs-ui/potx-editor";
import { loadPptxFromUrl, convertToPresentationDocument, buildSlideLayoutOptions } from "@aurochs-office/pptx/app";
import type { PresentationDocument } from "@aurochs-office/pptx/app";
import { EditorPageLayout } from "../components/EditorPageLayout";

type Props = {
  readonly onBack: () => void;
};

const DEMO_PPTX_URL = import.meta.env.BASE_URL + "demo.pptx";

export function PotxEditorPage({ onBack }: Props) {
  const [doc, setDoc] = useState<PresentationDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPptxFromUrl(DEMO_PPTX_URL)
      .then((loaded) => {
        setDoc(convertToPresentationDocument(loaded));
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load demo.pptx");
      });
  }, []);

  if (error) {
    return (
      <EditorPageLayout fileName="Theme Editor" onBack={onBack}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#999" }}>
          {error}
        </div>
      </EditorPageLayout>
    );
  }

  if (!doc) {
    return (
      <EditorPageLayout fileName="Theme Editor" onBack={onBack}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#999" }}>
          Loading...
        </div>
      </EditorPageLayout>
    );
  }

  const layoutOptions = buildSlideLayoutOptions(doc.presentationFile!);

  return (
    <EditorPageLayout fileName="Theme Editor" onBack={onBack}>
      <ThemeEditorProvider
        initProps={{
          colorScheme: doc.colorContext.colorScheme,
          fontScheme: doc.fontScheme,
          slideSize: { width: doc.slideWidth, height: doc.slideHeight },
          layoutOptions,
          presentationFile: doc.presentationFile,
        }}
      >
        <PotxEditor presentationFile={doc.presentationFile} slideSize={{ width: doc.slideWidth, height: doc.slideHeight }} />
      </ThemeEditorProvider>
    </EditorPageLayout>
  );
}
