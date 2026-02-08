/**
 * @file Unified landing page for aurochs Office suite demo.
 *
 * Accepts PPTX, PDF, DOCX, XLSX/XLS files and provides demo buttons
 * for each format with equal visual weight.
 */

import { useCallback, useRef, useState, useEffect } from "react";
import {
  importPdfFromFile as importPdfFromFileDefault,
  PdfImportError,
  type PdfImportOptions,
  type PdfImportResult,
} from "@aurochs-converters/pdf-to-pptx/importer/pdf-importer";
import type { PresentationDocument } from "@aurochs-office/pptx/app";
import { UploadIcon, GridIcon, EditIcon, ShieldIcon, GitHubIcon, LogoIcon } from "../components/ui";
import "./LandingPage.css";

// =============================================================================
// Types
// =============================================================================

type FileType = "pptx" | "pdf" | "docx" | "xlsx";

export type FileSelectResult =
  | { readonly type: "pptx"; readonly file: File }
  | { readonly type: "pdf"; readonly document: PresentationDocument; readonly fileName: string }
  | { readonly type: "docx"; readonly file: File }
  | { readonly type: "xlsx"; readonly file: File };

type Props = {
  readonly onFileSelect: (result: FileSelectResult) => void;
  readonly onPptxDemo: () => void;
  readonly onDocxDemo: () => void;
  readonly onXlsxDemo: () => void;
  readonly isLoading?: boolean;
  readonly importPdfFromFileFn?: (file: File, options?: PdfImportOptions) => Promise<PdfImportResult>;
};

// =============================================================================
// Helpers
// =============================================================================

const ACCEPTED_EXTENSIONS = ".pptx,.pdf,.docx,.xlsx,.xls";

function detectFileType(file: File): FileType | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pptx")) {return "pptx";}
  if (name.endsWith(".pdf")) {return "pdf";}
  if (name.endsWith(".docx")) {return "docx";}
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {return "xlsx";}
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
  if (error instanceof Error) {return error.message;}
  return "An unknown error occurred.";
}

function ImportProgressIndicator({ state }: { readonly state: ImportState }) {
  if (state.status !== "loading" || !state.progress) {return null;}

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

// =============================================================================
// Component
// =============================================================================

/**
 * Unified landing page for aurochs demo — treats PPTX, DOCX, and XLSX equally.
 */
export function LandingPage({
  onFileSelect,
  onPptxDemo,
  onDocxDemo,
  onXlsxDemo,
  isLoading,
  importPdfFromFileFn,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [importState, setImportState] = useState<ImportState>({ status: "idle" });

  useEffect(() => {
    setMounted(true);
  }, []);

  const importPdfFromFile = importPdfFromFileFn ?? importPdfFromFileDefault;

  const handleFile = useCallback(
    async (file: File) => {
      const fileType = detectFileType(file);
      if (!fileType) {return;}

      if (fileType === "pptx") {
        setImportState({ status: "idle" });
        onFileSelect({ type: "pptx", file });
        return;
      }

      if (fileType === "docx") {
        setImportState({ status: "idle" });
        onFileSelect({ type: "docx", file });
        return;
      }

      if (fileType === "xlsx") {
        setImportState({ status: "idle" });
        onFileSelect({ type: "xlsx", file });
        return;
      }

      // PDF → convert to presentation
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

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && detectFileType(file)) {void handleFile(file);}
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && detectFileType(file)) {void handleFile(file);}
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

  const renderUploadContent = () => {
    if (importState.status === "loading") {
      return (
        <div className="loading-state">
          <div className="spinner" />
          <ImportProgressIndicator state={importState} />
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="loading-state">
          <div className="spinner" />
          <span>Loading...</span>
        </div>
      );
    }

    return (
      <>
        <div className="landing-upload-icon">
          <UploadIcon size={28} />
        </div>
        <div className="landing-upload-text">
          <span className="landing-upload-primary">Drop a file here or click to browse</span>
          <span className="landing-upload-secondary">PPTX, DOCX, XLSX, XLS, PDF</span>
          {importState.status === "error" && (
            <span className="landing-upload-secondary landing-upload-error">{importState.error}</span>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="landing-page">
      {/* Header */}
      <header className={`landing-header ${mounted ? "mounted" : ""}`}>
        <div className="landing-logo">
          <div className="landing-logo-mark">
            <LogoIcon size={24} />
          </div>
          <span className="landing-logo-text">aurochs</span>
        </div>
        <a
          href="https://github.com/trkbt10/aurochs"
          target="_blank"
          rel="noopener noreferrer"
          className="landing-github"
        >
          <GitHubIcon size={20} />
        </a>
      </header>

      {/* Main */}
      <main className="landing-main">
        <div className={`landing-hero ${mounted ? "mounted" : ""}`}>
          <div className="landing-badge">
            <span className="landing-badge-dot" />
            <span>Open Source Office Suite</span>
          </div>

          <h1 className="landing-title">
            Open Office documents
            <br />
            <span className="landing-title-accent">in the browser</span>
          </h1>

          <p className="landing-desc">
            View and edit PowerPoint, Word, and Excel files client-side.
            <br />
            Your files never leave your device.
          </p>

          {/* Upload Zone */}
          <div
            className={`landing-upload ${isDragging ? "dragging" : ""} ${isLoading ? "loading" : ""}`}
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
              className="landing-upload-input"
            />
            {renderUploadContent()}
          </div>

          {/* Divider */}
          <div className="landing-divider">
            <span>or try a demo</span>
          </div>

          {/* Demo Buttons */}
          <div className="landing-demos">
            <button className="landing-demo-btn" onClick={onPptxDemo} disabled={isLoading}>
              <span className="demo-icon pptx">P</span>
              <span>PPTX Demo</span>
            </button>
            <button className="landing-demo-btn" onClick={onDocxDemo} disabled={isLoading}>
              <span className="demo-icon docx">W</span>
              <span>DOCX Demo</span>
            </button>
            <button className="landing-demo-btn" onClick={onXlsxDemo} disabled={isLoading}>
              <span className="demo-icon xlsx">X</span>
              <span>XLSX Demo</span>
            </button>
          </div>
        </div>

        {/* Features */}
        <div className={`landing-features ${mounted ? "mounted" : ""}`}>
          <div className="landing-feature">
            <div className="landing-feature-icon">
              <GridIcon size={18} />
            </div>
            <span className="landing-feature-title">SVG Rendering</span>
            <span className="landing-feature-desc">Crisp at any resolution</span>
          </div>

          <div className="landing-feature">
            <div className="landing-feature-icon">
              <EditIcon size={18} />
            </div>
            <span className="landing-feature-title">Multi-format Editing</span>
            <span className="landing-feature-desc">PPTX, DOCX, and XLSX</span>
          </div>

          <div className="landing-feature">
            <div className="landing-feature-icon">
              <ShieldIcon size={18} />
            </div>
            <span className="landing-feature-title">100% Private</span>
            <span className="landing-feature-desc">Files never leave your device</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`landing-footer ${mounted ? "mounted" : ""}`}>
        <span className="landing-footer-text">Built with precision. Powered by TypeScript.</span>
      </footer>
    </div>
  );
}
