/**
 * @file PDF Renderer
 *
 * Converts a PDF file buffer into SVG page strings for webview display.
 */

import { renderPdfSourceToSvgs } from "@aurochs-renderer/pdf";

export type PdfRenderResult = {
  readonly pages: readonly string[];
};

/**
 * Render a PDF file to SVG pages.
 */
export async function renderPdfPages(data: Uint8Array): Promise<PdfRenderResult> {
  const pages = await renderPdfSourceToSvgs({
    data,
  });

  return { pages };
}
