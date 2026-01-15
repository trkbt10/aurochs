/**
 * @file Main PDF parser
 *
 * Native implementation (no pdf-lib).
 */

import type { PdfDocument } from "../domain";
import { loadNativePdfDocumentForParser } from "./native-load";
import { parsePdfNative, type PdfParserOptions as NativePdfParserOptions } from "./pdf-parser.native";

export type PdfParserOptions = NativePdfParserOptions;

export async function parsePdf(
  data: Uint8Array | ArrayBuffer,
  options: PdfParserOptions = {},
): Promise<PdfDocument> {
  return await parsePdfNative(data, options);
}

export async function getPdfPageCount(data: Uint8Array | ArrayBuffer): Promise<number> {
  const pdfDoc = await loadNativePdfDocumentForParser(data, {
    purpose: "inspect",
    encryption: { mode: "ignore" },
    updateMetadata: false,
  });
  return pdfDoc.getPageCount();
}

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
  if (pageNumber < 1 || pageNumber > pages.length) return null;
  return pages[pageNumber - 1]!.getSize();
}

