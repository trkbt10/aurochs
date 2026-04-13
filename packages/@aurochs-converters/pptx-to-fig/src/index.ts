/**
 * @file @aurochs-converters/pptx-to-fig - PPTX to Fig converter
 *
 * Converts PPTX presentations to Figma .fig design documents.
 * Each slide becomes a page in the design document.
 */

import type { ConvertResult, OnProgress } from "@aurochs-converters/core";
import type { PresentationDocument } from "@aurochs-office/pptx/app/presentation-document";
import type { FigDesignDocument } from "@aurochs/fig/domain";
import { convertDocument } from "./converter/page";

/** Options for PPTX to Fig conversion */
export type PptxToFigOptions = {
  /** Callback for progress updates */
  readonly onProgress?: OnProgress;
};

/**
 * Convert a PresentationDocument to a FigDesignDocument.
 *
 * Each slide becomes a page. Shapes, text, images, and effects are
 * converted to their Figma equivalents where possible.
 */
export async function convert(
  input: PresentationDocument,
  options?: PptxToFigOptions,
): Promise<ConvertResult<FigDesignDocument>> {
  options?.onProgress?.({ current: 0, total: input.slides.length, phase: "converting" });

  const document = convertDocument(input);

  options?.onProgress?.({ current: input.slides.length, total: input.slides.length, phase: "converting" });

  return { data: document };
}

export { convertText, convertGeometry, convertShape, convertShapes, convertDocument } from "./converter";
