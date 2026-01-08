/**
 * @file App entry for the pages demo.
 */

import { useCallback, useMemo } from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { usePptx } from "./hooks/usePptx";
import { FileUpload } from "./components/FileUpload";
import { SlideViewer } from "./components/SlideViewer";
import { SlideshowPage } from "./components/SlideshowPage";
import { EditorTestPage } from "./components/EditorTestPage";
import { DrawingMLTestPage } from "./components/DrawingMLTestPage";
import { PresentationEditor, EditorConfigProvider } from "@lib/pptx-editor";
import { convertToPresentationDocument } from "@lib/pptx/app";
import "./App.css";

// Demo PPTX URL (will be in the public folder)
const DEMO_PPTX_URL = import.meta.env.BASE_URL + "demo.pptx";

/**
 * Top-level application component for the demo pages build.
 */
export function App() {
  const navigate = useNavigate();

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
    (file: File) => {
      loadFromFile(file);
      navigate("/viewer");
    },
    [loadFromFile, navigate]
  );

  const handleDemoLoad = useCallback(() => {
    loadFromUrl(DEMO_PPTX_URL, "demo.pptx");
    navigate("/viewer");
  }, [loadFromUrl, navigate]);

  const handleBack = useCallback(() => {
    reset();
    navigate("/");
  }, [reset, navigate]);

  const handleGoHome = useCallback(() => {
    navigate("/");
  }, [navigate]);

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

  const handleStartEditor = useCallback(() => {
    navigate("/editor");
  }, [navigate]);

  const handleExitEditor = useCallback(() => {
    navigate("/viewer");
  }, [navigate]);

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
    <FileUpload
      onFileSelect={handleFileSelect}
      onDemoLoad={handleDemoLoad}
      isLoading={status === "loading"}
      onEditorTest={handleEditorTest}
      onDrawingMLTest={handleDrawingMLTest}
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
    if (!presentation) {
      return <Navigate to="/" replace />;
    }

    if (!editorDocument) {
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
            <p className="error-message">Could not convert presentation for editing. Check the console for details.</p>
            <button className="error-button" onClick={handleExitEditor}>
              Back to Viewer
            </button>
          </div>
        </div>
      );
    }

    return (
      <EditorConfigProvider config={{ locale: "en-US" }}>
        <div className="editor-page">
          <header className="editor-header">
            <button className="back-button" onClick={handleExitEditor}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>Back to Viewer</span>
            </button>
            <span className="editor-title">{fileName}</span>
          </header>
          <div className="editor-content">
            <PresentationEditor
              initialDocument={editorDocument}
              showPropertyPanel
              showLayerPanel
              showToolbar
            />
          </div>
        </div>
      </EditorConfigProvider>
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
