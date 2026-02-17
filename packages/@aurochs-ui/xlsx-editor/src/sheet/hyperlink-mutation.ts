/**
 * @file Hyperlink mutation operations
 *
 * Operations for adding, updating, and deleting cell hyperlinks.
 */

import type { XlsxWorkbook, XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import type { XlsxHyperlink } from "@aurochs-office/xlsx/domain/hyperlink";
import type { CellAddress, CellRange } from "@aurochs-office/xlsx/domain/cell/address";

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

function rangeContainsCell(range: CellRange, cell: CellAddress): boolean {
  return (
    cell.row >= range.start.row &&
    cell.row <= range.end.row &&
    cell.col >= range.start.col &&
    cell.col <= range.end.col
  );
}

function isSameRange(a: CellRange, b: CellRange): boolean {
  return (
    a.start.row === b.start.row &&
    a.start.col === b.start.col &&
    a.end.row === b.end.row &&
    a.end.col === b.end.col
  );
}

/**
 * Set or update a hyperlink for a cell/range
 */
export function setHyperlink(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  hyperlink: XlsxHyperlink,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  const sheet = workbook.sheets[sheetIndex];
  const existing = sheet.hyperlinks ?? [];

  // Check if hyperlink already exists for this range
  const existingIndex = existing.findIndex((h) => isSameRange(h.ref, hyperlink.ref));

  let newHyperlinks: readonly XlsxHyperlink[];
  if (existingIndex >= 0) {
    // Update existing hyperlink
    newHyperlinks = existing.map((h, idx) => (idx === existingIndex ? hyperlink : h));
  } else {
    // Add new hyperlink
    newHyperlinks = [...existing, hyperlink];
  }

  return updateSheet(workbook, sheetIndex, { hyperlinks: newHyperlinks });
}

/**
 * Delete a hyperlink for a cell
 */
export function deleteHyperlink(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  address: CellAddress,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  const sheet = workbook.sheets[sheetIndex];
  const existing = sheet.hyperlinks ?? [];

  // Find hyperlink that contains this cell
  const newHyperlinks = existing.filter((h) => !rangeContainsCell(h.ref, address));

  // If no hyperlinks remain, set to undefined
  if (newHyperlinks.length === 0) {
    return updateSheet(workbook, sheetIndex, { hyperlinks: undefined });
  }

  return updateSheet(workbook, sheetIndex, { hyperlinks: newHyperlinks });
}
