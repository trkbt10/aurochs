/**
 * @file Conditional Formatting mutation operations
 *
 * Operations for managing conditional formatting rules on worksheets.
 */

import type { XlsxWorkbook, XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import type { XlsxConditionalFormatting } from "@aurochs-office/xlsx/domain/conditional-formatting";
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
 * Add a conditional formatting rule.
 */
export function addConditionalFormatting(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  formatting: XlsxConditionalFormatting,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  const sheet = workbook.sheets[sheetIndex];
  const existing = sheet.conditionalFormattings ?? [];
  return updateSheet(workbook, sheetIndex, {
    conditionalFormattings: [...existing, formatting],
  });
}

/**
 * Delete conditional formatting rules for a specific cell range.
 */
export function deleteConditionalFormatting(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  range: CellRange,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  const sheet = workbook.sheets[sheetIndex];
  const existing = sheet.conditionalFormattings ?? [];

  // Remove formattings that overlap with the specified range
  const newFormattings = existing.filter(
    (cf) => !cf.ranges.some((r) => rangesOverlap(r, range)),
  );

  if (newFormattings.length === 0) {
    return updateSheet(workbook, sheetIndex, { conditionalFormattings: undefined });
  }

  return updateSheet(workbook, sheetIndex, { conditionalFormattings: newFormattings });
}

/**
 * Clear all conditional formatting from a sheet
 */
export function clearConditionalFormattings(
  workbook: XlsxWorkbook,
  sheetIndex: number,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  return updateSheet(workbook, sheetIndex, { conditionalFormattings: undefined });
}
