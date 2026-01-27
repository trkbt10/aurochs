/**
 * @file A1-style cell range utilities
 *
 * Parses and formats Excel-style A1 cell references.
 * Used for updating chart formula ranges (c:f elements).
 *
 * @see ECMA-376 Part 1, Section 18.17 (Formulas)
 */

/**
 * Cell address with column (letter) and row (number).
 */
export type CellAddress = {
  /** Column letter (A-ZZZ) */
  readonly col: string;
  /** Row number (1-based) */
  readonly row: number;
  /** Whether column is absolute ($A vs A) */
  readonly colAbsolute: boolean;
  /** Whether row is absolute ($1 vs 1) */
  readonly rowAbsolute: boolean;
};

/**
 * Cell range with start and end addresses.
 */
export type CellRange = {
  readonly start: CellAddress;
  readonly end: CellAddress;
};

/**
 * Convert column letter(s) to 1-based index.
 *
 * @param col - Column letter(s) (e.g., "A", "Z", "AA", "AZ")
 * @returns 1-based column index
 *
 * @example
 * columnLetterToIndex("A")  // => 1
 * columnLetterToIndex("Z")  // => 26
 * columnLetterToIndex("AA") // => 27
 * columnLetterToIndex("AZ") // => 52
 */
export function columnLetterToIndex(col: string): number {
  let index = 0;
  const upper = col.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index;
}

/**
 * Convert 1-based column index to letter(s).
 *
 * @param index - 1-based column index
 * @returns Column letter(s)
 *
 * @example
 * indexToColumnLetter(1)  // => "A"
 * indexToColumnLetter(26) // => "Z"
 * indexToColumnLetter(27) // => "AA"
 * indexToColumnLetter(52) // => "AZ"
 */
export function indexToColumnLetter(index: number): string {
  let result = "";
  let n = index;
  while (n > 0) {
    n--;
    result = String.fromCharCode((n % 26) + 65) + result;
    n = Math.floor(n / 26);
  }
  return result;
}

/**
 * Parse a single cell reference.
 *
 * @param ref - Cell reference (e.g., "$A$1", "B2", "$C1")
 * @returns Parsed cell address, or undefined if invalid
 *
 * @example
 * parseCellRef("$A$1")  // => { col: "A", row: 1, colAbsolute: true, rowAbsolute: true }
 * parseCellRef("B2")    // => { col: "B", row: 2, colAbsolute: false, rowAbsolute: false }
 * parseCellRef("$C1")   // => { col: "C", row: 1, colAbsolute: true, rowAbsolute: false }
 */
export function parseCellRef(ref: string): CellAddress | undefined {
  // Match: optional $ + letters + optional $ + digits
  const match = ref.match(/^(\$)?([A-Za-z]+)(\$)?(\d+)$/);
  if (!match) {
    return undefined;
  }

  return {
    col: match[2].toUpperCase(),
    row: parseInt(match[4], 10),
    colAbsolute: match[1] === "$",
    rowAbsolute: match[3] === "$",
  };
}

/**
 * Format a cell address back to string.
 *
 * @param addr - Cell address
 * @returns Formatted cell reference
 *
 * @example
 * formatCellRef({ col: "A", row: 1, colAbsolute: true, rowAbsolute: true })
 * // => "$A$1"
 */
export function formatCellRef(addr: CellAddress): string {
  const colPart = addr.colAbsolute ? `$${addr.col}` : addr.col;
  const rowPart = addr.rowAbsolute ? `$${addr.row}` : String(addr.row);
  return `${colPart}${rowPart}`;
}

/**
 * Parse a cell range.
 *
 * @param rangeRef - Range reference (e.g., "$A$2:$A$10", "B1:D5")
 * @returns Parsed range, or undefined if invalid
 *
 * @example
 * parseRange("$A$2:$A$10")
 * // => { start: { col: "A", row: 2, ... }, end: { col: "A", row: 10, ... } }
 */
export function parseRange(rangeRef: string): CellRange | undefined {
  const parts = rangeRef.split(":");
  if (parts.length !== 2) {
    return undefined;
  }

  const start = parseCellRef(parts[0]);
  const end = parseCellRef(parts[1]);

  if (!start || !end) {
    return undefined;
  }

  return { start, end };
}

/**
 * Format a cell range back to string.
 *
 * @param range - Cell range
 * @returns Formatted range reference
 *
 * @example
 * formatRange({ start: {..., col: "A", row: 2}, end: {..., col: "A", row: 10} })
 * // => "$A$2:$A$10"
 */
export function formatRange(range: CellRange): string {
  return `${formatCellRef(range.start)}:${formatCellRef(range.end)}`;
}

