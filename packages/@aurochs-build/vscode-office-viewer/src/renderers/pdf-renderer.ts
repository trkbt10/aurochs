/**
 * @file PDF Renderer
 *
 * Provides an incremental rendering session for PDF files via PdfRenderSession.
 * Pages are rendered on demand rather than all at once.
 */

import { createPdfRenderSession, type PdfRenderSession } from "@aurochs-renderer/pdf";
import { dataUrlStrategy } from "@aurochs-renderer/pdf";
import { serializeElement } from "@aurochs/xml";

/**
 * Wraps a PdfRenderSession for use by the VS Code extension provider.
 * Manages the session lifecycle and provides page-at-a-time rendering.
 */
export type PdfViewerSession = {
  readonly pageCount: number;
  /** Render a single page to SVG string. pageNumber is 1-based. */
  readonly renderPage: (pageNumber: number) => Promise<string>;
  readonly dispose: () => void;
};

/**
 * Create an incremental rendering session for a PDF.
 * Pages are rendered on demand with an internal LRU cache.
 */
export async function createPdfViewerSession(data: Uint8Array): Promise<PdfViewerSession> {
  const session: PdfRenderSession = await createPdfRenderSession(data, {
    // Use data URL strategy since this runs in Node (extension host), not browser.
    imageStrategy: dataUrlStrategy(),
    // Larger cache since users browse back and forth.
    pageCacheSize: 16,
  });

  return {
    pageCount: session.pageCount,
    async renderPage(pageNumber: number): Promise<string> {
      const node = await session.renderPageToSvgNode(pageNumber);
      return serializeElement(node);
    },
    dispose(): void {
      session.dispose();
    },
  };
}
