/**
 * @file App entry for the aurochs demo.
 *
 * Unified landing page with PPTX/DOCX/XLSX format support.
 */

import { useCallback, useMemo, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { usePptx, useDocx, useXlsx } from "./hooks";
import { LandingPage, type FileSelectResult } from "./pages/LandingPage";
import { PptxViewerPage } from "./pages/PptxViewerPage";
import { PptxSlideshowPage } from "./pages/PptxSlideshowPage";
import { PptxEditorPage } from "./pages/PptxEditorPage";
import { DocxEditorPage } from "./pages/DocxEditorPage";
import { XlsxEditorPage } from "./pages/XlsxEditorPage";
import { convertToPresentationDocument, type PresentationDocument } from "@aurochs-office/pptx/app";
import "./App.css";

// Demo PPTX URL (in the public folder)
const DEMO_PPTX_URL = import.meta.env.BASE_URL + "demo.pptx";

/**
 * Top-level application component.
 */
export function App() {
  const navigate = useNavigate();
  const [importedDocument, setImportedDocument] = useState<PresentationDocument | null>(null);
  const [importedFileName, setImportedFileName] = useState<string | null>(null);

  const pptx = usePptx();
  const docx = useDocx();
  const xlsx = useXlsx();

  // ---- Event Handlers ----

  const handleFileSelect = useCallback(
    (result: FileSelectResult) => {
      switch (result.type) {
        case "pptx":
          setImportedDocument(null);
          setImportedFileName(null);
          docx.reset();
          xlsx.reset();
          pptx.loadFromFile(result.file);
          navigate("/pptx/viewer");
          break;
        case "pdf":
          setImportedDocument(result.document);
          setImportedFileName(result.fileName);
          docx.reset();
          xlsx.reset();
          pptx.reset();
          navigate("/pptx/editor");
          break;
        case "docx":
          pptx.reset();
          xlsx.reset();
          setImportedDocument(null);
          setImportedFileName(null);
          docx.loadFromFile(result.file);
          navigate("/docx/editor");
          break;
        case "xlsx":
          pptx.reset();
          docx.reset();
          setImportedDocument(null);
          setImportedFileName(null);
          xlsx.loadFromFile(result.file);
          navigate("/xlsx/editor");
          break;
      }
    },
    [pptx, docx, xlsx, navigate],
  );

  const handlePptxDemo = useCallback(() => {
    setImportedDocument(null);
    setImportedFileName(null);
    docx.reset();
    xlsx.reset();
    pptx.loadFromUrl(DEMO_PPTX_URL, "demo.pptx");
    navigate("/pptx/viewer");
  }, [pptx, docx, xlsx, navigate]);

  const handleDocxDemo = useCallback(() => {
    pptx.reset();
    xlsx.reset();
    setImportedDocument(null);
    setImportedFileName(null);
    docx.reset();
    navigate("/docx/editor");
  }, [pptx, docx, xlsx, navigate]);

  const handleXlsxDemo = useCallback(() => {
    pptx.reset();
    docx.reset();
    setImportedDocument(null);
    setImportedFileName(null);
    xlsx.reset();
    navigate("/xlsx/editor");
  }, [pptx, docx, xlsx, navigate]);

  const handleBack = useCallback(() => {
    setImportedDocument(null);
    setImportedFileName(null);
    pptx.reset();
    docx.reset();
    xlsx.reset();
    navigate("/");
  }, [pptx, docx, xlsx, navigate]);

  const handleStartSlideshow = useCallback(
    (slideNumber: number) => {
      navigate(`/pptx/slideshow/${slideNumber}`);
    },
    [navigate],
  );

  const handleExitSlideshow = useCallback(() => {
    navigate("/pptx/viewer");
  }, [navigate]);

  const handleStartEditor = useCallback(() => {
    navigate("/pptx/editor");
  }, [navigate]);

  const handleExitEditor = useCallback(() => {
    if (pptx.presentation) {
      navigate("/pptx/viewer");
      return;
    }
    handleBack();
  }, [handleBack, navigate, pptx.presentation]);

  // Convert presentation to editor document
  const editorDocument = useMemo(() => {
    if (!pptx.presentation) return null;
    try {
      return convertToPresentationDocument(pptx.presentation);
    } catch (e) {
      console.error("Failed to convert presentation:", e);
      return null;
    }
  }, [pptx.presentation]);

  const isLoading = pptx.status === "loading" || docx.status === "loading" || xlsx.status === "loading";

  // ---- Error state ----

  if (pptx.status === "error") {
    return (
      <div className="error-page">
        <div className="error-card">
          <div className="error-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="error-title">Failed to load presentation</h2>
          <p className="error-message">{pptx.error}</p>
          <button className="error-button" onClick={handleBack}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ---- Route Components ----

  const LandingRoute = () => (
    <LandingPage
      onFileSelect={handleFileSelect}
      onPptxDemo={handlePptxDemo}
      onDocxDemo={handleDocxDemo}
      onXlsxDemo={handleXlsxDemo}
      isLoading={isLoading}
    />
  );

  const PptxViewerRoute = () => {
    if (!pptx.presentation) {
      if (pptx.status === "loading") {
        return (
          <LandingPage
            onFileSelect={handleFileSelect}
            onPptxDemo={handlePptxDemo}
            onDocxDemo={handleDocxDemo}
            onXlsxDemo={handleXlsxDemo}
            isLoading
          />
        );
      }
      return <Navigate to="/" replace />;
    }

    return (
      <PptxViewerPage
        presentation={pptx.presentation}
        fileName={pptx.fileName || "presentation.pptx"}
        onBack={handleBack}
        onStartSlideshow={handleStartSlideshow}
        onStartEditor={handleStartEditor}
      />
    );
  };

  const PptxSlideshowRoute = () => {
    const { slideNumber } = useParams<{ slideNumber: string }>();
    if (!pptx.presentation) return <Navigate to="/" replace />;
    const startSlide = Math.max(1, Number.parseInt(slideNumber ?? "1", 10) || 1);
    return <PptxSlideshowPage presentation={pptx.presentation} startSlide={startSlide} onExit={handleExitSlideshow} />;
  };

  const PptxEditorRoute = () => {
    const activeDocument = importedDocument ?? editorDocument;
    if (!activeDocument) {
      return (
        <div className="error-page">
          <div className="error-card">
            <div className="error-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="error-title">Failed to open editor</h2>
            <p className="error-message">Could not open document for editing. Check the console for details.</p>
            <button className="error-button" onClick={handleExitEditor}>
              Back
            </button>
          </div>
        </div>
      );
    }

    const activeFileName = importedFileName ?? pptx.fileName ?? "presentation";
    const backLabel = importedDocument ? "Back to Home" : "Back to Viewer";

    return (
      <PptxEditorPage document={activeDocument} fileName={activeFileName} onBack={handleExitEditor} backLabel={backLabel} />
    );
  };

  const DocxEditorRoute = () => (
    <DocxEditorPage document={docx.document} fileName={docx.fileName} onBack={handleBack} />
  );

  const XlsxEditorRoute = () => (
    <XlsxEditorPage workbook={xlsx.workbook} fileName={xlsx.fileName} onBack={handleBack} />
  );

  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route path="/pptx/viewer" element={<PptxViewerRoute />} />
      <Route path="/pptx/slideshow/:slideNumber" element={<PptxSlideshowRoute />} />
      <Route path="/pptx/editor" element={<PptxEditorRoute />} />
      <Route path="/docx/editor" element={<DocxEditorRoute />} />
      <Route path="/xlsx/editor" element={<XlsxEditorRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
