/**
 * @file Formula reference insertion
 *
 * Logic for determining when a cell click should insert a reference into the
 * formula being edited, and for building the reference text (A1, A1:B5, Sheet2!A1).
 */

import type { CellAddress, CellRange } from "@aurochs-office/xlsx/domain/cell/address";
import { indexToColumnLetter } from "@aurochs-office/xlsx/domain/cell/address";
import type { ColIndex } from "@aurochs-office/xlsx/domain/types";

/**
 * Determine whether a cell click at the current caret position should insert
 * a reference (as opposed to committing the formula).
 *
 * A reference can be inserted after:
 * - The `=` sign
 * - Operators: `+`, `-`, `*`, `/`, `^`, `&`, `=`, `<`, `>`, `<=`, `>=`, `<>`
 * - Opening parenthesis `(`
 * - Comma `,`
 * - Semicolon `;`
 *
 * A reference should NOT be inserted after:
 * - Cell references, numbers, closing parenthesis `)` — these suggest the user
 *   is done with this sub-expression and clicking should commit.
 */
export function isReferenceInsertionPoint(text: string, caretOffset: number): boolean {
  if (caretOffset <= 0) {
    return false;
  }

  // Scan backward from caret, skipping whitespace
  // eslint-disable-next-line no-restricted-syntax -- decremented in loop
  let pos = caretOffset - 1;
  while (pos >= 0 && /\s/.test(text[pos])) {
    pos -= 1;
  }

  if (pos < 0) {
    // Only whitespace before caret — no insertion context
    return false;
  }

  const ch = text[pos];

  // After `=` (formula start) → insert
  if (ch === "=") {
    return true;
  }

  // After operators → insert
  if ("+-*/^&".includes(ch)) {
    return true;
  }

  // After comparison operators
  if (ch === ">") {
    return true; // handles `>` and also `<>` (the `>` at the end)
  }
  if (ch === "<") {
    return true;
  }

  // After opening paren → insert
  if (ch === "(") {
    return true;
  }

  // After comma or semicolon → insert
  if (ch === "," || ch === ";") {
    return true;
  }

  // After closing paren, digits, letters (reference/identifier end) → do NOT insert
  return false;
}

/**
 * Build the reference text for a cell or range, optionally qualified with a sheet name.
 *
 * @param range The cell or range to reference
 * @param currentSheetName Name of the sheet being edited
 * @param targetSheetName Name of the sheet containing the referenced cell (undefined = same sheet)
 */
export function buildReferenceText(
  range: CellRange,
  currentSheetName: string,
  targetSheetName?: string,
): string {
  const isSameSheet = targetSheetName === undefined || targetSheetName === currentSheetName;
  const prefix = isSameSheet ? "" : formatSheetPrefix(targetSheetName);

  const startText = formatCellAddress(range.start);
  const endText = formatCellAddress(range.end);

  // Single cell (start === end)
  if (
    (range.start.col as number) === (range.end.col as number) &&
    (range.start.row as number) === (range.end.row as number)
  ) {
    return `${prefix}${startText}`;
  }

  return `${prefix}${startText}:${endText}`;
}

function formatCellAddress(addr: CellAddress): string {
  const col = indexToColumnLetter(addr.col as ColIndex);
  const row = String(addr.row as number);
  return `${col}${row}`;
}

function formatSheetPrefix(sheetName: string): string {
  // Sheet names with spaces, special characters, or starting with a digit need quoting
  if (/[^A-Za-z0-9_]/.test(sheetName) || /^\d/.test(sheetName)) {
    return `'${sheetName.replace(/'/g, "''")}'!`;
  }
  return `${sheetName}!`;
}
