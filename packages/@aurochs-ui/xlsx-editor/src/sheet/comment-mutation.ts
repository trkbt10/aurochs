/**
 * @file Comment mutation operations
 *
 * Operations for adding, updating, and deleting cell comments.
 */

import type { XlsxWorkbook, XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import type { XlsxComment } from "@aurochs-office/xlsx/domain/comment";
import type { CellAddress } from "@aurochs-office/xlsx/domain/cell/address";

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

function isSameAddress(a: CellAddress, b: CellAddress): boolean {
  return a.row === b.row && a.col === b.col;
}

/**
 * Add or update a comment for a cell
 */
export function setComment(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  comment: XlsxComment,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  const sheet = workbook.sheets[sheetIndex];
  const existing = sheet.comments ?? [];

  // Check if comment already exists for this cell
  const existingIndex = existing.findIndex((c) => isSameAddress(c.address, comment.address));

  let newComments: readonly XlsxComment[];
  if (existingIndex >= 0) {
    // Update existing comment
    newComments = existing.map((c, idx) => (idx === existingIndex ? comment : c));
  } else {
    // Add new comment
    newComments = [...existing, comment];
  }

  return updateSheet(workbook, sheetIndex, { comments: newComments });
}

/**
 * Delete a comment from a cell
 */
export function deleteComment(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  address: CellAddress,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  const sheet = workbook.sheets[sheetIndex];
  const existing = sheet.comments ?? [];

  const newComments = existing.filter((c) => !isSameAddress(c.address, address));

  // If no comments remain, set to undefined
  if (newComments.length === 0) {
    return updateSheet(workbook, sheetIndex, { comments: undefined });
  }

  return updateSheet(workbook, sheetIndex, { comments: newComments });
}
