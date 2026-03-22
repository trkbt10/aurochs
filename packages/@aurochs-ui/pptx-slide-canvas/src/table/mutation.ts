/**
 * @file PPTX Table Mutation Utilities
 *
 * Immutable structure operations for PPTX Table type.
 * Mirrors the DOCX mutation.ts pattern for consistency.
 */

import type { Table, TableRow, TableColumn } from "@aurochs-office/pptx/domain/table/types";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { createDefaultTableCell } from "@aurochs-ui/pptx-editors";
import type { CellRange } from "@aurochs-ui/editor-core/table-operations";

// =============================================================================
// Row Operations
// =============================================================================

/** Insert a row at the given index. New row matches existing column count. */
export function insertRow(table: Table, rowIndex: number): Table {
  const colCount = table.grid.columns.length;
  const defaultHeight = table.rows[0]?.height ?? px(30);
  const newRow: TableRow = {
    height: defaultHeight,
    cells: Array.from({ length: colCount }, () => createDefaultTableCell()),
  };

  return {
    ...table,
    rows: [...table.rows.slice(0, rowIndex), newRow, ...table.rows.slice(rowIndex)],
  };
}

/** Remove a row at the given index. */
export function removeRow(table: Table, rowIndex: number): Table {
  if (table.rows.length <= 1) {
    return table;
  }
  return {
    ...table,
    rows: table.rows.filter((_, i) => i !== rowIndex),
  };
}

// =============================================================================
// Column Operations
// =============================================================================

/** Insert a column at the given index. Adds a cell to every row. */
export function insertColumn(table: Table, colIndex: number): Table {
  const defaultWidth = table.grid.columns[0]?.width ?? px(100);
  const newColumns: readonly TableColumn[] = [
    ...table.grid.columns.slice(0, colIndex),
    { width: defaultWidth },
    ...table.grid.columns.slice(colIndex),
  ];

  const newRows = table.rows.map((row) => ({
    ...row,
    cells: [...row.cells.slice(0, colIndex), createDefaultTableCell(), ...row.cells.slice(colIndex)],
  }));

  return {
    ...table,
    grid: { columns: newColumns },
    rows: newRows,
  };
}

/** Remove a column at the given index. */
export function removeColumn(table: Table, colIndex: number): Table {
  if (table.grid.columns.length <= 1) {
    return table;
  }

  const newColumns = table.grid.columns.filter((_, i) => i !== colIndex);
  const newRows = table.rows.map((row) => ({
    ...row,
    cells: row.cells.filter((_, i) => i !== colIndex),
  }));

  return {
    ...table,
    grid: { columns: newColumns },
    rows: newRows,
  };
}

// =============================================================================
// Dimension Operations
// =============================================================================

/** Set column width at the given index. */
export function setColumnWidth(table: Table, colIndex: number, width: number): Table {
  if (colIndex < 0 || colIndex >= table.grid.columns.length) {
    return table;
  }

  const newColumns = table.grid.columns.map((col, i) =>
    i === colIndex ? { ...col, width: px(width) } : col,
  );

  return {
    ...table,
    grid: { columns: newColumns },
  };
}

/** Set row height at the given index. */
export function setRowHeight(table: Table, rowIndex: number, height: number): Table {
  if (rowIndex < 0 || rowIndex >= table.rows.length) {
    return table;
  }

  return {
    ...table,
    rows: table.rows.map((row, i) =>
      i === rowIndex ? { ...row, height: px(height) } : row,
    ),
  };
}

// =============================================================================
// Cell Merge / Split
// =============================================================================

/** Merge cells in the given range by setting rowSpan/colSpan on the top-left cell. */
export function mergeCells(table: Table, range: CellRange): Table {
  const { startRow, startCol, endRow, endCol } = range;
  if (startRow >= endRow && startCol >= endCol) {
    return table;
  }

  const rowSpan = endRow - startRow + 1;
  const colSpan = endCol - startCol + 1;

  return {
    ...table,
    rows: table.rows.map((row, ri) => {
      if (ri < startRow || ri > endRow) {
        return row;
      }
      return {
        ...row,
        cells: row.cells.map((cell, ci) => {
          if (ci < startCol || ci > endCol) {
            return cell;
          }
          if (ri === startRow && ci === startCol) {
            return {
              ...cell,
              properties: {
                ...cell.properties,
                rowSpan,
                colSpan,
              },
            };
          }
          // Mark merged cells with horizontalMerge/verticalMerge
          return {
            ...cell,
            properties: {
              ...cell.properties,
              horizontalMerge: ci > startCol,
              verticalMerge: ri > startRow,
            },
          };
        }),
      };
    }),
  };
}

/** Split a cell by resetting its rowSpan/colSpan to 1. */
export function splitCell(table: Table, row: number, col: number): Table {
  return {
    ...table,
    rows: table.rows.map((r, ri) => ({
      ...r,
      cells: r.cells.map((cell, ci) => {
        if (ri === row && ci === col) {
          const { rowSpan: _rs, colSpan: _cs, ...restProps } = cell.properties;
          return { ...cell, properties: restProps };
        }
        return cell;
      }),
    })),
  };
}
