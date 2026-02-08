/**
 * @file @aurochs-converters/ppt-to-pptx - PPT to PPTX converter
 *
 * Converts PPT (PowerPoint 97-2003) presentations to PPTX format.
 *
 * ## Usage
 *
 * For direct parser access:
 * ```typescript
 * import { parsePpt } from "@aurochs-office/ppt";
 * ```
 *
 * For the standard converter interface:
 * ```typescript
 * import { convert } from "@aurochs-converters/ppt-to-pptx";
 * const result = convert(pptBytes);
 * ```
 */

import type { ConvertResult, OnProgress } from "@aurochs-converters/core";
import { parsePptWithReport, type ParsePptResult } from "@aurochs-office/ppt";
import type { ZipPackage } from "@aurochs/zip";

/** Options for PPT to PPTX conversion */
export type PptToPptxOptions = {
  /** Callback for progress updates */
  readonly onProgress?: OnProgress;
};

/**
 * Convert a PPT file (as bytes) to PPTX format using the standard converter interface.
 */
export function convert(input: Uint8Array, options?: PptToPptxOptions): ConvertResult<ZipPackage> {
  options?.onProgress?.({ current: 0, total: 1, phase: "converting" });

  const result: ParsePptResult = parsePptWithReport(input, { mode: "lenient" });

  options?.onProgress?.({ current: 1, total: 1, phase: "done" });

  return {
    data: result.pkg,
    warnings: result.warnings.map((w) => ({
      code: w.code,
      message: w.message,
      where: w.where,
      ...(w.meta ? { meta: w.meta as Record<string, unknown> } : {}),
    })),
  };
}
