/**
 * @file PDF Export API
 *
 * High-level API for exporting PdfDocument to PDF binary format.
 */

import type { PdfDocument } from "@aurochs/pdf/domain";
import {
  writePdfDocument,
  type PdfWriteOptions,
} from "@aurochs/pdf/writer";
import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * Options for exporting a PDF document.
 */
export type ExportPdfOptions = PdfWriteOptions & {
  /**
   * Optional output file path.
   * If provided, the PDF will be written to this file.
   */
  readonly outputPath?: string;
};

/**
 * Export a PdfDocument to PDF binary format.
 *
 * @param document - The document to export
 * @param options - Export options
 * @returns PDF file as Uint8Array
 *
 * @example
 * ```typescript
 * import { exportPdf } from "@aurochs-builder/pdf";
 *
 * const document = await buildPdf({ data: pdfBytes });
 * const outputBytes = await exportPdf(document);
 * ```
 */
export async function exportPdf(
  document: PdfDocument,
  options: ExportPdfOptions = {}
): Promise<Uint8Array> {
  const pdfBytes = writePdfDocument(document, options);

  // Write to file if outputPath is provided
  if (options.outputPath) {
    await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
    await fs.writeFile(options.outputPath, pdfBytes);
  }

  return pdfBytes;
}

/**
 * Export a PdfDocument to a file.
 *
 * @param document - The document to export
 * @param outputPath - Output file path
 * @param options - Write options
 *
 * @example
 * ```typescript
 * import { exportPdfToFile } from "@aurochs-builder/pdf";
 *
 * const document = await buildPdf({ data: pdfBytes });
 * await exportPdfToFile(document, "output.pdf");
 * ```
 */
export async function exportPdfToFile(
  document: PdfDocument,
  outputPath: string,
  options: PdfWriteOptions = {}
): Promise<void> {
  const pdfBytes = writePdfDocument(document, options);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, pdfBytes);
}
