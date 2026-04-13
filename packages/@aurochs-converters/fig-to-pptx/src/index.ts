/**
 * @file @aurochs-converters/fig-to-pptx - Fig to PPTX converter
 *
 * Converts Figma .fig design documents to PPTX presentations.
 * Each page in the Fig document becomes a slide in the presentation.
 */

import type { ConvertResult, OnProgress } from "@aurochs-converters/core";
import type { PresentationDocument } from "@aurochs-office/pptx/app/presentation-document";
import type { FigDesignDocument } from "@aurochs/fig/domain";
import { convertDocument, type FigToPptxSlideOptions } from "./converter/slide";

export type { FigToPptxSlideOptions } from "./converter/slide";

/** Options for Fig to PPTX conversion */
export type FigToPptxOptions = FigToPptxSlideOptions & {
  /** Callback for progress updates */
  readonly onProgress?: OnProgress;
};

/**
 * Convert a FigDesignDocument to a PPTX PresentationDocument.
 *
 * Each page becomes a slide. Content is scaled to fit within the
 * slide dimensions (default 960×540, widescreen 16:9).
 */
export async function convert(
  input: FigDesignDocument,
  options?: FigToPptxOptions,
): Promise<ConvertResult<PresentationDocument>> {
  options?.onProgress?.({ current: 0, total: input.pages.length, phase: "converting" });

  const document = convertDocument(input, options);

  options?.onProgress?.({ current: input.pages.length, total: input.pages.length, phase: "converting" });

  return { data: document };
}

export { convertText, convertGeometry, convertNode, convertNodes, convertDocument } from "./converter";
