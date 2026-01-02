import { useState, useCallback } from "react";
import { usePptx } from "./hooks/usePptx";
import { FileUpload } from "./components/FileUpload";
import { SlideViewer } from "./components/SlideViewer";
import { SlideshowPage } from "./components/SlideshowPage";
import { EditorTestPage } from "./components/EditorTestPage";
import "./App.css";

// Demo PPTX URL (will be in the public folder)
const DEMO_PPTX_URL = import.meta.env.BASE_URL + "demo.pptx";

type AppMode = "upload" | "viewer" | "slideshow" | "editorTest";

export function App() {
  const [mode, setMode] = useState<AppMode>("upload");
  const [slideshowStartSlide, setSlideshowStartSlide] = useState(1);

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
      setMode("viewer");
    },
    [loadFromFile]
  );

  const handleDemoLoad = useCallback(() => {
    loadFromUrl(DEMO_PPTX_URL, "demo.pptx");
    setMode("viewer");
  }, [loadFromUrl]);

  const handleBack = useCallback(() => {
    reset();
    setMode("upload");
  }, [reset]);

  const handleStartSlideshow = useCallback((slideNumber: number) => {
    setSlideshowStartSlide(slideNumber);
    setMode("slideshow");
  }, []);

  const handleExitSlideshow = useCallback(() => {
    setMode("viewer");
  }, []);

  const handleEditorTest = useCallback(() => {
    setMode("editorTest");
  }, []);

  const handleExitEditorTest = useCallback(() => {
    setMode("upload");
  }, []);

  // Editor test mode
  if (mode === "editorTest") {
    return <EditorTestPage onBack={handleExitEditorTest} />;
  }

  // Error state
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

  // Upload page
  if (mode === "upload" || !presentation) {
    return (
      <FileUpload
        onFileSelect={handleFileSelect}
        onDemoLoad={handleDemoLoad}
        isLoading={status === "loading"}
        onEditorTest={handleEditorTest}
      />
    );
  }

  // Slideshow mode
  if (mode === "slideshow") {
    return (
      <SlideshowPage
        presentation={presentation}
        startSlide={slideshowStartSlide}
        onExit={handleExitSlideshow}
      />
    );
  }

  // Viewer mode
  return (
    <SlideViewer
      presentation={presentation}
      fileName={fileName || "presentation.pptx"}
      onBack={handleBack}
      onStartSlideshow={handleStartSlideshow}
    />
  );
}
