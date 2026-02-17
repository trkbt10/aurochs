/**
 * @file Page setup mutation operations
 *
 * Operations for updating sheet print and page configuration.
 */

import type { XlsxWorkbook, XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import type { XlsxPageSetup, XlsxPageMargins, XlsxHeaderFooter, XlsxPrintOptions } from "@aurochs-office/xlsx/domain/page-setup";
import type { XlsxPageBreaks } from "@aurochs-office/xlsx/domain/page-breaks";

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
 * Set page setup configuration for a sheet
 */
export function setPageSetup(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  pageSetup: XlsxPageSetup | undefined,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  return updateSheet(workbook, sheetIndex, { pageSetup });
}

/**
 * Set page margins for a sheet
 */
export function setPageMargins(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  pageMargins: XlsxPageMargins | undefined,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  return updateSheet(workbook, sheetIndex, { pageMargins });
}

/**
 * Set header/footer for a sheet
 */
export function setHeaderFooter(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  headerFooter: XlsxHeaderFooter | undefined,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  return updateSheet(workbook, sheetIndex, { headerFooter });
}

/**
 * Set print options for a sheet
 */
export function setPrintOptions(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  printOptions: XlsxPrintOptions | undefined,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  return updateSheet(workbook, sheetIndex, { printOptions });
}

/**
 * Set page breaks for a sheet
 */
export function setPageBreaks(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  pageBreaks: XlsxPageBreaks | undefined,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  return updateSheet(workbook, sheetIndex, { pageBreaks });
}
