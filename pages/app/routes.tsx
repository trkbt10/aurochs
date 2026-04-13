/**
 * @file Route definitions for the app.
 *
 * Each route component is a thin adapter that reads from AppContext
 * and passes the required props to the corresponding page component.
 * This keeps individual page components pure (prop-driven) while
 * centralizing the "which data does this route need?" decisions here.
 */

import { Navigate, Routes, Route, useParams } from "react-router-dom";
import { useAppContext } from "./context/AppContext";
import { PATHS, PATH_PATTERNS } from "./paths";
import { ErrorPage } from "./components/ErrorPage";
import { LandingPage } from "./pages/LandingPage";
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
import { FigEditorPage } from "./pages/FigEditorPage";
import { FigViewerPage } from "./pages/FigViewerPage";
import { FigRouteGate } from "./components/FigRouteGate";
import { createDefaultGraphicsState, type PdfDocument as PdfDoc } from "@aurochs/pdf";

// =============================================================================
// Demo data
// =============================================================================

/** Create a demo PDF document for the editor when no file is loaded. */
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

// LandingPage reads its callbacks and isLoading from AppContext directly,
// so no adapter wiring is needed.

// =============================================================================
// PPTX routes
// =============================================================================

function PptxViewerRoute() {
  const { pptx, goHome, startSlideshow, startPptxEditor } = useAppContext();

  if (!pptx.presentation) {
    if (pptx.status === "loading") {
      // LandingPage reads isLoading from context, which is true during loading.
      return <LandingPage />;
    }
    return <Navigate to={PATHS.home} replace />;
  }

  return (
    <PptxViewerPage
      presentation={pptx.presentation}
      fileName={pptx.fileName || "presentation.pptx"}
      onBack={goHome}
      onStartSlideshow={startSlideshow}
      onStartEditor={startPptxEditor}
    />
  );
}

function PptxSlideshowRoute() {
  const { pptx, exitSlideshow } = useAppContext();
  const { slideNumber } = useParams<{ slideNumber: string }>();

  if (!pptx.presentation) return <Navigate to={PATHS.home} replace />;

  const startSlide = Math.max(1, Number.parseInt(slideNumber ?? "1", 10) || 1);
  return (
    <PptxSlideshowPage
      presentation={pptx.presentation}
      startSlide={startSlide}
      onExit={exitSlideshow}
    />
  );
}

function PptxEditorRoute() {
  const { editorDocument, editorFileName, goHome } = useAppContext();

  if (!editorDocument) {
    return (
      <ErrorPage
        title="Failed to open editor"
        message="Could not open document for editing. Check the console for details."
        buttonLabel="Back"
        onAction={goHome}
      />
    );
  }

  return (
    <PptxEditorPage
      document={editorDocument}
      fileName={editorFileName}
      onBack={goHome}
      backLabel="Back"
    />
  );
}

// =============================================================================
// DOCX routes
// =============================================================================

function DocxViewerRoute() {
  const { docx, goHome } = useAppContext();
  return <DocxViewerPage document={docx.document} fileName={docx.fileName} onBack={goHome} />;
}

function DocxEditorRoute() {
  const { docx, goHome } = useAppContext();
  return <DocxEditorPage document={docx.document} fileName={docx.fileName} onBack={goHome} />;
}

// =============================================================================
// XLSX routes
// =============================================================================

function XlsxViewerRoute() {
  const { xlsx, goHome } = useAppContext();
  return <XlsxViewerPage workbook={xlsx.workbook} fileName={xlsx.fileName} onBack={goHome} />;
}

function XlsxEditorRoute() {
  const { xlsx, goHome } = useAppContext();
  return <XlsxEditorPage workbook={xlsx.workbook} fileName={xlsx.fileName} onBack={goHome} />;
}

// =============================================================================
// PDF routes
// =============================================================================

function PdfViewerRoute() {
  const { pdf, goHome, loadPdfFile, startPdfEditor } = useAppContext();
  return (
    <PdfViewerPage
      data={pdf.data}
      fileName={pdf.fileName}
      onBack={goHome}
      onFileSelect={loadPdfFile}
      onStartEditor={pdf.data ? startPdfEditor : undefined}
    />
  );
}

