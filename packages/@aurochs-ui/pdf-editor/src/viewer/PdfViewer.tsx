/**
 * @file PDF Viewer component
 *
 * Displays PDF pages with navigation controls.
 * Uses shared ViewerContainer/ViewerContent/ViewerToolbar components.
 */

import { useState, useCallback, useEffect, type CSSProperties, type ReactNode } from "react";
import { colorTokens, spacingTokens, shadowTokens } from "@aurochs-ui/ui-components/design-tokens";
import { buildPdf } from "@aurochs-builder/pdf";
import type { PdfDocument } from "@aurochs/pdf";
import { renderPdfPageToSvgNode, svgElementToJsx } from "@aurochs-renderer/pdf/svg";
import {
  ViewerContainer,
  ViewerContent,
  NavigationControls,
  PositionIndicator,
  useItemNavigation,
  ViewerToolbar,
} from "@aurochs-ui/ui-components/viewer";

export type PdfViewerProps = Readonly<{
  /** PDF file data */
  readonly data: Uint8Array | null;
  /** Optional className */
  readonly className?: string;
}>;

// =============================================================================
// Styles
// =============================================================================

const statusStyle: CSSProperties = { padding: spacingTokens.lg };
const errorStyle: CSSProperties = { padding: spacingTokens.lg, color: colorTokens.accent.danger };
const canvasStyle: CSSProperties = { backgroundColor: colorTokens.background.canvas };
const pageNotFoundStyle: CSSProperties = { color: colorTokens.overlay.lightText };
const pageContainerStyle: CSSProperties = { backgroundColor: colorTokens.background.primary, boxShadow: shadowTokens.md, flexShrink: 0 };

type ViewerState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "loaded"; readonly document: PdfDocument }
  | { readonly status: "error"; readonly message: string };

/**
 * PDF Viewer component that loads and displays PDF files.
 */
export function PdfViewer({ data, className }: PdfViewerProps): ReactNode {
  const [state, setState] = useState<ViewerState>({ status: "idle" });

  const totalPages = state.status === "loaded" ? state.document.pages.length : 0;
  const nav = useItemNavigation({ totalItems: Math.max(1, totalPages) });

  const loadPdf = useCallback(async () => {
    setState({ status: "loading" });

    try {
      if (data) {
        const document = await buildPdf({ data });
        setState({ status: "loaded", document });
      } else {
        setState({ status: "error", message: "No PDF data provided" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState({ status: "error", message });
    }
  }, [data]);

  // Auto-load on mount or when data changes
  useEffect(() => {
    if (state.status === "idle") {
      loadPdf();
    }
  }, [state.status, loadPdf]);

  return (
    <ViewerContainer className={className}>
      {state.status === "loading" && <div style={statusStyle}>Loading PDF...</div>}

      {state.status === "error" && (
        <div style={errorStyle}>Error: {state.message}</div>
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
          />

          <ViewerContent style={canvasStyle}>
            {renderPdfPage(state.document, nav.currentIndex)}
          </ViewerContent>
        </>
      )}
    </ViewerContainer>
  );
}

function renderPdfPage(document: PdfDocument, pageIndex: number): ReactNode {
  const page = document.pages[pageIndex];
  if (!page) {
    return <div style={pageNotFoundStyle}>Page not found</div>;
  }

  const svgNode = renderPdfPageToSvgNode(page);
  return (
    <div style={pageContainerStyle}>
      {svgElementToJsx(svgNode)}
    </div>
  );
}
