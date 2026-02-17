/**
 * @file Protection mutation operations
 *
 * Operations for workbook and sheet protection settings.
 */

import type { XlsxWorkbook, XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import type { XlsxWorkbookProtection, XlsxSheetProtection } from "@aurochs-office/xlsx/domain/protection";

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
 * Set workbook protection settings
 */
export function setWorkbookProtection(
  workbook: XlsxWorkbook,
  protection: XlsxWorkbookProtection | undefined,
): XlsxWorkbook {
  return { ...workbook, workbookProtection: protection };
}

/**
 * Set sheet protection settings
 */
export function setSheetProtection(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  protection: XlsxSheetProtection | undefined,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  return updateSheet(workbook, sheetIndex, { sheetProtection: protection });
}
