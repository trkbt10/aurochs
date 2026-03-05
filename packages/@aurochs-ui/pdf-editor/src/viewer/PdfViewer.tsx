/**
 * @file PDF Viewer component
 *
 * Displays PDF pages and provides JSON serialization/deserialization testing.
 */

import { useState, useCallback, useEffect, type ReactNode } from "react";
import { buildPdf } from "@aurochs-builder/pdf";
import {
  serializePdfDocumentAsJson,
  deserializePdfDocumentFromJson,
  createDefaultGraphicsState,
  type PdfDocument,
  type PdfText,
  type PdfPath,
} from "@aurochs/pdf";
import { renderPdfPageToSvg } from "@aurochs-renderer/pdf/svg";
import {
  NavigationControls,
  PositionIndicator,
  useItemNavigation,
  ViewerToolbar,
} from "@aurochs-ui/ui-components/viewer";
import { Button } from "@aurochs-ui/ui-components/primitives";

/** Create a demo PDF document with text and shapes */
function createDemoPdfDocument(): PdfDocument {
  const gs = createDefaultGraphicsState();

  const titleText: PdfText = {
    type: "text",
    text: "aurochs PDF Viewer Demo",
    x: 72,
    y: 720,
    width: 400,
    height: 36,
    fontName: "Helvetica-Bold",
    fontSize: 36,
    graphicsState: {
      ...gs,
      fillColor: { colorSpace: "DeviceRGB", components: [0.1, 0.1, 0.1] },
    },
  };

  const subtitleText: PdfText = {
    type: "text",
    text: "This document was generated programmatically using @aurochs-builder/pdf",
    x: 72,
    y: 680,
    width: 450,
    height: 14,
    fontName: "Helvetica",
    fontSize: 14,
    graphicsState: {
      ...gs,
      fillColor: { colorSpace: "DeviceRGB", components: [0.4, 0.4, 0.4] },
    },
  };

  const featureText1: PdfText = {
    type: "text",
    text: "Features:",
    x: 72,
    y: 620,
    width: 80,
    height: 18,
    fontName: "Helvetica-Bold",
    fontSize: 18,
    graphicsState: gs,
  };

  const featureText2: PdfText = {
    type: "text",
    text: "• JSON serialization/deserialization (browser-compatible)",
    x: 90,
    y: 590,
    width: 400,
    height: 14,
    fontName: "Helvetica",
    fontSize: 14,
    graphicsState: gs,
  };

  const featureText3: PdfText = {
    type: "text",
    text: "• SVG rendering with crisp vector graphics",
    x: 90,
    y: 565,
    width: 400,
    height: 14,
    fontName: "Helvetica",
    fontSize: 14,
    graphicsState: gs,
  };

  const featureText4: PdfText = {
    type: "text",
    text: "• No Node.js dependencies for core functionality",
    x: 90,
    y: 540,
    width: 400,
    height: 14,
    fontName: "Helvetica",
    fontSize: 14,
    graphicsState: gs,
  };

  // A decorative rectangle
  const decorRect: PdfPath = {
    type: "path",
    operations: [
      { type: "rect", x: 72, y: 450, width: 468, height: 60 },
    ],
    paintOp: "fill",
    graphicsState: {
      ...gs,
      fillColor: { colorSpace: "DeviceRGB", components: [0.93, 0.93, 0.97] },
    },
  };

  const infoText: PdfText = {
    type: "text",
    text: "Click 'Test JSON Round-Trip' to verify browser serialization works correctly.",
    x: 90,
    y: 475,
    width: 430,
    height: 14,
    fontName: "Helvetica",
    fontSize: 14,
    graphicsState: {
      ...gs,
      fillColor: { colorSpace: "DeviceRGB", components: [0.2, 0.2, 0.5] },
    },
  };

  return {
    pages: [
      {
        pageNumber: 1,
        width: 612, // US Letter
        height: 792,
        elements: [titleText, subtitleText, featureText1, featureText2, featureText3, featureText4, decorRect, infoText],
      },
    ],
    metadata: {
      title: "aurochs PDF Demo",
      author: "aurochs-builder/pdf",
    },
  };
}

export type PdfViewerProps = Readonly<{
  /** PDF file data */
  readonly data: Uint8Array | null;
  /** Optional className */
  readonly className?: string;
}>;

