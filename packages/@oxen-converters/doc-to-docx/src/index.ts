/**
 * @file @oxen-converters/doc-to-docx - DOC to DOCX converter
 *
 * Converts DOC (Word 97-2003) documents to DOCX format.
 *
 * ## Usage
 *
 * For direct parser access:
 * ```typescript
 * import { parseDoc } from "@oxen-office/doc";
 * ```
 *
 * For the standard converter interface:
 * ```typescript
 * import { convert } from "@oxen-converters/doc-to-docx";
 * const result = await convert(docBytes);
 * ```
 */

import type { ConvertResult, OnProgress } from "@oxen-converters/core";
import { parseDocWithReport, convertDocToDocx, type ParseDocResult } from "@oxen-office/doc";
import { exportDocx } from "@oxen-office/docx/exporter";

/** Options for DOC to DOCX conversion */
export type DocToDocxOptions = {
  /** Callback for progress updates */
  readonly onProgress?: OnProgress;
};

/**
 * Convert a DOC file (as bytes) to DOCX format using the standard converter interface.
 */
export async function convert(
  input: Uint8Array,
  options?: DocToDocxOptions,
): Promise<ConvertResult<Uint8Array>> {
  options?.onProgress?.({ current: 0, total: 2, phase: "parsing" });

  const result: ParseDocResult = parseDocWithReport(input, { mode: "lenient" });

  options?.onProgress?.({ current: 1, total: 2, phase: "converting" });

  const docxDocument = convertDocToDocx(result.document);
  const docxBytes = await exportDocx(docxDocument);

  options?.onProgress?.({ current: 2, total: 2, phase: "done" });

  return {
    data: docxBytes,
    warnings: result.warnings.map((w) => ({
      code: w.code,
      message: w.message,
      where: w.where,
      ...(w.meta ? { meta: w.meta as Record<string, unknown> } : {}),
    })),
  };
}
