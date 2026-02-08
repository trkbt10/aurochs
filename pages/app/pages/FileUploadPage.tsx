/**
 * @file Upload screen with file input + demo launch.
 */

import { useCallback, useRef, useState, useEffect } from "react";
import {
  importPdfFromFile as importPdfFromFileDefault,
  PdfImportError,
  type PdfImportOptions,
  type PdfImportResult,
} from "@aurochs-converters/pdf-to-pptx/importer/pdf-importer";
import type { PresentationDocument } from "@aurochs-office/pptx/app";
import { UploadIcon, ArrowRightIcon, GridIcon, PlayIcon, ShieldIcon, GitHubIcon, LogoIcon } from "../components/ui";
import "./FileUploadPage.css";

type FileType = "pptx" | "pdf";

export type FileSelectResult =
  | { readonly type: "pptx"; readonly file: File }
  | { readonly type: "pdf"; readonly document: PresentationDocument; readonly fileName: string };

type Props = {
  readonly onFileSelect: (result: FileSelectResult) => void;
  readonly onDemoLoad: () => void;
  readonly isLoading?: boolean;
  readonly importPdfFromFileFn?: (file: File, options?: PdfImportOptions) => Promise<PdfImportResult>;
  readonly onEditorTest?: () => void;
  readonly onTextEditorTest?: () => void;
  readonly onGlyphTest?: () => void;
  readonly onDocxEditorTest?: () => void;
  readonly onXlsxEditorTest?: () => void;
};

const ACCEPTED_EXTENSIONS = ".pptx,.pdf";

function detectFileType(file: File): FileType | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pptx")) {
    return "pptx";
  }
  if (name.endsWith(".pdf")) {
    return "pdf";
  }
  return null;
}

type ImportProgress = {
  readonly currentPage: number;
  readonly totalPages: number;
};

type ImportState =
  | { readonly status: "idle" }
  | { readonly status: "loading"; readonly progress?: ImportProgress }
  | { readonly status: "error"; readonly error: string };

