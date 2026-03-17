/**
 * @file PDF viewer page.
 *
 * PDF viewer with file upload support.
 */

import { useCallback, useRef, useState } from "react";
import { PdfViewer } from "@aurochs-ui/pdf-editor";
import { UploadIcon } from "@aurochs-ui/ui-components/icons";
import { EditorPageLayout } from "../components/EditorPageLayout";

type Props = {
  readonly data: Uint8Array | null;
  readonly fileName: string | null;
  readonly onBack: () => void;
  readonly onFileSelect?: (file: File) => void;
  readonly onStartEditor?: () => void;
};

/** PDF viewer page. */
export function PdfViewerPage({ data, fileName, onBack, onFileSelect, onStartEditor }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (file.name.toLowerCase().endsWith(".pdf")) {
        onFileSelect?.(file);
      }
    },
    [onFileSelect],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <EditorPageLayout
      fileName={fileName ?? "PDF Viewer"}
      onBack={onBack}
      editorContainerStyle={{ display: "flex", flexDirection: "column" }}
    >
      {/* Compact upload bar when no file is loaded */}
      {!data && onFileSelect && (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "10px 16px",
            backgroundColor: isDragging ? "rgba(68, 114, 196, 0.08)" : "#f8f9fa",
            borderBottom: "1px solid #e5e5e5",
            cursor: "pointer",
            transition: "background-color 0.15s",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <UploadIcon size={16} style={{ color: "#666" }} />
          <span style={{ fontSize: 13, color: "#666" }}>
            Drop a PDF file here or click to upload
          </span>
        </div>
      )}

      {/* Edit button */}
      {data && onStartEditor && (
        <div style={{ padding: "8px 16px", borderBottom: "1px solid #e5e5e5", display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onStartEditor}
            style={{
              padding: "6px 16px",
              fontSize: 13,
              backgroundColor: "#4472C4",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Edit
          </button>
        </div>
      )}

      {/* PDF Viewer */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <PdfViewer data={data} />
      </div>
    </EditorPageLayout>
  );
}
