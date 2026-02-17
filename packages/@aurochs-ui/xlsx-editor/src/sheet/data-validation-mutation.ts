/**
 * @file Data Validation mutation operations
 *
 * Operations for managing data validation rules on worksheets.
 */

import type { XlsxWorkbook, XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import type { XlsxDataValidation } from "@aurochs-office/xlsx/domain/data-validation";
import type { CellRange } from "@aurochs-office/xlsx/domain/cell/address";

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

function rangesOverlap(a: CellRange, b: CellRange): boolean {
  return !(
    a.end.row < b.start.row ||
    a.start.row > b.end.row ||
    a.end.col < b.start.col ||
    a.start.col > b.end.col
  );
}

/**
 * Add or update a data validation rule.
 * If a validation already exists for the same range, it will be replaced.
 */
export function setDataValidation(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  validation: XlsxDataValidation,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  const sheet = workbook.sheets[sheetIndex];
  const existing = sheet.dataValidations ?? [];

  // Find if there's an existing validation that overlaps with any of the new ranges
  const newValidations = existing.filter((v) => {
    // Keep validations that don't overlap with any of the new ranges
    return !validation.ranges.some((newRange) =>
      v.ranges.some((existingRange) => rangesOverlap(newRange, existingRange)),
    );
  });

  // Add the new validation
  newValidations.push(validation);

  return updateSheet(workbook, sheetIndex, { dataValidations: newValidations });
}

/**
 * Delete data validation rules for a specific cell range.
 */
export function deleteDataValidation(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  range: CellRange,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  const sheet = workbook.sheets[sheetIndex];
  const existing = sheet.dataValidations ?? [];

  // Remove validations that overlap with the specified range
  const newValidations = existing.filter((v) =>
    !v.ranges.some((r) => rangesOverlap(r, range)),
  );

  if (newValidations.length === 0) {
    return updateSheet(workbook, sheetIndex, { dataValidations: undefined });
  }

  return updateSheet(workbook, sheetIndex, { dataValidations: newValidations });
}

/**
 * Clear all data validations from a sheet
 */
export function clearDataValidations(
  workbook: XlsxWorkbook,
  sheetIndex: number,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  return updateSheet(workbook, sheetIndex, { dataValidations: undefined });
}
