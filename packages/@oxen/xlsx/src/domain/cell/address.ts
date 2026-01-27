/**
 * @file Cell Address and Range Types and Utilities
 *
 * Provides A1-style cell reference parsing, formatting, and manipulation.
 * Supports absolute references ($A$1), relative references (A1),
 * mixed references ($A1, A$1), and sheet-qualified references.
 *
 * @see ECMA-376 Part 4, Section 18.18.62 (ST_Ref)
 * @see ECMA-376 Part 4, Section 18.18.7 (ST_CellRef)
 */

import { type ColIndex, type RowIndex, colIdx, rowIdx } from "../types";

// =============================================================================
// Types
// =============================================================================

/**
 * A single cell address in A1 notation.
 *
 * Represents both the position and whether each component is absolute.
 */
export type CellAddress = {
  /** Column index (1-based) */
  readonly col: ColIndex;
  /** Row index (1-based) */
  readonly row: RowIndex;
  /** Whether the column is absolute ($A vs A) */
  readonly colAbsolute: boolean;
  /** Whether the row is absolute ($1 vs 1) */
  readonly rowAbsolute: boolean;
};

/**
 * A range of cells.
 *
 * Can optionally be qualified with a sheet name.
 */
export type CellRange = {
  /** Start cell (top-left) */
  readonly start: CellAddress;
  /** End cell (bottom-right) */
  readonly end: CellAddress;
  /** Optional sheet name (for cross-sheet references) */
  readonly sheetName?: string;
};

// =============================================================================
// Column Letter <-> Index Conversion
// =============================================================================

/**
 * Convert a column letter (e.g., "A", "Z", "AA") to a 1-based column index.
 *
 * @param col - Column letter(s), case-insensitive
 * @returns 1-based column index
 * @throws Error if input is empty or contains invalid characters
 *
 * @example
 * columnLetterToIndex("A")  // => 1
 * columnLetterToIndex("Z")  // => 26
 * columnLetterToIndex("AA") // => 27
 */
export function columnLetterToIndex(col: string): ColIndex {
  if (!col || col.length === 0) {
    throw new Error("Column letter cannot be empty");
  }

  const upper = col.toUpperCase();

  // Validate all characters first
  for (const char of upper) {
    const charCode = char.charCodeAt(0);
    if (charCode < 65 || charCode > 90) {
      throw new Error(`Invalid column letter: ${col}`);
    }
  }

  // Calculate index using reduce
  const index = [...upper].reduce(
    (acc, char) => acc * 26 + (char.charCodeAt(0) - 64),
    0,
  );

  return colIdx(index);
}

/**
 * Internal recursive helper for index to column letter conversion.
 */
function indexToColumnLetterRecursive(n: number, acc: string): string {
  if (n <= 0) {
    return acc;
  }
  const adjusted = n - 1;
  const char = String.fromCharCode((adjusted % 26) + 65);
  return indexToColumnLetterRecursive(Math.floor(adjusted / 26), char + acc);
}

/**
 * Convert a 1-based column index to column letter(s).
 *
 * @param idx - 1-based column index
 * @returns Column letter(s)
 * @throws Error if index is less than 1
 *
 * @example
 * indexToColumnLetter(1)  // => "A"
 * indexToColumnLetter(26) // => "Z"
 * indexToColumnLetter(27) // => "AA"
 */
export function indexToColumnLetter(idx: ColIndex): string {
  if (idx < 1) {
    throw new Error(`Column index must be >= 1, got ${idx}`);
  }

  return indexToColumnLetterRecursive(idx as number, "");
}

// =============================================================================
// Parsing
// =============================================================================

/**
 * Regular expression for parsing a cell reference.
 *
 * Captures:
 * 1. $ before column (optional)
 * 2. Column letters
 * 3. $ before row (optional)
 * 4. Row number
 */
const CELL_REF_REGEX = /^(\$)?([A-Za-z]+)(\$)?(\d+)$/;

/**
 * Parse a cell reference string into a CellAddress.
 *
 * @param ref - Cell reference (e.g., "A1", "$A$1", "A$1", "$A1")
 * @returns Parsed CellAddress
 * @throws Error if the reference is invalid
 *
 * @example
 * parseCellRef("A1")    // => { col: 1, row: 1, colAbsolute: false, rowAbsolute: false }
 * parseCellRef("$A$1")  // => { col: 1, row: 1, colAbsolute: true, rowAbsolute: true }
 * parseCellRef("$A1")   // => { col: 1, row: 1, colAbsolute: true, rowAbsolute: false }
 * parseCellRef("A$1")   // => { col: 1, row: 1, colAbsolute: false, rowAbsolute: true }
 */
export function parseCellRef(ref: string): CellAddress {
  const match = ref.match(CELL_REF_REGEX);
  if (!match) {
    throw new Error(`Invalid cell reference: ${ref}`);
  }

  const [, colDollar, colLetters, rowDollar, rowDigits] = match;

  return {
    col: columnLetterToIndex(colLetters),
    row: rowIdx(parseInt(rowDigits, 10)),
    colAbsolute: colDollar === "$",
    rowAbsolute: rowDollar === "$",
  };
}

