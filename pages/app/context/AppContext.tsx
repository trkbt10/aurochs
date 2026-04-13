/**
 * @file Application-level context that owns all format loaders and navigation.
 *
 * Each page pulls what it needs via useAppContext() instead of receiving
 * a long list of props threaded through App.tsx.
 *
 * The context encapsulates the "reset everything except the target format"
 * pattern that was previously duplicated across ~15 callbacks in App.tsx.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { usePptx, useDocx, useXlsx, usePdf, useFig } from "../hooks";
import { createDemoFigDesignDocument } from "@aurochs-builder/fig/context";
import { convertToPresentationDocument, type PresentationDocument } from "@aurochs-office/pptx/app";
import type { FileSelectResult } from "../pages/LandingPage";
import { PATHS, pptxSlideshowPath } from "../paths";

// =============================================================================
// Demo constants
// =============================================================================

const DEMO_PPTX_URL = import.meta.env.BASE_URL + "demo.pptx";

// =============================================================================
// Types
// =============================================================================

/** Return type of usePptx() — re-exported so consumers don't need to import the hook. */
type PptxLoader = ReturnType<typeof usePptx>;
type DocxLoader = ReturnType<typeof useDocx>;
type XlsxLoader = ReturnType<typeof useXlsx>;
type PdfLoader = ReturnType<typeof usePdf>;
type FigLoader = ReturnType<typeof useFig>;

type AppContextValue = {
  // ---- Loaders (read-only access to loaded data) ----
  readonly pptx: PptxLoader;
  readonly docx: DocxLoader;
  readonly xlsx: XlsxLoader;
  readonly pdf: PdfLoader;
  readonly fig: FigLoader;

  // ---- Derived state ----
  /** Whether any loader is currently loading */
  readonly isLoading: boolean;
  /** PresentationDocument converted from the pptx loader, or an imported document */
  readonly editorDocument: PresentationDocument | null;
  /** File name for the editor document */
  readonly editorFileName: string;

  // ---- Navigation actions ----

  /** Handle a file drop/pick from the landing page */
  readonly openFile: (result: FileSelectResult) => void;

  /** Demo launchers — each resets other formats and navigates */
  readonly openPptxDemo: () => void;
  readonly openPptxEditorDemo: () => void;
  readonly openDocxDemo: () => void;
  readonly openDocxViewerDemo: () => void;
  readonly openXlsxDemo: () => void;
  readonly openXlsxViewerDemo: () => void;
  readonly openPdfViewerDemo: () => void;
  readonly openPdfEditorDemo: () => void;
  readonly openPotxEditorDemo: () => void;
  readonly openPptxSuiteDemo: () => void;
  readonly openFigViewerDemo: () => void;
  readonly openFigEditorDemo: () => void;

  /** Reset all loaders and go back to landing */
  readonly goHome: () => void;

  /** PPTX-specific navigation */
  readonly startSlideshow: (slideNumber: number) => void;
  readonly exitSlideshow: () => void;
  readonly startPptxEditor: () => void;

  /** PDF-specific navigation */
  readonly loadPdfFile: (file: File) => void;
  readonly startPdfEditor: () => Promise<void>;

  /** Fig-specific navigation */
  readonly loadFigFile: (file: File) => void;
  readonly loadFigDemo: () => void;
  readonly startFigEditor: () => void;
};

// =============================================================================
// Context
// =============================================================================

const AppContext = createContext<AppContextValue | null>(null);

/**
 * Access the app-level context. Must be used within <AppProvider>.
 */
export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used within <AppProvider>");
  }
  return ctx;
}

// =============================================================================
// Provider
// =============================================================================

