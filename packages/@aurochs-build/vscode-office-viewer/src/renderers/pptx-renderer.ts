/**
 * @file PPTX Renderer
 *
 * Converts a PPTX file buffer into an array of SVG slide strings
 * using the existing rendering pipeline.
 */

import { openPresentation, type PresentationFile } from "@aurochs-office/pptx";
import { createZipAdapter } from "@aurochs-office/pptx/domain";
import { loadPptxBundleFromBuffer } from "@aurochs-office/pptx/app/pptx-loader";
import { createRenderContext } from "@aurochs-renderer/pptx";
import { renderSlideSvgIntegrated } from "@aurochs-renderer/pptx/slide-render";

export type PptxRenderResult = {
  readonly slides: readonly string[];
  readonly width: number;
  readonly height: number;
};

/**
 * Render all slides of a PPTX file to SVG strings.
 */
export async function renderPptxSlides(data: Uint8Array): Promise<PptxRenderResult> {
  const { presentationFile } = await loadPptxBundleFromBuffer(data);
  return renderPptxSlidesFromFile(presentationFile);
}

/**
 * Render slides from a PresentationFile (used by both PPTX and PPT paths).
 */
export function renderPptxSlidesFromFile(presentationFile: PresentationFile): PptxRenderResult {
  const presentation = openPresentation(presentationFile);
  const zipFile = createZipAdapter(presentationFile);

  const slideIndices = Array.from({ length: presentation.count }, (_, i) => i + 1);
  const slides = slideIndices.map((i) => {
    const apiSlide = presentation.getSlide(i);
    const renderContext = createRenderContext({
      apiSlide,
      zip: zipFile,
      slideSize: presentation.size,
    });

    const result = renderSlideSvgIntegrated(apiSlide.content, renderContext.slideRenderContext, presentation.size);

    return result.svg;
  });

  return {
    slides,
    width: presentation.size.width,
    height: presentation.size.height,
  };
}