function PdfEditorRoute() {
  const { pdf, goHome } = useAppContext();
  const doc = pdf.document ?? createDemoPdf();
  return (
    <PdfEditorPage
      document={doc}
      fileName={pdf.fileName ?? "Demo PDF"}
      onBack={goHome}
    />
  );
}

// =============================================================================
// POTX routes
// =============================================================================

function PotxEditorRoute() {
  const { goHome } = useAppContext();
  return <PotxEditorPage onBack={goHome} />;
}

function TextEditTestRoute() {
  const { goHome } = useAppContext();
  return <TextEditTestPage onBack={goHome} />;
}

// =============================================================================
// Presentation Suite
// =============================================================================

function PresentationSuiteRoute() {
  const { editorDocument, editorFileName, goHome } = useAppContext();

  if (!editorDocument) {
    return <Navigate to={PATHS.potxEditor} replace />;
  }

  return (
    <PresentationSuitePage
      document={editorDocument}
      fileName={editorFileName}
      onBack={goHome}
      backLabel="Back"
    />
  );
}

// =============================================================================
// Fig routes
// =============================================================================

function FigViewerRoute() {
  const { fig, goHome, loadFigFile, loadFigDemo, startFigEditor } = useAppContext();
  return (
    <FigRouteGate
      fig={fig}
      onLoadDemo={loadFigDemo}
      loadingContent={<LandingPage />}
      errorRedirect={PATHS.home}
    >
      {(document) => (
        <FigViewerPage
          document={document}
          fileName={fig.fileName}
          onBack={goHome}
          onFileSelect={loadFigFile}
          onStartEditor={startFigEditor}
        />
      )}
    </FigRouteGate>
  );
}

function FigEditorRoute() {
  const { fig, goHome, loadFigDemo } = useAppContext();
  return (
    <FigRouteGate
      fig={fig}
      onLoadDemo={loadFigDemo}
      loadingContent={<LandingPage />}
      errorRedirect={PATHS.home}
    >
      {(document) => (
        <FigEditorPage
          document={document}
          fileName={fig.fileName ?? "design.fig"}
          onBack={goHome}
        />
      )}
    </FigRouteGate>
  );
}

// =============================================================================
// Error gate (PPTX load error)
// =============================================================================

/**
 * Wraps the route tree — if the PPTX loader is in an error state,
 * show an error page instead of rendering any route.
 */
function PptxErrorGate({ children }: { readonly children: React.ReactNode }) {
  const { pptx, goHome } = useAppContext();

  if (pptx.status === "error") {
    return (
      <ErrorPage
        title="Failed to load presentation"
        message={pptx.error ?? "Unknown error"}
        buttonLabel="Try Again"
        onAction={goHome}
      />
    );
  }

  return <>{children}</>;
}

// =============================================================================
// Route tree
// =============================================================================

export function AppRoutes() {
  return (
    <PptxErrorGate>
      <Routes>
        <Route path={PATHS.home} element={<LandingPage />} />
        <Route path={PATHS.pptxViewer} element={<PptxViewerRoute />} />
        <Route path={PATH_PATTERNS.pptxSlideshow} element={<PptxSlideshowRoute />} />
        <Route path={PATHS.pptxEditor} element={<PptxEditorRoute />} />
        <Route path={PATHS.docxViewer} element={<DocxViewerRoute />} />
        <Route path={PATHS.docxEditor} element={<DocxEditorRoute />} />
        <Route path={PATHS.xlsxViewer} element={<XlsxViewerRoute />} />
        <Route path={PATHS.xlsxEditor} element={<XlsxEditorRoute />} />
        <Route path={PATHS.pdfViewer} element={<PdfViewerRoute />} />
        <Route path={PATHS.pdfEditor} element={<PdfEditorRoute />} />
        <Route path={PATHS.potxEditor} element={<PotxEditorRoute />} />
        <Route path={PATHS.potxTextEditDev} element={<TextEditTestRoute />} />
        <Route path={PATHS.pptxSuite} element={<PresentationSuiteRoute />} />
        <Route path={PATHS.figViewer} element={<FigViewerRoute />} />
        <Route path={PATHS.figEditor} element={<FigEditorRoute />} />
        <Route path="*" element={<Navigate to={PATHS.home} replace />} />
      </Routes>
    </PptxErrorGate>
  );
}
