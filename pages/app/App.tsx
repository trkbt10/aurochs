/**
 * @file App entry for the pages demo.
 */

import { useCallback, useMemo, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { usePptx } from "./hooks/usePptx";
import { FileUploadPage, type FileSelectResult } from "./pages/FileUploadPage";
import { SlideViewer } from "./pages/SlideViewer";
import { SlideshowPage } from "./pages/SlideshowPage";
import { EditorTestPage } from "./pages/EditorTestPage";
import { DrawingMLTestPage } from "./pages/DrawingMLTestPage";
import { GlyphTestPage } from "./pages/GlyphTestPage";
import { TextEditorTestPage } from "./pages/TextEditorTestPage";
import { DocxEditorTestPage } from "./pages/DocxEditorTestPage";
import { XlsxEditorLayout } from "./pages/xlsx-editor/XlsxEditorLayout";
import { XlsxEditorIndexPage } from "./pages/xlsx-editor/XlsxEditorIndexPage";
import { XlsxWorkbookPage } from "./pages/xlsx-editor/XlsxWorkbookPage";
import { XlsxFormulaCatalogLayout } from "./pages/xlsx-editor/formula/XlsxFormulaCatalogLayout";
import { XlsxFormulaCatalogIndexPage } from "./pages/xlsx-editor/formula/XlsxFormulaCatalogIndexPage";
import { XlsxFormulaFunctionPage } from "./pages/xlsx-editor/formula/XlsxFormulaFunctionPage";
import { PresentationEditor } from "@lib/pptx-editor";
import { convertToPresentationDocument, type PresentationDocument } from "@lib/pptx/app";
import "./App.css";

// Demo PPTX URL (will be in the public folder)
const DEMO_PPTX_URL = import.meta.env.BASE_URL + "demo.pptx";

/**
 * Top-level application component for the demo pages build.
 */
export function App() {
  const navigate = useNavigate();
  const [importedDocument, setImportedDocument] = useState<PresentationDocument | null>(null);
  const [importedFileName, setImportedFileName] = useState<string | null>(null);

  const {
    status,
    presentation,
    fileName,
    error,
    loadFromFile,
    loadFromUrl,
    reset,
  } = usePptx();

  const handleFileSelect = useCallback(
    (result: FileSelectResult) => {
      if (result.type === "pptx") {
        setImportedDocument(null);
        setImportedFileName(null);
        loadFromFile(result.file);
        navigate("/viewer");
        return;
      }

      setImportedDocument(result.document);
      setImportedFileName(result.fileName);
      reset();
      navigate("/editor");
    },
    [loadFromFile, navigate, reset]
  );

  const handleDemoLoad = useCallback(() => {
    setImportedDocument(null);
    setImportedFileName(null);
    loadFromUrl(DEMO_PPTX_URL, "demo.pptx");
    navigate("/viewer");
  }, [loadFromUrl, navigate]);

  const handleBack = useCallback(() => {
    setImportedDocument(null);
    setImportedFileName(null);
    reset();
    navigate("/");
  }, [reset, navigate]);

  const handleGoHome = useCallback(() => {
    setImportedDocument(null);
    setImportedFileName(null);
    reset();
    navigate("/");
  }, [navigate, reset]);

  const handleStartSlideshow = useCallback((slideNumber: number) => {
    navigate(`/slideshow/${slideNumber}`);
  }, [navigate]);

  const handleExitSlideshow = useCallback(() => {
    navigate("/viewer");
  }, [navigate]);

  const handleEditorTest = useCallback(() => {
    navigate("/editor-test");
  }, [navigate]);

  const handleDrawingMLTest = useCallback(() => {
    navigate("/drawing-ml");
  }, [navigate]);

  const handleGlyphTest = useCallback(() => {
    navigate("/glyph-test");
  }, [navigate]);

  const handleTextEditorTest = useCallback(() => {
    navigate("/text-editor-test");
  }, [navigate]);

  const handleDocxEditorTest = useCallback(() => {
    navigate("/docx-editor-test");
  }, [navigate]);

  const handleXlsxEditorTest = useCallback(() => {
    navigate("/xlsx-editor");
  }, [navigate]);

  const handleStartEditor = useCallback(() => {
    navigate("/editor");
  }, [navigate]);

  const handleExitEditor = useCallback(() => {
    if (presentation) {
      navigate("/viewer");
      return;
    }
    handleGoHome();
  }, [handleGoHome, navigate, presentation]);

  // Convert presentation to editor document
  const editorDocument = useMemo(() => {
    if (!presentation) {
      return null;
    }
    try {
      return convertToPresentationDocument(presentation);
    } catch (e) {
      console.error("Failed to convert presentation:", e);
      return null;
    }
  }, [presentation]);

  if (status === "error") {
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
          <p className="error-message">{error}</p>
          <button className="error-button" onClick={handleBack}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const renderUploadPage = () => (
    <FileUploadPage
      onFileSelect={handleFileSelect}
      onDemoLoad={handleDemoLoad}
      isLoading={status === "loading"}
      onEditorTest={handleEditorTest}
      onDrawingMLTest={handleDrawingMLTest}
      onGlyphTest={handleGlyphTest}
      onTextEditorTest={handleTextEditorTest}
      onDocxEditorTest={handleDocxEditorTest}
      onXlsxEditorTest={handleXlsxEditorTest}
    />
  );

  const UploadRoute = () => renderUploadPage();

  const ViewerRoute = () => {
    if (!presentation) {
      if (status === "loading") {
        return renderUploadPage();
      }
      return <Navigate to="/" replace />;
    }

    return (
      <SlideViewer
        presentation={presentation}
        fileName={fileName || "presentation.pptx"}
        onBack={handleBack}
        onStartSlideshow={handleStartSlideshow}
        onStartEditor={handleStartEditor}
      />
    );
  };

  const SlideshowRoute = () => {
    const { slideNumber } = useParams<{ slideNumber: string }>();

    if (!presentation) {
      return <Navigate to="/" replace />;
    }

    const startSlide = Math.max(1, Number.parseInt(slideNumber ?? "1", 10) || 1);

    return (
      <SlideshowPage
        presentation={presentation}
        startSlide={startSlide}
        onExit={handleExitSlideshow}
      />
    );
  };

  const EditorRoute = () => {
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
            <p className="error-message">
              Could not open document for editing. Check the console for details.
            </p>
            <button className="error-button" onClick={handleExitEditor}>
              Back
            </button>
          </div>
        </div>
      );
    }

    const activeFileName = importedFileName ?? fileName ?? "presentation";
    const backLabel = importedDocument ? "Back to Home" : "Back to Viewer";

    return (
      <div className="editor-page">
        <header className="editor-header">
          <button className="back-button" onClick={handleExitEditor}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>{backLabel}</span>
          </button>
          <span className="editor-title">{activeFileName}</span>
        </header>
        <div className="editor-content">
          <PresentationEditor
            initialDocument={activeDocument}
            showPropertyPanel
            showLayerPanel
            showToolbar
          />
        </div>
      </div>
    );
  };

  return (
    <Routes>
      <Route path="/" element={<UploadRoute />} />
      <Route path="/viewer" element={<ViewerRoute />} />
      <Route path="/slideshow/:slideNumber" element={<SlideshowRoute />} />
      <Route path="/editor" element={<EditorRoute />} />
      <Route path="/editor-test" element={<EditorTestPage onBack={handleGoHome} />} />
      <Route path="/drawing-ml/*" element={<DrawingMLTestPage onBack={handleGoHome} />} />
      <Route path="/glyph-test" element={<GlyphTestPage onBack={handleGoHome} />} />
      <Route path="/text-editor-test" element={<TextEditorTestPage onBack={handleGoHome} />} />
      <Route path="/docx-editor-test" element={<DocxEditorTestPage onBack={handleGoHome} />} />
      <Route path="/xlsx-editor" element={<XlsxEditorLayout onBack={handleGoHome} />}>
        <Route index element={<XlsxEditorIndexPage />} />
        <Route path="workbook" element={<XlsxWorkbookPage />} />
        <Route path="formula" element={<XlsxFormulaCatalogLayout />}>
          <Route index element={<XlsxFormulaCatalogIndexPage />} />
          <Route path=":category/:functionName" element={<XlsxFormulaFunctionPage />} />
        </Route>
      </Route>
      <Route path="/xlsx-editor-test" element={<Navigate to="/xlsx-editor/workbook" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
