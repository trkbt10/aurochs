/**
 * @file @aurochs-converters/xls-to-xlsx - XLS to XLSX converter
 *
 * Converts XLS (BIFF8) workbooks to XLSX format.
 *
 * ## Usage
 *
 * For direct converter access:
 * ```typescript
 * import { convertXlsToXlsx } from "@aurochs-office/xls";
 * ```
 *
 * For the standard converter interface:
 * ```typescript
 * import { convert } from "@aurochs-converters/xls-to-xlsx";
 * const result = await convert(xlsWorkbook);
 * ```
 */

import type { ConvertResult, OnProgress } from "@aurochs-converters/core";
import type { XlsWorkbook } from "@aurochs-office/xls";
import { convertXlsToXlsx } from "@aurochs-office/xls";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";

/** Options for XLS to XLSX conversion */
export type XlsToXlsxOptions = {
  /** Callback for progress updates */
  readonly onProgress?: OnProgress;
};

/**
 * Convert an XLS workbook to XLSX format using the standard converter interface.
 */
export function convert(input: XlsWorkbook, options?: XlsToXlsxOptions): ConvertResult<XlsxWorkbook> {
  options?.onProgress?.({ current: 0, total: 1, phase: "converting" });

  const data = convertXlsToXlsx(input);

  options?.onProgress?.({ current: 1, total: 1, phase: "done" });

  return { data };
}
