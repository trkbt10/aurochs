/**
 * @file src/pdf/parser/native-load.ts
 */

import { loadNativePdfDocument, type NativePdfDocument } from "../../native";
import { PdfLoadError, type PdfLoadErrorCode, type PdfLoadOptions } from "./pdf-load-error";

function detectPdfLoadErrorCode(error: unknown): PdfLoadErrorCode {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("encrypted") || lower.includes("password")) {
    return "ENCRYPTED_PDF";
  }

  if (
    lower.includes("no pdf header") ||
    lower.includes("failed to parse") ||
    lower.includes("invalid pdf") ||
    lower.includes("startxref not found") ||
    lower.includes("startxref offset missing")
  ) {
    return "INVALID_PDF";
  }

  return "PARSE_ERROR";
}











/** Load a PDF as a native document for parsing/inspection. */
export async function loadNativePdfDocumentForParser(
  data: Uint8Array | ArrayBuffer,
  options: PdfLoadOptions,
): Promise<NativePdfDocument> {
  if (!data) {throw new Error("data is required");}
  if (!options) {throw new Error("options is required");}
  if (!options.purpose) {throw new Error("options.purpose is required");}
  if (!options.encryption) {throw new Error("options.encryption is required");}
  if (typeof options.updateMetadata !== "boolean") {throw new Error("options.updateMetadata must be a boolean");}

  try {
    const doc = loadNativePdfDocument(data, {
      encryption: options.encryption,
    });
    return doc;
  } catch (error) {
    throw new PdfLoadError(
      error instanceof Error ? error.message : String(error),
      detectPdfLoadErrorCode(error),
      error,
    );
  }
}
