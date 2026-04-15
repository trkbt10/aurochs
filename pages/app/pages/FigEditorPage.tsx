/**
 * @file Fig editor page.
 *
 * Wraps FigEditor with EditorPageLayout for header and back navigation.
 * Supports opening .fig files via the header "Open File" button.
 */

import { useCallback, useRef } from "react";
import type { FigDesignDocument } from "@aurochs/fig/domain";
import { FigEditor } from "@aurochs-ui/fig-editor";
import { Button, UploadIcon } from "@aurochs-ui/ui-components";
import { EditorPageLayout } from "../components/EditorPageLayout";

type Props = {
  readonly document: FigDesignDocument;
  readonly fileName: string;
  readonly onBack: () => void;
  readonly onFileSelect?: (file: File) => void;
};

/** Fig design editor page with header and FigEditor. */
export function FigEditorPage({ document, fileName, onBack, onFileSelect }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.name.toLowerCase().endsWith(".fig")) {
        onFileSelect?.(file);
      }
      e.target.value = "";
    },
    [onFileSelect],
  );

  const headerActions = onFileSelect ? (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".fig"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <Button variant="outline" size="md" onClick={handleOpenClick} style={{ marginLeft: "auto" }}>
        <UploadIcon size={14} />
        Open File
      </Button>
    </>
  ) : undefined;

  return (
    <EditorPageLayout fileName={fileName} onBack={onBack} headerActions={headerActions}>
      <FigEditor initialDocument={document} />
    </EditorPageLayout>
  );
}
