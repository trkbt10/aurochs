/**
 * @file PDF → PPTX conversion API
 *
 * This package provides a high-level importer that converts PDF documents into PPTX structures.
 */

export type { PageStats, PdfImportOptions, PdfImportProgress, PdfImportResult, PdfImportErrorCode } from "./importer/pdf-importer";
export { PdfImportError, createDefaultColorContextForPdf, createEmptyColorContext, importPdf, importPdfFromFile, importPdfFromUrl } from "./importer/pdf-importer";

export { convertTextToShape, createFitContext } from "./converter";
