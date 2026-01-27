/**
 * @file Worksheet update utilities
 *
 * Common utilities for updating worksheets within a workbook.
 * Extracted to eliminate code duplication across reducer handlers.
 */

import type { XlsxWorkbook, XlsxWorksheet } from "@oxen/xlsx/domain/workbook";

/**
 * Update a worksheet in a workbook using an updater function.
 * Returns the original workbook if the sheet doesn't exist or isn't changed.
 */
export function updateWorksheetInWorkbook(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  updater: (worksheet: XlsxWorksheet) => XlsxWorksheet,
): XlsxWorkbook {
  const worksheet = workbook.sheets[sheetIndex];
  if (!worksheet) {
    return workbook;
  }
  const updatedWorksheet = updater(worksheet);
  if (updatedWorksheet === worksheet) {
    return workbook;
  }
  const updatedSheets = [...workbook.sheets];
  updatedSheets[sheetIndex] = updatedWorksheet;
  return { ...workbook, sheets: updatedSheets };
}

/**
 * Replace a worksheet in a workbook with a new worksheet.
 * Returns the original workbook if the sheet index is out of bounds.
 */
export function replaceWorksheetInWorkbook(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  worksheet: XlsxWorksheet,
): XlsxWorkbook {
  if (sheetIndex < 0 || sheetIndex >= workbook.sheets.length) {
    return workbook;
  }
  const sheets = [...workbook.sheets];
  sheets[sheetIndex] = worksheet;
  return { ...workbook, sheets };
}
