/**
 * @file @oxen-converters/pdf-to-pptx - PDF to PPTX converter
 *
 * Converts PDF documents to PPTX presentations.
 */

import type { ConvertResult, OnProgress } from "@oxen-converters/core";
import type { PresentationDocument } from "@oxen-office/pptx/app/presentation-document";
import type { Pixels } from "@oxen-office/ooxml/domain/units";
import { importPdf } from "./importer/pdf-importer";

// Re-export all types and functions from importer
export type { PageStats, PdfImportOptions, PdfImportProgress, PdfImportResult, PdfImportErrorCode } from "./importer/pdf-importer";
export { PdfImportError, createDefaultColorContextForPdf, createEmptyColorContext, importPdf, importPdfFromFile, importPdfFromUrl } from "./importer/pdf-importer";

// Re-export converter utilities
export { convertTextToShape, createFitContext } from "./converter";

/** Options for PDF to PPTX conversion with standard converter interface */
export type PdfToPptxOptions = {
  /** Pages to import (1-based). If omitted, all pages are imported. */
  readonly pages?: readonly number[];
  /** Target slide size in pixels */
  readonly slideSize?: {
    readonly width: number;
    readonly height: number;
  };
  /** Fit mode for content */
  readonly fit?: "contain" | "cover" | "stretch";
  /** Set white background on slides */
  readonly setWhiteBackground?: boolean;
  /** Add page numbers to slides */
  readonly addPageNumbers?: boolean;
  /** Callback for progress updates */
  readonly onProgress?: OnProgress;
};

function buildSlideSize(
  slideSize: PdfToPptxOptions["slideSize"],
): { readonly width: Pixels; readonly height: Pixels } | undefined {
  if (!slideSize) {
    return undefined;
  }
  return {
    width: slideSize.width as Pixels,
    height: slideSize.height as Pixels,
  };
}

function buildProgressCallback(
  onProgress: OnProgress | undefined,
): ((progress: { currentPage: number; totalPages: number }) => void) | undefined {
  if (!onProgress) {
    return undefined;
  }
  return (progress) => {
    onProgress({
      current: progress.currentPage,
      total: progress.totalPages,
      phase: "converting",
    });
  };
}

/**
 * Convert a PDF buffer to a PPTX presentation using the standard converter interface.
 */
export async function convert(
  input: ArrayBuffer | Uint8Array,
  options?: PdfToPptxOptions,
): Promise<ConvertResult<PresentationDocument>> {
  const result = await importPdf(input, {
    pages: options?.pages,
    slideSize: buildSlideSize(options?.slideSize),
    fit: options?.fit,
    setWhiteBackground: options?.setWhiteBackground,
    addPageNumbers: options?.addPageNumbers,
    onProgress: buildProgressCallback(options?.onProgress),
  });

  return { data: result.document };
}
