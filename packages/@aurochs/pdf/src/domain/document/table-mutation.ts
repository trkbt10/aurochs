/**
 * @file PDF table mutation operations
 *
 * Immutable structure operations for PdfTable domain type.
 * SoT for table row/column/cell mutations.
 */

import type { PdfTable, PdfTableRow, PdfTableCell } from "./types";

// =============================================================================
// Cell Factory
// =============================================================================

/** Create an empty table cell. */
export function createTableCell(): PdfTableCell {
  return { text: "" };
}

// =============================================================================
// Row Operations
// =============================================================================

/**
 * Insert a row at the given index.
 * New row height is inherited from the row at `rowIndex` (or the last row).
 */
export function insertRow(table: PdfTable, rowIndex: number): PdfTable {
  const colCount = table.columns.length;
  const referenceRow = table.rows[rowIndex] ?? table.rows[table.rows.length - 1];
  const newRow: PdfTableRow = {
    height: referenceRow.height,
    cells: Array.from({ length: colCount }, () => createTableCell()),
  };

  return {
    ...table,
    rows: [...table.rows.slice(0, rowIndex), newRow, ...table.rows.slice(rowIndex)],
  };
}

/** Remove a row at the given index. Preserves at least 1 row. */
export function removeRow(table: PdfTable, rowIndex: number): PdfTable {
  if (table.rows.length <= 1) { return table; }
  return {
    ...table,
    rows: table.rows.filter((_, i) => i !== rowIndex),
  };
}

// =============================================================================
// Column Operations
// =============================================================================

/**
 * Insert a column at the given index.
 * New column width is inherited from the column at `colIndex` (or the last column).
 */
export function insertColumn(table: PdfTable, colIndex: number): PdfTable {
  const referenceCol = table.columns[colIndex] ?? table.columns[table.columns.length - 1];
  const newColumns = [
    ...table.columns.slice(0, colIndex),
    { width: referenceCol.width },
    ...table.columns.slice(colIndex),
  ];

  const newRows = table.rows.map((row) => ({
    ...row,
    cells: [...row.cells.slice(0, colIndex), createTableCell(), ...row.cells.slice(colIndex)],
  }));

  return { ...table, columns: newColumns, rows: newRows };
}

/** Remove a column at the given index. Preserves at least 1 column. */
export function removeColumn(table: PdfTable, colIndex: number): PdfTable {
  if (table.columns.length <= 1) { return table; }
  return {
    ...table,
    columns: table.columns.filter((_, i) => i !== colIndex),
    rows: table.rows.map((row) => ({
      ...row,
      cells: row.cells.filter((_, i) => i !== colIndex),
    })),
  };
}

// =============================================================================
// Dimension Operations
// =============================================================================

/** Set column width at the given index. */
export function setColumnWidth(table: PdfTable, colIndex: number, width: number): PdfTable {
  if (colIndex < 0 || colIndex >= table.columns.length) { return table; }
  return {
    ...table,
    columns: table.columns.map((col, i) => (i === colIndex ? { width } : col)),
  };
}

/** Set row height at the given index. */
export function setRowHeight(table: PdfTable, rowIndex: number, height: number): PdfTable {
  if (rowIndex < 0 || rowIndex >= table.rows.length) { return table; }
  return {
    ...table,
    rows: table.rows.map((row, i) => (i === rowIndex ? { ...row, height } : row)),
  };
}

// =============================================================================
// Cell Merge / Split
// =============================================================================

/** Cell range for merge/split operations. */
export type TableCellRange = {
  readonly startRow: number;
  readonly startCol: number;
  readonly endRow: number;
  readonly endCol: number;
};

/** Merge cells in the given range. */
export function mergeCells(table: PdfTable, range: TableCellRange): PdfTable {
  const { startRow, startCol, endRow, endCol } = range;
  if (startRow >= endRow && startCol >= endCol) { return table; }

  const rowSpan = endRow - startRow + 1;
  const colSpan = endCol - startCol + 1;

  return {
    ...table,
    rows: table.rows.map((row, ri) => {
      if (ri < startRow || ri > endRow) { return row; }
      return {
        ...row,
        cells: row.cells.map((cell, ci) => {
          if (ci < startCol || ci > endCol) { return cell; }
          if (ri === startRow && ci === startCol) {
            return { ...cell, rowSpan, colSpan };
          }
          return { ...cell, text: "" };
        }),
      };
    }),
  };
}

/** Split a cell by resetting spans. */
export function splitCell(table: PdfTable, row: number, col: number): PdfTable {
  return {
    ...table,
    rows: table.rows.map((r, ri) => ({
      ...r,
      cells: r.cells.map((cell, ci) => {
        if (ri === row && ci === col) {
          const { rowSpan: _rs, colSpan: _cs, ...rest } = cell;
          return rest;
        }
        return cell;
      }),
    })),
  };
}
