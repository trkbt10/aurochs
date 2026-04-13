/**
 * @file PDF Viewer component
 *
 * Displays PDF pages with navigation controls.
 * Uses shared ViewerContainer/ViewerContent/ViewerToolbar components.
 *
 * Performance: uses PdfRenderSession from @aurochs-renderer/pdf which loads
 * the PDF structure and extracts fonts once, then parses and builds individual
 * pages on demand with LRU caching. Images are resolved via PdfImageCache
 * (Object URL + deferred PNG encoding for raw pixel data).
 */

import { memo, useState, useEffect, useMemo, type CSSProperties, type ReactNode } from "react";
import { colorTokens, spacingTokens, shadowTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { PdfPage } from "@aurochs/pdf";
import type { PdfRenderSession, FontProvider, PdfImageUrlResolver } from "@aurochs-renderer/pdf";
import { createPdfRenderSession } from "@aurochs-renderer/pdf";
import { usePdfImageCache } from "@aurochs-renderer/pdf/react";
import { renderPdfPageToSvgNode } from "@aurochs-renderer/pdf/svg";
import { svgElementToJsx } from "@aurochs-renderer/svg";
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
const pageContainerStyle: CSSProperties = { backgroundColor: colorTokens.background.primary, boxShadow: shadowTokens.md, flexShrink: 0 };

// =============================================================================
// Viewer states
// =============================================================================

type ViewerState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly session: PdfRenderSession }
  | { readonly status: "error"; readonly message: string };

type PageState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "loaded"; readonly page: PdfPage }
  | { readonly status: "error"; readonly message: string };

// =============================================================================
// Component
// =============================================================================

/**
 * PDF Viewer component that loads and displays PDF files.
 *
 * Creates a PdfRenderSession on initial load, which performs the expensive
 * one-time work (PDF structure load + font extraction). Individual pages
 * are then parsed and built on demand via the session, with LRU caching.
 */
export function PdfViewer({ data, className }: PdfViewerProps): ReactNode {
  const [state, setState] = useState<ViewerState>({ status: "idle" });
  const [pageState, setPageState] = useState<PageState>({ status: "idle" });

  const totalPages = state.status === "ready" ? state.session.pageCount : 0;
  const nav = useItemNavigation({ totalItems: Math.max(1, totalPages) });

  // Reset to idle when data changes so session can be (re-)created.
  useEffect(() => {
    setState((prev) => {
      // When data arrives (or changes), reset to idle so the session-creation
      // effect below can pick it up. When data becomes null, also reset.
      if (prev.status === "idle") { return prev; }
      return { status: "idle" };
    });
  }, [data]);

  // Create session: loads PDF structure and extracts fonts once.
  useEffect(() => {
    if (state.status !== "idle") { return; }
    if (!data) {
      // No data yet — stay idle and wait for data to arrive.
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    createPdfRenderSession(data)
      .then((session) => {
        if (cancelled) { return; }
        setState({ status: "ready", session });
      })
      .catch((err) => {
        if (cancelled) { return; }
        const message = err instanceof Error ? err.message : String(err);
        console.error("[PdfViewer] Failed to create render session:", err);
        setState({ status: "error", message });
      });

    return () => {
      cancelled = true;
    };
  }, [state.status, data]);

  // Dispose session on unmount.
  useEffect(() => {
    if (state.status !== "ready") { return; }
    return () => { state.session.dispose(); };
  }, [state]);

  // Build the current page on demand.
  const currentPageNumber = nav.currentNumber; // 1-based

  useEffect(() => {
    if (state.status !== "ready") { return; }
    if (currentPageNumber < 1 || currentPageNumber > state.session.pageCount) { return; }

    let cancelled = false;
    setPageState({ status: "loading" });

    state.session.buildPage(currentPageNumber)
      .then((page) => {
        if (cancelled) { return; }
        setPageState({ status: "loaded", page });
      })
      .catch((err) => {
        if (cancelled) { return; }
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[PdfViewer] Failed to build page ${currentPageNumber}:`, err);
        setPageState({ status: "error", message });
      });

    return () => { cancelled = true; };
  }, [state, currentPageNumber]);

  // Image cache: subscribe to session's cache for deferred-encode re-renders.
  const sessionImageCache = state.status === "ready" ? state.session.imageCache : undefined;
  const { imageUrlResolver } = usePdfImageCache(sessionImageCache);

  const fontProvider = state.status === "ready" ? state.session.fontProvider : undefined;

  return (
    <ViewerContainer className={className}>
      {state.status === "loading" && <div style={statusStyle}>Loading PDF...</div>}

      {state.status === "error" && (
        <div style={errorStyle}>Error: {state.message}</div>
      )}

      {state.status === "ready" && (
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
            <PageRenderer pageState={pageState} fontProvider={fontProvider} imageUrlResolver={imageUrlResolver} />
          </ViewerContent>
        </>
      )}
    </ViewerContainer>
  );
}

// =============================================================================
// Page renderer
// =============================================================================

type PageRendererProps = {
  readonly pageState: PageState;
  readonly fontProvider: FontProvider | undefined;
  readonly imageUrlResolver: PdfImageUrlResolver | undefined;
};

const PageRenderer = memo(function PageRenderer({ pageState, fontProvider, imageUrlResolver }: PageRendererProps): ReactNode {
  const svgJsx = useMemo(() => {
    if (pageState.status !== "loaded" || !fontProvider) { return null; }
    const svgNode = renderPdfPageToSvgNode(pageState.page, { fontProvider, imageUrlResolver });
    return svgElementToJsx(svgNode);
  }, [pageState, fontProvider, imageUrlResolver]);

  if (pageState.status === "idle" || pageState.status === "loading") {
    return <div style={statusStyle}>Loading page...</div>;
  }

  if (pageState.status === "error") {
    return <div style={errorStyle}>Error: {pageState.message}</div>;
  }

  return (
    <div style={pageContainerStyle}>
      {svgJsx}
    </div>
  );
});
