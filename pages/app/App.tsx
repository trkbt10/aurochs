/**
 * @file App entry for the aurochs demo.
 *
 * Unified landing page with PPTX/DOCX/XLSX format support.
 */

import { useCallback, useMemo, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { usePptx, useDocx, useXlsx, usePdf } from "./hooks";
import { LandingPage, type FileSelectResult } from "./pages/LandingPage";
import { PptxViewerPage } from "./pages/PptxViewerPage";
import { PptxSlideshowPage } from "./pages/PptxSlideshowPage";
import { PptxEditorPage } from "./pages/PptxEditorPage";
import { DocxEditorPage } from "./pages/DocxEditorPage";
import { DocxViewerPage } from "./pages/DocxViewerPage";
import { XlsxEditorPage } from "./pages/XlsxEditorPage";
import { XlsxViewerPage } from "./pages/XlsxViewerPage";
import { PdfViewerPage } from "./pages/PdfViewerPage";
import { PdfEditorPage } from "./pages/PdfEditorPage";
import { PotxEditorPage } from "./pages/PotxEditorPage";
import { TextEditTestPage } from "@aurochs-ui/potx-editor/dev/TextEditTestPage";
import { PresentationSuitePage } from "./pages/PresentationSuitePage";
import { createDefaultGraphicsState, type PdfDocument as PdfDoc } from "@aurochs/pdf";
import { convertToPresentationDocument, type PresentationDocument } from "@aurochs-office/pptx/app";
import "./App.css";

/** Create a demo PDF document for the editor. */
function createDemoPdf(): PdfDoc {
  const gs = createDefaultGraphicsState();
  return {
    pages: [{
      pageNumber: 1,
      width: 612,
      height: 792,
      elements: [
        {
          type: "text",
          text: "PDF Editor Demo",
          x: 72, y: 720, width: 300, height: 36,
          fontName: "Helvetica-Bold", fontSize: 36,
          graphicsState: { ...gs, fillColor: { colorSpace: "DeviceRGB", components: [0.1, 0.1, 0.1] } },
        },
        {
          type: "text",
          text: "Click on elements to select them. Use Delete to remove.",
          x: 72, y: 680, width: 450, height: 14,
          fontName: "Helvetica", fontSize: 14,
          graphicsState: { ...gs, fillColor: { colorSpace: "DeviceRGB", components: [0.4, 0.4, 0.4] } },
        },
        {
          type: "path",
          operations: [{ type: "rect", x: 72, y: 500, width: 200, height: 100 }],
          paintOp: "fill",
          graphicsState: { ...gs, fillColor: { colorSpace: "DeviceRGB", components: [0.27, 0.45, 0.77] } },
        },
        {
          type: "path",
          operations: [{ type: "rect", x: 300, y: 500, width: 150, height: 100 }],
          paintOp: "fill",
          graphicsState: { ...gs, fillColor: { colorSpace: "DeviceRGB", components: [0.93, 0.49, 0.19] } },
        },
      ],
    }],
    metadata: { title: "PDF Editor Demo" },
  };
}

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
  const pdf = usePdf();

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
          setImportedDocument(null);
          setImportedFileName(null);
          docx.reset();
          xlsx.reset();
          pptx.reset();
          pdf.loadFromFile(result.file);
          navigate("/pdf/viewer");
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

  const handlePptxEditorDemo = useCallback(() => {
    setImportedDocument(null);
    setImportedFileName(null);
    docx.reset();
    xlsx.reset();
    pptx.loadFromUrl(DEMO_PPTX_URL, "demo.pptx");
    navigate("/pptx/editor");
  }, [pptx, docx, xlsx, navigate]);

  const handleDocxDemo = useCallback(() => {
    pptx.reset();
    xlsx.reset();
    setImportedDocument(null);
    setImportedFileName(null);
    docx.reset();
    navigate("/docx/editor");
  }, [pptx, docx, xlsx, navigate]);

  const handleDocxViewerDemo = useCallback(() => {
    pptx.reset();
    xlsx.reset();
    setImportedDocument(null);
    setImportedFileName(null);
    docx.reset();
    navigate("/docx/viewer");
  }, [pptx, docx, xlsx, navigate]);

  const handleXlsxDemo = useCallback(() => {
    pptx.reset();
    docx.reset();
    setImportedDocument(null);
    setImportedFileName(null);
    xlsx.reset();
    navigate("/xlsx/editor");
  }, [pptx, docx, xlsx, navigate]);

  const handleXlsxViewerDemo = useCallback(() => {
    pptx.reset();
    docx.reset();
    setImportedDocument(null);
    setImportedFileName(null);
    xlsx.reset();
    navigate("/xlsx/viewer");
  }, [pptx, docx, xlsx, navigate]);

  const handlePdfViewerDemo = useCallback(() => {
    pptx.reset();
    docx.reset();
    xlsx.reset();
    setImportedDocument(null);
    setImportedFileName(null);
    navigate("/pdf/viewer");
  }, [pptx, docx, xlsx, navigate]);

  const handlePdfEditorDemo = useCallback(() => {
    pptx.reset();
    docx.reset();
    xlsx.reset();
    setImportedDocument(null);
    setImportedFileName(null);
    navigate("/pdf/editor");
  }, [pptx, docx, xlsx, navigate]);

  const handlePotxEditorDemo = useCallback(() => {
    navigate("/potx/editor");
  }, [navigate]);

  const handlePptxSuiteDemo = useCallback(() => {
    setImportedDocument(null);
    setImportedFileName(null);
    docx.reset();
    xlsx.reset();
    pptx.loadFromUrl(DEMO_PPTX_URL, "demo.pptx");
    navigate("/pptx/suite");
  }, [pptx, docx, xlsx, navigate]);

  const handleBack = useCallback(() => {
    setImportedDocument(null);
    setImportedFileName(null);
    pptx.reset();
    docx.reset();
    xlsx.reset();
    pdf.reset();
    navigate("/");
  }, [pptx, docx, xlsx, pdf, navigate]);

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
    if (!pptx.presentation) {return null;}
    try {
      return convertToPresentationDocument(pptx.presentation);
    } catch (e) {
      console.error("Failed to convert presentation:", e);
      return null;
    }
  }, [pptx.presentation]);

  const isLoading = pptx.status === "loading" || docx.status === "loading" || xlsx.status === "loading" || pdf.status === "loading";

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
      onPptxEditorDemo={handlePptxEditorDemo}
      onDocxDemo={handleDocxDemo}
      onDocxViewerDemo={handleDocxViewerDemo}
      onXlsxDemo={handleXlsxDemo}
      onXlsxViewerDemo={handleXlsxViewerDemo}
      onPdfViewerDemo={handlePdfViewerDemo}
      onPdfEditorDemo={handlePdfEditorDemo}
      onPotxEditorDemo={handlePotxEditorDemo}
      onPptxSuiteDemo={handlePptxSuiteDemo}
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
            onPptxEditorDemo={handlePptxEditorDemo}
            onDocxDemo={handleDocxDemo}
            onDocxViewerDemo={handleDocxViewerDemo}
            onXlsxDemo={handleXlsxDemo}
            onXlsxViewerDemo={handleXlsxViewerDemo}
            onPdfViewerDemo={handlePdfViewerDemo}
            onPdfEditorDemo={handlePdfEditorDemo}
            onPotxEditorDemo={handlePotxEditorDemo}
            onPptxSuiteDemo={handlePptxSuiteDemo}
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
    if (!pptx.presentation) {return <Navigate to="/" replace />;}
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

  const DocxViewerRoute = () => (
    <DocxViewerPage document={docx.document} fileName={docx.fileName} onBack={handleBack} />
  );

  const DocxEditorRoute = () => (
    <DocxEditorPage document={docx.document} fileName={docx.fileName} onBack={handleBack} />
  );

  const XlsxViewerRoute = () => (
    <XlsxViewerPage workbook={xlsx.workbook} fileName={xlsx.fileName} onBack={handleBack} />
  );

  const XlsxEditorRoute = () => (
    <XlsxEditorPage workbook={xlsx.workbook} fileName={xlsx.fileName} onBack={handleBack} />
  );

  const handlePdfFileSelect = useCallback(
    (file: File) => {
      pdf.loadFromFile(file);
    },
    [pdf],
  );

  const handleStartPdfEditor = useCallback(() => {
    navigate("/pdf/editor");
  }, [navigate]);

  const handleExitPdfEditor = useCallback(() => {
    if (pdf.data) {
      navigate("/pdf/viewer");
      return;
    }
    handleBack();
  }, [handleBack, navigate, pdf.data]);

  const PdfViewerRoute = () => (
    <PdfViewerPage
      data={pdf.data}
      fileName={pdf.fileName}
      onBack={handleBack}
      onFileSelect={handlePdfFileSelect}
      onStartEditor={pdf.data ? handleStartPdfEditor : undefined}
    />
  );

  const PdfEditorRoute = () => {
    const doc = pdf.document ?? createDemoPdf();
    return (
      <PdfEditorPage
        document={doc}
        fileName={pdf.fileName ?? "Demo PDF"}
        onBack={handleExitPdfEditor}
      />
    );
  };

  const PotxEditorRoute = () => (
    <PotxEditorPage onBack={handleBack} />
  );

  const PresentationSuiteRoute = () => {
    const activeDocument = importedDocument ?? editorDocument;
    if (!activeDocument) {
      return <Navigate to="/potx/editor" replace />;
    }
    const activeFileName = importedFileName ?? pptx.fileName ?? "presentation";
    return (
      <PresentationSuitePage document={activeDocument} fileName={activeFileName} onBack={handleExitEditor} backLabel="Back" />
    );
  };

  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route path="/pptx/viewer" element={<PptxViewerRoute />} />
      <Route path="/pptx/slideshow/:slideNumber" element={<PptxSlideshowRoute />} />
      <Route path="/pptx/editor" element={<PptxEditorRoute />} />
      <Route path="/docx/viewer" element={<DocxViewerRoute />} />
      <Route path="/docx/editor" element={<DocxEditorRoute />} />
      <Route path="/xlsx/viewer" element={<XlsxViewerRoute />} />
      <Route path="/xlsx/editor" element={<XlsxEditorRoute />} />
      <Route path="/pdf/viewer" element={<PdfViewerRoute />} />
      <Route path="/pdf/editor" element={<PdfEditorRoute />} />
      <Route path="/potx/editor" element={<PotxEditorRoute />} />
      <Route path="/potx/editor/dev/text-edit" element={<TextEditTestPage onBack={handleBack} />} />
      <Route path="/pptx/suite" element={<PresentationSuiteRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