type ViewerState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "loaded"; readonly document: PdfDocument }
  | { readonly status: "error"; readonly message: string };

/**
 * PDF Viewer component that loads and displays PDF files.
 * Includes JSON round-trip testing for browser compatibility verification.
 * Shows a demo PDF when no data is provided.
 */
export function PdfViewer({ data, className }: PdfViewerProps): ReactNode {
  const [state, setState] = useState<ViewerState>({ status: "idle" });
  const [roundTripResult, setRoundTripResult] = useState<string | null>(null);

  const totalPages = state.status === "loaded" ? state.document.pages.length : 0;
  const nav = useItemNavigation({ totalItems: Math.max(1, totalPages) });

  const loadPdf = useCallback(async () => {
    setState({ status: "loading" });

    try {
      if (data) {
        const document = await buildPdf({ data });
        setState({ status: "loaded", document });
      } else {
        // Show demo PDF when no data provided
        const demoDocument = createDemoPdfDocument();
        setState({ status: "loaded", document: demoDocument });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState({ status: "error", message });
    }
  }, [data]);

  const testJsonRoundTrip = useCallback(() => {
    if (state.status !== "loaded") {
      return;
    }

    try {
      // Serialize to JSON
      const json = serializePdfDocumentAsJson(state.document);

      // Deserialize back
      const restored = deserializePdfDocumentFromJson(json);

      // Verify page count matches
      const originalPages = state.document.pages.length;
      const restoredPages = restored.pages.length;

      if (originalPages !== restoredPages) {
        setRoundTripResult(`FAIL: Page count mismatch (${originalPages} vs ${restoredPages})`);
        return;
      }

      // Verify element counts match for each page
      for (let i = 0; i < originalPages; i++) {
        const origElements = state.document.pages[i]?.elements.length ?? 0;
        const restElements = restored.pages[i]?.elements.length ?? 0;
        if (origElements !== restElements) {
          setRoundTripResult(`FAIL: Page ${i + 1} element count mismatch (${origElements} vs ${restElements})`);
          return;
        }
      }

      setRoundTripResult(`SUCCESS: ${originalPages} pages, JSON size: ${(json.length / 1024).toFixed(1)} KB`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setRoundTripResult(`ERROR: ${message}`);
    }
  }, [state]);

  // Auto-load on mount or when data changes
  useEffect(() => {
    if (state.status === "idle") {
      loadPdf();
    }
  }, [state.status, loadPdf]);

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {state.status === "loading" && <div style={{ padding: 16 }}>Loading PDF...</div>}

      {state.status === "error" && (
        <div style={{ padding: 16, color: "red" }}>Error: {state.message}</div>
      )}

      {state.status === "loaded" && (
        <>
          <ViewerToolbar
            left={
              <>
                <NavigationControls
                  onPrev={nav.goToPrev}
                  onNext={nav.goToNext}
                  canGoPrev={!nav.isFirst}
                  canGoNext={!nav.isLast}
                  variant="minimal"
                />
                <PositionIndicator
                  current={nav.currentNumber}
                  total={totalPages}
                  variant="compact"
                />
              </>
            }
            right={
              <Button variant="secondary" size="sm" onClick={testJsonRoundTrip}>
                Test JSON Round-Trip
              </Button>
            }
          />

          {roundTripResult && (
            <div
              style={{
                padding: "8px 16px",
                backgroundColor: roundTripResult.startsWith("SUCCESS") ? "#d4edda" : "#f8d7da",
                fontSize: 13,
              }}
            >
              {roundTripResult}
            </div>
          )}

          <div
            style={{
              flex: 1,
              overflow: "auto",
              backgroundColor: "#525659",
              display: "flex",
              justifyContent: "center",
              padding: 24,
            }}
          >
            {renderPdfPage(state.document, nav.currentIndex)}
          </div>
        </>
      )}
    </div>
  );
}

function renderPdfPage(document: PdfDocument, pageIndex: number): ReactNode {
  const page = document.pages[pageIndex];
  if (!page) {
    return <div style={{ color: "#fff" }}>Page not found</div>;
  }

  const svg = renderPdfPageToSvg(page);
  return (
    <div
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{
        backgroundColor: "#fff",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
        flexShrink: 0,
      }}
    />
  );
}
