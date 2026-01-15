/**
 * @file Embedded font extractor (native PDF loader)
 *
 * Extracts embedded font programs from PDF documents using the native PDF
 * object model (no pdf-lib dependency).
 */

import type { NativePdfDocument, NativePdfPage } from "../../native";
import type { EmbeddedFont, EmbeddedFontMetrics, FontFormat } from "./embedded-font";
import { extractEmbeddedFontsFromNativePages } from "./font-extractor.native";

export type { EmbeddedFont, EmbeddedFontMetrics, FontFormat } from "./embedded-font";

export function extractEmbeddedFontsFromPages(pages: readonly NativePdfPage[]): EmbeddedFont[] {
  if (!pages) throw new Error("pages is required");
  return extractEmbeddedFontsFromNativePages(pages);
}

export function extractEmbeddedFonts(pdfDoc: NativePdfDocument): EmbeddedFont[] {
  if (!pdfDoc) throw new Error("pdfDoc is required");
  return extractEmbeddedFontsFromNativePages(pdfDoc.getPages());
}

