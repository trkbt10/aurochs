/**
 * @file Main PDF parser
 *
 * Parser/context API for native PDF parsing (no pdf-lib).
 */

import type { PdfDocument } from "../../domain";
import { buildPdf } from "@aurochs-builder/pdf";
import { loadNativePdfDocumentForParser } from "./native-load";
import {
  createPdfBuildContext,
  parsePdfSourceNative,
  type PdfBuildContext,
  type PdfBuildOptions,
  type PdfParseOptions,
  type PdfParsedDocument,
} from "./pdf-parser.native";

export type { PdfParseOptions, PdfBuildOptions, PdfParsedPage, PdfParsedDocument, PdfBuildContext } from "./pdf-parser.native";
export type PdfParserOptions = PdfParseOptions & PdfBuildOptions;











/** @deprecated Use `@aurochs-builder/pdf` (`buildPdf`) for parser->context->builder pipeline execution. */
export async function parsePdf(
  data: Uint8Array | ArrayBuffer,
  options: PdfParserOptions = {},
): Promise<PdfDocument> {
  return await buildPdf({
    data,
    parseOptions: options,
    buildOptions: options,
  });
}

/**
 * Parser stage: parse raw PDF bytes into low-level parsed source data.
 *
 * This stage keeps intermediate parsed elements (before final document element building).
 */
export async function parsePdfSource(
  data: Uint8Array | ArrayBuffer,
  options: PdfParseOptions = {},
): Promise<PdfParsedDocument> {
  return await parsePdfSourceNative(data, options);
}

/**
 * Context stage: pair parsed source with explicit builder options.
 */
export function createPdfContext(
  parsedDocument: PdfParsedDocument,
  options: PdfBuildOptions = {},
): PdfBuildContext {
  return createPdfBuildContext(parsedDocument, options);
}

export type {
  ParsedElementRewriteArgs,
  ExtractedImageRewriteArgs,
  ParsedElementRewriter,
  ExtractedImageRewriter,
  PdfContextRewriter,
} from "./pdf-context-rewrite";
export {
  rewritePdfContext,
  serializePdfDocumentAsJson,
  deserializePdfDocumentFromJson,
} from "./pdf-context-rewrite";











/** Get the total number of pages in a PDF. */
export async function getPdfPageCount(data: Uint8Array | ArrayBuffer): Promise<number> {
  const pdfDoc = await loadNativePdfDocumentForParser(data, {
    purpose: "inspect",
    updateMetadata: false,
  });
  return pdfDoc.getPageCount();
}











/** Get width/height for a single page in a PDF (1-based pageNumber). */
export async function getPdfPageDimensions(
  data: Uint8Array | ArrayBuffer,
  pageNumber: number = 1,
): Promise<{ width: number; height: number } | null> {
  const pdfDoc = await loadNativePdfDocumentForParser(data, {
    purpose: "inspect",
    updateMetadata: false,
  });

  const pages = pdfDoc.getPages();
  if (pageNumber < 1 || pageNumber > pages.length) {return null;}
  return pages[pageNumber - 1]!.getSize();
}