export function AppProvider({ children }: { readonly children: ReactNode }) {
  const navigate = useNavigate();

  // Imported document override for the PPTX editor (e.g. from a .potx import)
  const [importedDocument, setImportedDocument] = useState<PresentationDocument | null>(null);
  const [importedFileName, setImportedFileName] = useState<string | null>(null);

  // ---- Loaders ----
  const pptx = usePptx();
  const docx = useDocx();
  const xlsx = useXlsx();
  const pdf = usePdf();
  const fig = useFig();

  // ---- Helpers ----

  /** Reset all loaders and imported document state. */
  const resetAll = useCallback(() => {
    setImportedDocument(null);
    setImportedFileName(null);
    pptx.reset();
    docx.reset();
    xlsx.reset();
    pdf.reset();
    fig.reset();
  }, [pptx, docx, xlsx, pdf, fig]);

  /**
   * Reset everything except the target format, then clear imported doc state.
   * Returns nothing — the caller is responsible for triggering the actual load.
   */
  const resetOthers = useCallback(
    (keep: "pptx" | "docx" | "xlsx" | "pdf" | "fig") => {
      setImportedDocument(null);
      setImportedFileName(null);
      if (keep !== "pptx") pptx.reset();
      if (keep !== "docx") docx.reset();
      if (keep !== "xlsx") xlsx.reset();
      if (keep !== "pdf") pdf.reset();
      if (keep !== "fig") fig.reset();
    },
    [pptx, docx, xlsx, pdf, fig],
  );

  // ---- Derived state ----

  const editorDocument = useMemo(() => {
    if (importedDocument) return importedDocument;
    if (!pptx.presentation) return null;
    try {
      return convertToPresentationDocument(pptx.presentation);
    } catch (e) {
      console.error("Failed to convert presentation:", e);
      return null;
    }
  }, [importedDocument, pptx.presentation]);

  const editorFileName = importedFileName ?? pptx.fileName ?? "presentation";

  const isLoading =
    pptx.status === "loading" ||
    docx.status === "loading" ||
    xlsx.status === "loading" ||
    pdf.status === "loading" ||
    fig.status === "loading";

  // ---- File select (from landing page) ----

  const openFile = useCallback(
    (result: FileSelectResult) => {
      switch (result.type) {
        case "pptx":
          resetOthers("pptx");
          pptx.loadFromFile(result.file);
          navigate(PATHS.pptxViewer);
          break;
        case "pdf":
          resetOthers("pdf");
          pdf.loadFromFile(result.file);
          navigate(PATHS.pdfViewer);
          break;
        case "docx":
          resetOthers("docx");
          docx.loadFromFile(result.file);
          navigate(PATHS.docxEditor);
          break;
        case "xlsx":
          resetOthers("xlsx");
          xlsx.loadFromFile(result.file);
          navigate(PATHS.xlsxEditor);
          break;
        case "fig":
          resetOthers("fig");
          fig.loadFromFile(result.file);
          navigate(PATHS.figViewer);
          break;
      }
    },
    [pptx, docx, xlsx, pdf, fig, resetOthers, navigate],
  );

  // ---- Demo launchers ----

  const openPptxDemo = useCallback(() => {
    resetOthers("pptx");
    pptx.loadFromUrl(DEMO_PPTX_URL, "demo.pptx");
    navigate(PATHS.pptxViewer);
  }, [pptx, resetOthers, navigate]);

  const openPptxEditorDemo = useCallback(() => {
    resetOthers("pptx");
    pptx.loadFromUrl(DEMO_PPTX_URL, "demo.pptx");
    navigate(PATHS.pptxEditor);
  }, [pptx, resetOthers, navigate]);

  const openDocxDemo = useCallback(() => {
    resetOthers("docx");
    docx.reset();
    navigate(PATHS.docxEditor);
  }, [docx, resetOthers, navigate]);

  const openDocxViewerDemo = useCallback(() => {
    resetOthers("docx");
    docx.reset();
    navigate(PATHS.docxViewer);
  }, [docx, resetOthers, navigate]);

  const openXlsxDemo = useCallback(() => {
    resetOthers("xlsx");
    xlsx.reset();
    navigate(PATHS.xlsxEditor);
  }, [xlsx, resetOthers, navigate]);

  const openXlsxViewerDemo = useCallback(() => {
    resetOthers("xlsx");
    xlsx.reset();
    navigate(PATHS.xlsxViewer);
  }, [xlsx, resetOthers, navigate]);

  const openPdfViewerDemo = useCallback(() => {
    resetOthers("pdf");
    navigate(PATHS.pdfViewer);
  }, [resetOthers, navigate]);

  const openPdfEditorDemo = useCallback(() => {
    resetOthers("pdf");
    navigate(PATHS.pdfEditor);
  }, [resetOthers, navigate]);

  const openPotxEditorDemo = useCallback(() => {
    navigate(PATHS.potxEditor);
  }, [navigate]);

  const loadFigDemo = useCallback(() => {
    fig.load("demo.fig", createDemoFigDesignDocument);
  }, [fig]);

  const openFigViewerDemo = useCallback(() => {
    resetOthers("fig");
    loadFigDemo();
    navigate(PATHS.figViewer);
  }, [resetOthers, loadFigDemo, navigate]);

  const openFigEditorDemo = useCallback(() => {
    resetOthers("fig");
    loadFigDemo();
    navigate(PATHS.figEditor);
  }, [resetOthers, loadFigDemo, navigate]);

  const openPptxSuiteDemo = useCallback(() => {
    resetOthers("pptx");
    pptx.loadFromUrl(DEMO_PPTX_URL, "demo.pptx");
    navigate(PATHS.pptxSuite);
  }, [pptx, resetOthers, navigate]);

  // ---- Navigation ----

  const goHome = useCallback(() => {
    resetAll();
    navigate(PATHS.home);
  }, [resetAll, navigate]);

  const startSlideshow = useCallback(
    (slideNumber: number) => {
      navigate(pptxSlideshowPath(slideNumber));
    },
    [navigate],
  );

  const exitSlideshow = useCallback(() => {
    navigate(PATHS.pptxViewer);
  }, [navigate]);

  const startPptxEditor = useCallback(() => {
    navigate(PATHS.pptxEditor);
  }, [navigate]);

  // ---- PDF-specific ----

  const loadPdfFile = useCallback(
    (file: File) => {
      pdf.loadFromFile(file);
    },
    [pdf],
  );

  const startPdfEditor = useCallback(async () => {
    await pdf.ensureDocument();
    navigate(PATHS.pdfEditor);
  }, [navigate, pdf]);

  // ---- Fig-specific ----

  const loadFigFile = useCallback(
    (file: File) => {
      fig.loadFromFile(file);
    },
    [fig],
  );

  const startFigEditor = useCallback(() => {
    navigate(PATHS.figEditor);
  }, [navigate]);

  // ---- Build context value ----

  const value = useMemo<AppContextValue>(
    () => ({
      pptx,
      docx,
      xlsx,
      pdf,
      fig,
      isLoading,
      editorDocument,
      editorFileName,
      openFile,
      openPptxDemo,
      openPptxEditorDemo,
      openDocxDemo,
      openDocxViewerDemo,
      openXlsxDemo,
      openXlsxViewerDemo,
      openPdfViewerDemo,
      openPdfEditorDemo,
      openPotxEditorDemo,
      openPptxSuiteDemo,
      openFigViewerDemo,
      openFigEditorDemo,
      goHome,
      startSlideshow,
      exitSlideshow,
      startPptxEditor,
      loadPdfFile,
      startPdfEditor,
      loadFigFile,
      loadFigDemo,
      startFigEditor,
    }),
    [
      pptx, docx, xlsx, pdf, fig,
      isLoading, editorDocument, editorFileName,
      openFile,
      openPptxDemo, openPptxEditorDemo,
      openDocxDemo, openDocxViewerDemo,
      openXlsxDemo, openXlsxViewerDemo,
      openPdfViewerDemo, openPdfEditorDemo,
      openPotxEditorDemo, openPptxSuiteDemo,
      openFigViewerDemo, openFigEditorDemo,
      goHome,
      startSlideshow, exitSlideshow,
      startPptxEditor,
      loadPdfFile, startPdfEditor,
      loadFigFile, loadFigDemo, startFigEditor,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
