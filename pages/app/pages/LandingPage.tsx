/**
 * @file Unified landing page for aurochs Office suite demo.
 *
 * Accepts PPTX, PDF, DOCX, XLSX/XLS files and provides demo buttons
 * for each format with equal visual weight.
 */

import { useCallback, useRef, useState, useEffect } from "react";
import { UploadIcon, GridIcon, EditIcon, ShieldIcon, PlayIcon } from "@aurochs-ui/ui-components/icons";
import { GitHubIcon, LogoIcon } from "../components/ui";
import "./LandingPage.css";

// =============================================================================
// Types
// =============================================================================

type FileType = "pptx" | "pdf" | "docx" | "xlsx";

export type FileSelectResult =
  | { readonly type: "pptx"; readonly file: File }
  | { readonly type: "pdf"; readonly file: File }
  | { readonly type: "docx"; readonly file: File }
  | { readonly type: "xlsx"; readonly file: File };

type Props = {
  readonly onFileSelect: (result: FileSelectResult) => void;
  readonly onPptxDemo: () => void;
  readonly onPptxEditorDemo: () => void;
  readonly onDocxDemo: () => void;
  readonly onDocxViewerDemo: () => void;
  readonly onXlsxDemo: () => void;
  readonly onXlsxViewerDemo: () => void;
  readonly onPdfViewerDemo: () => void;
  readonly onPdfEditorDemo: () => void;
  readonly onPotxEditorDemo: () => void;
  readonly onPptxSuiteDemo: () => void;
  readonly isLoading?: boolean;
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
  onPptxEditorDemo,
  onDocxDemo,
  onDocxViewerDemo,
  onXlsxDemo,
  onXlsxViewerDemo,
  onPdfViewerDemo,
  onPdfEditorDemo,
  onPotxEditorDemo,
  onPptxSuiteDemo,
  isLoading,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [importState, setImportState] = useState<ImportState>({ status: "idle" });

  useEffect(() => {
    setMounted(true);
  }, []);

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

      // PDF → pass file directly
      setImportState({ status: "idle" });
      onFileSelect({ type: "pdf", file });
    },
    [onFileSelect],
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

          {/* Demo Cards */}
          <div className="landing-demo-cards">
            {/* PPTX Card */}
            <div className="landing-demo-card">
              <div className="demo-card-header">
                <span className="demo-card-icon pptx">P</span>
                <div className="demo-card-info">
                  <span className="demo-card-title">PowerPoint</span>
                  <span className="demo-card-subtitle">Presentations</span>
                </div>
              </div>
              <div className="demo-card-actions">
                <button className="demo-card-btn" onClick={onPptxDemo} disabled={isLoading}>
                  <PlayIcon size={14} />
                  <span>View</span>
                </button>
                <button className="demo-card-btn" onClick={onPptxEditorDemo} disabled={isLoading}>
                  <EditIcon size={14} />
                  <span>Edit</span>
                </button>
              </div>
            </div>

            {/* DOCX Card */}
            <div className="landing-demo-card">
              <div className="demo-card-header">
                <span className="demo-card-icon docx">W</span>
                <div className="demo-card-info">
                  <span className="demo-card-title">Word</span>
                  <span className="demo-card-subtitle">Documents</span>
                </div>
              </div>
              <div className="demo-card-actions">
                <button className="demo-card-btn" onClick={onDocxViewerDemo} disabled={isLoading}>
                  <PlayIcon size={14} />
                  <span>View</span>
                </button>
                <button className="demo-card-btn" onClick={onDocxDemo} disabled={isLoading}>
                  <EditIcon size={14} />
                  <span>Edit</span>
                </button>
              </div>
            </div>

            {/* XLSX Card */}
            <div className="landing-demo-card">
              <div className="demo-card-header">
                <span className="demo-card-icon xlsx">X</span>
                <div className="demo-card-info">
                  <span className="demo-card-title">Excel</span>
                  <span className="demo-card-subtitle">Spreadsheets</span>
                </div>
              </div>
              <div className="demo-card-actions">
                <button className="demo-card-btn" onClick={onXlsxViewerDemo} disabled={isLoading}>
                  <PlayIcon size={14} />
                  <span>View</span>
                </button>
                <button className="demo-card-btn" onClick={onXlsxDemo} disabled={isLoading}>
                  <EditIcon size={14} />
                  <span>Edit</span>
                </button>
              </div>
            </div>

            {/* PDF Card */}
            <div className="landing-demo-card">
              <div className="demo-card-header">
                <span className="demo-card-icon pdf">A</span>
                <div className="demo-card-info">
                  <span className="demo-card-title">PDF</span>
                  <span className="demo-card-subtitle">Documents</span>
                </div>
              </div>
              <div className="demo-card-actions">
                <button className="demo-card-btn" onClick={onPdfViewerDemo} disabled={isLoading}>
                  <PlayIcon size={14} />
                  <span>View</span>
                </button>
                <button className="demo-card-btn" onClick={onPdfEditorDemo} disabled={isLoading}>
                  <EditIcon size={14} />
                  <span>Edit</span>
                </button>
              </div>
            </div>

            {/* POTX Theme Editor */}
            <div className={`demo-card ${mounted ? "mounted" : ""}`} style={{ animationDelay: "0.5s" }}>
              <div className="demo-card-header" style={{ background: "linear-gradient(135deg, #9b59b6, #8e44ad)" }}>
                <div className="demo-card-info">
                  <span className="demo-card-title">POTX</span>
                  <span className="demo-card-subtitle">Theme</span>
                </div>
              </div>
              <div className="demo-card-actions">
                <button className="demo-card-btn" onClick={onPotxEditorDemo} disabled={isLoading}>
                  <EditIcon size={14} />
                  <span>Theme Editor</span>
                </button>
                <button className="demo-card-btn" onClick={onPptxSuiteDemo} disabled={isLoading}>
                  <GridIcon size={14} />
                  <span>Suite</span>
                </button>
              </div>
            </div>
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
