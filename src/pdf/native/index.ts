/**
 * @file src/pdf/native/index.ts
 */

export { loadNativePdfDocument, createNativePdfDocument } from "./document";
export type { NativePdfDocument, NativePdfPage } from "./document";
export type { PdfObject, PdfDict, PdfArray, PdfStream, PdfRef, PdfName, PdfString, PdfBool, PdfNumber } from "./types";