function getErrorMessage(error: unknown): string {
  if (error instanceof PdfImportError) {
    switch (error.code) {
      case "INVALID_PDF":
        return "The file is not a valid PDF.";
      case "ENCRYPTED_PDF":
        return "The PDF is encrypted and cannot be imported.";
      case "PARSE_ERROR":
        return "Failed to parse the PDF file.";
      case "CONVERSION_ERROR":
        return "Failed to convert PDF to presentation.";
      default:
        return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unknown error occurred.";
}

function ImportProgress({ state }: { readonly state: ImportState }) {
  if (state.status !== "loading" || !state.progress) {
    return null;
  }

  return (
    <div className="import-progress">
      <p>Importing PDF...</p>
      <p>
        Page {state.progress.currentPage} of {state.progress.totalPages}
      </p>
      <progress value={state.progress.currentPage} max={state.progress.totalPages} />
    </div>
  );
}

/**
 * File upload landing screen for the web PPTX viewer.
 */
export function FileUploadPage({
  onFileSelect,
  onDemoLoad,
  isLoading,
  importPdfFromFileFn,
  onEditorTest,
  onTextEditorTest,
  onGlyphTest,
  onDocxEditorTest,
  onXlsxEditorTest,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [importState, setImportState] = useState<ImportState>({ status: "idle" });

  useEffect(() => {
    setMounted(true);
  }, []);

  const importPdfFromFile = importPdfFromFileFn ?? importPdfFromFileDefault;

  const validateFile = useCallback((file: File): boolean => {
    return detectFileType(file) !== null;
  }, []);

  const onPdfSelect = useCallback(
    async (file: File) => {
      setImportState({ status: "loading" });

      try {
        const result = await importPdfFromFile(file, {
          setWhiteBackground: true,
          onProgress: (progress) => {
            setImportState({ status: "loading", progress });
          },
        });

        onFileSelect({ type: "pdf", document: result.document, fileName: file.name });
        setImportState({ status: "idle" });
      } catch (error) {
        setImportState({ status: "error", error: getErrorMessage(error) });
      }
    },
    [importPdfFromFile, onFileSelect],
  );

  const handleFileSelect = useCallback(
    async (file: File) => {
      const fileType = detectFileType(file);
      if (fileType === "pptx") {
        setImportState({ status: "idle" });
        onFileSelect({ type: "pptx", file });
        return;
      }
      if (fileType === "pdf") {
        await onPdfSelect(file);
      }
    },
    [onFileSelect, onPdfSelect],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && validateFile(file)) {
        void handleFileSelect(file);
      }
    },
    [handleFileSelect, validateFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && validateFile(file)) {
        void handleFileSelect(file);
      }
    },
    [handleFileSelect, validateFile],
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

  const renderUploadContent = () => {
    if (importState.status === "loading") {
      return (
        <div className="loading-state">
          <div className="spinner" />
          <ImportProgress state={importState} />
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="loading-state">
          <div className="spinner" />
          <span>Loading presentation...</span>
        </div>
      );
    }

    return (
      <>
        <div className="upload-icon">
          <UploadIcon size={32} />
        </div>
        <div className="upload-text">
          <span className="upload-primary">Drop a file here</span>
          <span className="upload-secondary">Supported formats: PPTX, PDF</span>
          {importState.status === "error" && <span className="upload-secondary upload-error">{importState.error}</span>}
          <span className="upload-secondary">or click to browse</span>
        </div>
      </>
    );
  };

  return (
    <div className="upload-page">
      {/* Ambient background effects */}
      <div className="ambient-bg">
        <div className="gradient-orb gradient-orb-1" />
        <div className="gradient-orb gradient-orb-2" />
        <div className="gradient-orb gradient-orb-3" />
        <div className="grid-overlay" />
      </div>

      {/* Header */}
      <header className={`upload-header ${mounted ? "mounted" : ""}`}>
        <div className="logo">
          <div className="logo-mark">
            <LogoIcon size={24} />
          </div>
          <span className="logo-text">aurochs</span>
        </div>
        <a href="https://github.com/trkbt10/aurochs" target="_blank" rel="noopener noreferrer" className="github-link">
          <GitHubIcon size={20} />
        </a>
      </header>

      {/* Hero Section */}
      <main className="upload-main">
        <div className={`hero-content ${mounted ? "mounted" : ""}`}>
          <div className="badge">
            <span className="badge-dot" />
            <span>Open Source PPTX Viewer</span>
          </div>

          <h1 className="hero-title">
            View presentations
            <br />
            <span className="gradient-text">in the browser</span>
          </h1>

          <p className="hero-description">
            A powerful, client-side PowerPoint viewer. No uploads to servers.
            <br />
            Your files stay on your device.
          </p>

          {/* Upload Zone */}
          <div
            className={`upload-zone ${isDragging ? "dragging" : ""} ${isLoading ? "loading" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              onChange={handleFileChange}
              className="file-input"
            />

            <div className="upload-zone-border" />

            {renderUploadContent()}
          </div>

          {/* Divider */}
          <div className="divider">
            <span>or try with</span>
          </div>

          {/* Demo Button */}
          <button className="demo-button" onClick={onDemoLoad} disabled={isLoading}>
            <span>Load Demo Presentation</span>
            <ArrowRightIcon size={16} />
          </button>
        </div>

        {/* Features */}
        <div className={`features ${mounted ? "mounted" : ""}`}>
          <div className="feature">
            <div className="feature-icon">
              <GridIcon size={20} />
            </div>
            <div className="feature-content">
              <span className="feature-title">SVG Rendering</span>
              <span className="feature-desc">Crisp at any resolution</span>
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">
              <PlayIcon size={20} />
            </div>
            <div className="feature-content">
              <span className="feature-title">Presentation Mode</span>
              <span className="feature-desc">Fullscreen slideshow</span>
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">
              <ShieldIcon size={20} />
            </div>
            <div className="feature-content">
              <span className="feature-title">100% Private</span>
              <span className="feature-desc">Files never leave your device</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`upload-footer ${mounted ? "mounted" : ""}`}>
        <span className="footer-text">Built with precision. Powered by TypeScript.</span>
        {onEditorTest && (
          <button
            className="editor-test-link"
            onClick={onEditorTest}
            style={{
              marginLeft: "16px",
              padding: "4px 8px",
              fontSize: "12px",
              color: "var(--text-tertiary)",
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Editor Test
          </button>
        )}
        {onTextEditorTest && (
          <button
            className="text-editor-test-link"
            onClick={onTextEditorTest}
            style={{
              marginLeft: "8px",
              padding: "4px 8px",
              fontSize: "12px",
              color: "var(--text-tertiary)",
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Text Editor Test
          </button>
        )}
        {onGlyphTest && (
          <button
            className="glyph-test-link"
            onClick={onGlyphTest}
            style={{
              marginLeft: "8px",
              padding: "4px 8px",
              fontSize: "12px",
              color: "var(--text-tertiary)",
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Glyph Test
          </button>
        )}
        {onDocxEditorTest && (
          <button
            className="docx-editor-test-link"
            onClick={onDocxEditorTest}
            style={{
              marginLeft: "8px",
              padding: "4px 8px",
              fontSize: "12px",
              color: "var(--text-tertiary)",
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            DOCX Editor Test
          </button>
        )}
        {onXlsxEditorTest && (
          <button
            className="xlsx-editor-test-link"
            onClick={onXlsxEditorTest}
            style={{
              marginLeft: "8px",
              padding: "4px 8px",
              fontSize: "12px",
              color: "var(--text-tertiary)",
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            XLSX Editor
          </button>
        )}
      </footer>
    </div>
  );
}