/**
 * Determine if range is a column range (single column, multiple rows).
 *
 * @param range - Cell range
 * @returns true if column range
 */
export function isColumnRange(range: CellRange): boolean {
  return range.start.col === range.end.col;
}

/**
 * Determine if range is a row range (single row, multiple columns).
 *
 * @param range - Cell range
 * @returns true if row range
 */
export function isRowRange(range: CellRange): boolean {
  return range.start.row === range.end.row;
}

/**
 * Get the number of cells in a range.
 *
 * @param range - Cell range
 * @returns Number of cells (rows × columns)
 */
export function getRangeCellCount(range: CellRange): number {
  const colStart = columnLetterToIndex(range.start.col);
  const colEnd = columnLetterToIndex(range.end.col);
  const rowCount = range.end.row - range.start.row + 1;
  const colCount = colEnd - colStart + 1;
  return rowCount * colCount;
}

/**
 * Update range to match a new item count, preserving direction.
 *
 * For column ranges (like $A$2:$A$10), adjusts end row.
 * For row ranges (like $B$1:$D$1), adjusts end column.
 *
 * @param range - Original range
 * @param itemCount - New number of items
 * @returns Updated range
 *
 * @example
 * // Column range: $A$2:$A$10 with 5 items -> $A$2:$A$6
 * updateRangeForItemCount(parseRange("$A$2:$A$10")!, 5)
 * // => { start: {..., row: 2}, end: {..., row: 6} }
 *
 * // Row range: $B$1:$D$1 with 5 items -> $B$1:$F$1
 * updateRangeForItemCount(parseRange("$B$1:$D$1")!, 5)
 * // => { start: {..., col: "B"}, end: {..., col: "F"} }
 */
export function updateRangeForItemCount(range: CellRange, itemCount: number): CellRange {
  if (isColumnRange(range)) {
    // Adjust row count
    return {
      start: range.start,
      end: {
        ...range.end,
        row: range.start.row + itemCount - 1,
      },
    };
  }

  if (isRowRange(range)) {
    // Adjust column count
    const startColIndex = columnLetterToIndex(range.start.col);
    const newEndCol = indexToColumnLetter(startColIndex + itemCount - 1);
    return {
      start: range.start,
      end: {
        ...range.end,
        col: newEndCol,
      },
    };
  }

  // For rectangular ranges, adjust end row (treating as column-major)
  return {
    start: range.start,
    end: {
      ...range.end,
      row: range.start.row + itemCount - 1,
    },
  };
}

/**
 * Expand a range to include additional items at the end.
 *
 * @param rangeRef - Original range reference
 * @param newItemCount - New total item count
 * @returns Updated range reference, or original if parsing fails
 */
export function expandRangeForItems(rangeRef: string, newItemCount: number): string {
  const range = parseRange(rangeRef);
  if (!range) {
    return rangeRef;
  }

  const updated = updateRangeForItemCount(range, newItemCount);
  return formatRange(updated);
}

/**
 * Get all cell addresses in a range, row by row.
 *
 * @param range - Cell range
 * @returns Array of cell addresses
 */
export function getRangeCells(range: CellRange): readonly CellAddress[] {
  const result: CellAddress[] = [];
  const colStart = columnLetterToIndex(range.start.col);
  const colEnd = columnLetterToIndex(range.end.col);

  for (let row = range.start.row; row <= range.end.row; row++) {
    for (let col = colStart; col <= colEnd; col++) {
      result.push({
        col: indexToColumnLetter(col),
        row,
        colAbsolute: range.start.colAbsolute,
        rowAbsolute: range.start.rowAbsolute,
      });
    }
  }

  return result;
}

/**
 * Create a range from start cell and item count.
 *
 * @param startCol - Start column letter
 * @param startRow - Start row (1-based)
 * @param itemCount - Number of items
 * @param direction - "column" for vertical, "row" for horizontal
 * @param absolute - Whether to use absolute references
 * @returns Cell range
 */
export function createRange(
  startCol: string,
  startRow: number,
  itemCount: number,
  direction: "column" | "row",
  absolute: boolean = true,
): CellRange {
  const start: CellAddress = {
    col: startCol.toUpperCase(),
    row: startRow,
    colAbsolute: absolute,
    rowAbsolute: absolute,
  };

  if (direction === "column") {
    return {
      start,
      end: {
        col: start.col,
        row: startRow + itemCount - 1,
        colAbsolute: absolute,
        rowAbsolute: absolute,
      },
    };
  }

  const startColIndex = columnLetterToIndex(startCol);
  return {
    start,
    end: {
      col: indexToColumnLetter(startColIndex + itemCount - 1),
      row: startRow,
      colAbsolute: absolute,
      rowAbsolute: absolute,
    },
  };
}
