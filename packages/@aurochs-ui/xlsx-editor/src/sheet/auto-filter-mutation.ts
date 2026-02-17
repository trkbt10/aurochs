/**
 * @file Auto Filter mutation operations
 *
 * Operations for managing auto filter on worksheets.
 */

import type { XlsxWorkbook, XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import type { XlsxAutoFilter } from "@aurochs-office/xlsx/domain/auto-filter";

function assertValidSheetIndex(workbook: XlsxWorkbook, sheetIndex: number): void {
  if (!Number.isInteger(sheetIndex)) {
    throw new Error("sheetIndex must be an integer");
  }
  if (sheetIndex < 0 || sheetIndex >= workbook.sheets.length) {
    throw new Error(`sheetIndex out of range: ${sheetIndex}`);
  }
}

function updateSheet(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  update: Partial<XlsxWorksheet>,
): XlsxWorkbook {
  const sheets = workbook.sheets.map((sheet, idx) =>
    idx === sheetIndex ? { ...sheet, ...update } : sheet,
  );
  return { ...workbook, sheets };
}

/**
 * Set auto filter on a sheet
 */
export function setAutoFilter(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  autoFilter: XlsxAutoFilter | undefined,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  return updateSheet(workbook, sheetIndex, { autoFilter });
}

/**
 * Clear auto filter from a sheet
 */
export function clearAutoFilter(
  workbook: XlsxWorkbook,
  sheetIndex: number,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  return updateSheet(workbook, sheetIndex, { autoFilter: undefined });
}