/**
 * Regular expression for parsing a range reference.
 *
 * Captures:
 * 1. Sheet name with ! (optional, may be quoted)
 * 2. Start cell reference
 * 3. End cell reference (optional, after :)
 */
const RANGE_REGEX = /^(?:(?:'([^']+)'|([^!]+))!)?(\$?[A-Za-z]+\$?\d+)(?::(\$?[A-Za-z]+\$?\d+))?$/;

/**
 * Parse a range reference string into a CellRange.
 *
 * Supports:
 * - Single cell: "A1" (start and end are the same)
 * - Simple range: "A1:B2"
 * - Sheet-qualified: "Sheet1!A1:B2"
 * - Quoted sheet name: "'Sheet Name'!A1:B2"
 *
 * @param range - Range reference string
 * @returns Parsed CellRange
 * @throws Error if the range is invalid
 *
 * @example
 * parseRange("A1")              // => { start: A1, end: A1 }
 * parseRange("A1:B2")           // => { start: A1, end: B2 }
 * parseRange("Sheet1!A1:B2")    // => { start: A1, end: B2, sheetName: "Sheet1" }
 * parseRange("'Sheet Name'!A1") // => { start: A1, end: A1, sheetName: "Sheet Name" }
 */
export function parseRange(range: string): CellRange {
  const match = range.match(RANGE_REGEX);
  if (!match) {
    throw new Error(`Invalid range reference: ${range}`);
  }

  const [, quotedSheet, unquotedSheet, startRef, endRef] = match;
  const sheetName = quotedSheet ?? unquotedSheet;

  const start = parseCellRef(startRef);
  const end = endRef ? parseCellRef(endRef) : start;

  return {
    start,
    end,
    ...(sheetName ? { sheetName } : {}),
  };
}

// =============================================================================
// Formatting
// =============================================================================

/**
 * Format a CellAddress into a cell reference string.
 *
 * @param addr - CellAddress to format
 * @returns Formatted cell reference (e.g., "A1", "$A$1")
 *
 * @example
 * formatCellRef({ col: 1, row: 1, colAbsolute: false, rowAbsolute: false }) // => "A1"
 * formatCellRef({ col: 1, row: 1, colAbsolute: true, rowAbsolute: true })   // => "$A$1"
 */
export function formatCellRef(addr: CellAddress): string {
  const colPrefix = addr.colAbsolute ? "$" : "";
  const rowPrefix = addr.rowAbsolute ? "$" : "";
  return `${colPrefix}${indexToColumnLetter(addr.col)}${rowPrefix}${addr.row}`;
}

/**
 * Format a CellRange into a range reference string.
 *
 * @param range - CellRange to format
 * @returns Formatted range reference (e.g., "A1:B2", "Sheet1!A1:B2")
 *
 * @example
 * formatRange({ start: A1, end: B2 })                      // => "A1:B2"
 * formatRange({ start: A1, end: B2, sheetName: "Sheet1" }) // => "Sheet1!A1:B2"
 * formatRange({ start: A1, end: B2, sheetName: "My Sheet" }) // => "'My Sheet'!A1:B2"
 */
export function formatRange(range: CellRange): string {
  const startStr = formatCellRef(range.start);
  const endStr = formatCellRef(range.end);

  // Single cell (start equals end)
  const isSingleCell =
    range.start.col === range.end.col &&
    range.start.row === range.end.row &&
    range.start.colAbsolute === range.end.colAbsolute &&
    range.start.rowAbsolute === range.end.rowAbsolute;

  const rangeStr = isSingleCell ? startStr : `${startStr}:${endStr}`;

  if (range.sheetName) {
    // Quote sheet name if it contains spaces or special characters
    const needsQuotes = /[\s!']/.test(range.sheetName);
    const quotedName = needsQuotes ? `'${range.sheetName}'` : range.sheetName;
    return `${quotedName}!${rangeStr}`;
  }

  return rangeStr;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Expand a range into an array of all cell addresses within it.
 *
 * Iterates row-by-row, then column-by-column within each row.
 * The returned addresses inherit the absolute flags from the start cell.
 *
 * @param range - CellRange to expand
 * @returns Array of CellAddresses within the range
 *
 * @example
 * expandRange(parseRange("A1:B2"))
 * // => [A1, B1, A2, B2]
 */
export function expandRange(range: CellRange): readonly CellAddress[] {
  const addresses: CellAddress[] = [];

  const startCol = range.start.col as number;
  const endCol = range.end.col as number;
  const startRow = range.start.row as number;
  const endRow = range.end.row as number;

  // Normalize: ensure start <= end
  const minCol = Math.min(startCol, endCol);
  const maxCol = Math.max(startCol, endCol);
  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      addresses.push({
        col: colIdx(col),
        row: rowIdx(row),
        colAbsolute: range.start.colAbsolute,
        rowAbsolute: range.start.rowAbsolute,
      });
    }
  }

  return addresses;
}
