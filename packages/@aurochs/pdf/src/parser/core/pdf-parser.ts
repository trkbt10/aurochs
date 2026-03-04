/**
 * @file Main PDF parser
 *
 * Native implementation (no pdf-lib).
 */

import type { PdfDocument } from "../../domain";
import { loadNativePdfDocumentForParser } from "./native-load";
import {
  buildPdfDocumentFromContext,
  createPdfBuildContext,
  parsePdfNative,
  parsePdfSourceNative,
  type PdfBuildContext as NativePdfBuildContext,
  type PdfBuildOptions as NativePdfBuildOptions,
  type PdfParseOptions as NativePdfParseOptions,
  type PdfParsedDocument as NativePdfParsedDocument,
  type PdfParsedPage as NativePdfParsedPage,
  type PdfParserOptions as NativePdfParserOptions,
} from "./pdf-parser.native";

export type PdfParserOptions = NativePdfParserOptions;
export type PdfParseOptions = NativePdfParseOptions;
export type PdfBuildOptions = NativePdfBuildOptions;
export type PdfParsedPage = NativePdfParsedPage;
export type PdfParsedDocument = NativePdfParsedDocument;
export type PdfBuildContext = NativePdfBuildContext;











/** Parse a PDF into the internal document model. */
export async function parsePdf(
  data: Uint8Array | ArrayBuffer,
  options: PdfParserOptions = {},
): Promise<PdfDocument> {
  return await parsePdfNative(data, options);
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

/**
 * Builder stage: construct the final PdfDocument from an explicit build context.
 */
export function buildPdfFromContext(context: PdfBuildContext): PdfDocument {
  return buildPdfDocumentFromContext(context);
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
  savePdfDocumentAsJson,
  loadPdfDocumentFromJson,
  buildAndSavePdfContextAsJson,
} from "./pdf-context-rewrite";











/** Get the total number of pages in a PDF. */
export async function getPdfPageCount(data: Uint8Array | ArrayBuffer): Promise<number> {
  const pdfDoc = await loadNativePdfDocumentForParser(data, {
    purpose: "inspect",
    encryption: { mode: "ignore" },
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
    encryption: { mode: "ignore" },
    updateMetadata: false,
  });

  const pages = pdfDoc.getPages();
  if (pageNumber < 1 || pageNumber > pages.length) {return null;}
  return pages[pageNumber - 1]!.getSize();
}
