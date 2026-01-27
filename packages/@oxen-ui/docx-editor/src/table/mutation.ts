/**
 * @file DOCX Table Mutation Utilities
 *
 * Provides immutable mutation functions for table-level operations.
 * All functions return new objects without modifying the originals.
 */

import type {
  DocxTable,
  DocxTableRow,
  DocxTableCell,
  DocxTableProperties,
  DocxTableRowProperties,
  DocxTableCellProperties,
  DocxTableGrid,
  DocxTableBorders,
  DocxCellBorders,
  DocxTableLook,
} from "@oxen/docx/domain/table";
import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import type { TableWidth, TableAlignment, TableGridColumn } from "@oxen/ooxml/domain/table";
import { gridSpan } from "@oxen/ooxml/domain/table";
import type { Pixels } from "@oxen/ooxml/domain/units";
import { createParagraph } from "../paragraph/mutation";

// =============================================================================
// Table Creation
// =============================================================================

/**
 * Create an empty table with default structure.
 */
export function createTable(
  rows: number = 1,
  columns: number = 1,
  properties?: DocxTableProperties,
): DocxTable {
  const grid: DocxTableGrid = {
    columns: Array.from({ length: columns }, () => ({ width: 100 as Pixels })),
  };

  const tableRows = Array.from({ length: rows }, () => createTableRow(columns));

  return {
    type: "table",
    properties,
    grid,
    rows: tableRows,
  };
}

/**
 * Create an empty table row with specified number of cells.
 */
export function createTableRow(
  cellCount: number = 1,
  properties?: DocxTableRowProperties,
): DocxTableRow {
  const cells = Array.from({ length: cellCount }, () => createTableCell());

  return {
    type: "tableRow",
    properties,
    cells,
  };
}

/**
 * Create an empty table cell with an empty paragraph.
 */
export function createTableCell(properties?: DocxTableCellProperties): DocxTableCell {
  return {
    type: "tableCell",
    properties,
    content: [createParagraph()],
  };
}

// =============================================================================
// Table Row Mutations
// =============================================================================

/**
 * Append a row to the table.
 */
export function appendRow(table: DocxTable, row?: DocxTableRow): DocxTable {
  const newRow = row ?? createTableRow(table.rows[0]?.cells.length ?? 1);
  return {
    ...table,
    rows: [...table.rows, newRow],
  };
}

/**
 * Insert a row at a specific index.
 */
export function insertRow(table: DocxTable, rowIndex: number, row?: DocxTableRow): DocxTable {
  const newRow = row ?? createTableRow(table.rows[0]?.cells.length ?? 1);
  return {
    ...table,
    rows: [...table.rows.slice(0, rowIndex), newRow, ...table.rows.slice(rowIndex)],
  };
}

/**
 * Remove a row at a specific index.
 */
export function removeRow(table: DocxTable, rowIndex: number): DocxTable {
  return {
    ...table,
    rows: table.rows.filter((_, i) => i !== rowIndex),
  };
}

/**
 * Replace a row at a specific index.
 */
export function setRow(table: DocxTable, rowIndex: number, row: DocxTableRow): DocxTable {
  return {
    ...table,
    rows: table.rows.map((r, i) => (i === rowIndex ? row : r)),
  };
}

/**
 * Update row properties.
 */
export function setRowProperties(
  row: DocxTableRow,
  properties: DocxTableRowProperties | undefined,
): DocxTableRow {
  return {
    ...row,
    properties,
  };
}

/**
 * Merge new properties into existing row properties.
 */
export function mergeRowProperties(
  row: DocxTableRow,
  properties: Partial<DocxTableRowProperties>,
): DocxTableRow {
  return {
    ...row,
    properties: {
      ...row.properties,
      ...properties,
    },
  };
}

// =============================================================================
// Table Column Mutations
// =============================================================================

/**
 * Append a column to the table.
 */
export function appendColumn(table: DocxTable, width?: Pixels): DocxTable {
  const columnWidth = width ?? (100 as Pixels);
  const newGrid: DocxTableGrid = {
    columns: [...(table.grid?.columns ?? []), { width: columnWidth }],
  };

  const newRows = table.rows.map((row) => ({
    ...row,
    cells: [...row.cells, createTableCell()],
  }));

  return {
    ...table,
    grid: newGrid,
    rows: newRows,
  };
}

/**
 * Insert a column at a specific index.
 */
export function insertColumn(table: DocxTable, colIndex: number, width?: Pixels): DocxTable {
  const columnWidth = width ?? (100 as Pixels);
  const columns = table.grid?.columns ?? [];
  const newGrid: DocxTableGrid = {
    columns: [...columns.slice(0, colIndex), { width: columnWidth }, ...columns.slice(colIndex)],
  };

  const newRows = table.rows.map((row) => ({
    ...row,
    cells: [
      ...row.cells.slice(0, colIndex),
      createTableCell(),
      ...row.cells.slice(colIndex),
    ],
  }));

  return {
    ...table,
    grid: newGrid,
    rows: newRows,
  };
}

/**
 * Remove a column at a specific index.
 */
export function removeColumn(table: DocxTable, colIndex: number): DocxTable {
  const columns = table.grid?.columns ?? [];
  const newGrid: DocxTableGrid = {
    columns: columns.filter((_, i) => i !== colIndex),
  };

  const newRows = table.rows.map((row) => ({
    ...row,
    cells: row.cells.filter((_, i) => i !== colIndex),
  }));

  return {
    ...table,
    grid: newGrid,
    rows: newRows,
  };
}

/**
 * Set column width.
 */
export function setColumnWidth(table: DocxTable, colIndex: number, width: Pixels): DocxTable {
  const columns = table.grid?.columns ?? [];
  if (colIndex < 0 || colIndex >= columns.length) {
    return table;
  }

  const newColumns = columns.map((col, i) =>
    i === colIndex ? { ...col, width } : col,
  );

  return {
    ...table,
    grid: { columns: newColumns },
  };
}

// =============================================================================
// Table Cell Mutations
// =============================================================================

/**
 * Get a cell at specific coordinates.
 */
export function getCell(table: DocxTable, rowIndex: number, colIndex: number): DocxTableCell | undefined {
  return table.rows[rowIndex]?.cells[colIndex];
}

/**
 * Set a cell at specific coordinates.
 */
/**
 * Update cell at a specific column index.
 */
function updateCellAtIndex(
  cells: readonly DocxTableCell[],
  colIndex: number,
  newCell: DocxTableCell,
): DocxTableCell[] {
  return cells.map((c, ci) => (ci === colIndex ? newCell : c));
}

/**
 * Update row at a specific row index.
 */
function updateRowCells(
  row: DocxTableRow,
  colIndex: number,
  newCell: DocxTableCell,
): DocxTableRow {
  return { ...row, cells: updateCellAtIndex(row.cells, colIndex, newCell) };
}

/**
 * Set a cell at specific coordinates.
 */
export function setCell(
  table: DocxTable,
  rowIndex: number,
  colIndex: number,
  cell: DocxTableCell,
): DocxTable {
  return {
    ...table,
    rows: table.rows.map((row, ri) => {
      if (ri === rowIndex) {
        return updateRowCells(row, colIndex, cell);
      }
      return row;
    }),
  };
}

/**
 * Set cell properties.
 */
export function setCellProperties(
  cell: DocxTableCell,
  properties: DocxTableCellProperties | undefined,
): DocxTableCell {
  return {
    ...cell,
    properties,
  };
}

/**
 * Merge new properties into existing cell properties.
 */
export function mergeCellProperties(
  cell: DocxTableCell,
  properties: Partial<DocxTableCellProperties>,
): DocxTableCell {
  return {
    ...cell,
    properties: {
      ...cell.properties,
      ...properties,
    },
  };
}

/**
 * Set cell content.
 */
export function setCellContent(
  cell: DocxTableCell,
  content: readonly (DocxParagraph | DocxTable)[],
): DocxTableCell {
  return {
    ...cell,
    content,
  };
}

/**
 * Append content to a cell.
 */
export function appendCellContent(
  cell: DocxTableCell,
  content: DocxParagraph | DocxTable,
): DocxTableCell {
  return {
    ...cell,
    content: [...cell.content, content],
  };
}

// =============================================================================
// Table Properties Mutations
// =============================================================================

/**
 * Set table properties, replacing all existing properties.
 */
export function setTableProperties(
  table: DocxTable,
  properties: DocxTableProperties | undefined,
): DocxTable {
  return {
    ...table,
    properties,
  };
}

/**
 * Merge new properties into existing table properties.
 */
export function mergeTableProperties(
  table: DocxTable,
  properties: Partial<DocxTableProperties>,
): DocxTable {
  return {
    ...table,
    properties: {
      ...table.properties,
      ...properties,
    },
  };
}

/**
 * Set table width.
 */
export function setTableWidth(table: DocxTable, width: TableWidth): DocxTable {
  return mergeTableProperties(table, { tblW: width });
}

/**
 * Set table alignment.
 */
export function setTableAlignment(table: DocxTable, alignment: TableAlignment): DocxTable {
  return mergeTableProperties(table, { jc: alignment });
}

/**
 * Set table borders.
 */
export function setTableBorders(table: DocxTable, borders: DocxTableBorders): DocxTable {
  return mergeTableProperties(table, { tblBorders: borders });
}

/**
 * Set table look options.
 */
export function setTableLook(table: DocxTable, look: DocxTableLook): DocxTable {
  return mergeTableProperties(table, { tblLook: look });
}

/**
 * Set table grid.
 */
export function setTableGrid(table: DocxTable, grid: DocxTableGrid): DocxTable {
  return {
    ...table,
    grid,
  };
}

// =============================================================================
// Cell Merging
// =============================================================================

/**
 * Merge cells horizontally (column span).
 *
 * Merges cells from startCol to endCol (inclusive) in the specified row.
 */
export function mergeCellsHorizontally(
  table: DocxTable,
  rowIndex: number,
  startCol: number,
  endCol: number,
): DocxTable {
  const row = table.rows[rowIndex];
  if (!row || startCol >= endCol || startCol < 0 || endCol >= row.cells.length) {
    return table;
  }

  const span = endCol - startCol + 1;
  const mergedCell = mergeCellProperties(row.cells[startCol], { gridSpan: gridSpan(span) });

  const newCells = [
    ...row.cells.slice(0, startCol),
    mergedCell,
    ...row.cells.slice(endCol + 1),
  ];

  return setRow(table, rowIndex, { ...row, cells: newCells });
}

/**
 * Start or continue vertical merge.
 */
export function setCellVerticalMerge(
  table: DocxTable,
  rowIndex: number,
  colIndex: number,
  merge: "restart" | "continue" | undefined,
): DocxTable {
  const cell = getCell(table, rowIndex, colIndex);
  if (!cell) {
    return table;
  }

  const newCell = getUpdatedCellForVerticalMerge(cell, merge);

  return setCell(table, rowIndex, colIndex, newCell);
}

/**
 * Get updated cell for vertical merge operation.
 */
function getUpdatedCellForVerticalMerge(
  cell: DocxTableCell,
  merge: "restart" | "continue" | undefined,
): DocxTableCell {
  if (merge) {
    return mergeCellProperties(cell, { vMerge: merge });
  }
  return removeCellProperty(cell, "vMerge");
}

/**
 * Merge cells vertically.
 *
 * Merges cells from startRow to endRow (inclusive) in the specified column.
 */
export function mergeCellsVertically(
  table: DocxTable,
  colIndex: number,
  startRow: number,
  endRow: number,
): DocxTable {
  if (startRow >= endRow || startRow < 0 || endRow >= table.rows.length) {
    return table;
  }

  // Set restart on first cell
  const withRestart = setCellVerticalMerge(table, startRow, colIndex, "restart");

  // Set continue on remaining cells
  const rowIndices = Array.from(
    { length: endRow - startRow },
    (_, i) => startRow + 1 + i,
  );

  return rowIndices.reduce(
    (acc, rowIndex) => setCellVerticalMerge(acc, rowIndex, colIndex, "continue"),
    withRestart,
  );
}

// =============================================================================
// Cell Property Removal
// =============================================================================

/**
 * Remove specific properties from a cell.
 */
export function removeCellProperty<K extends keyof DocxTableCellProperties>(
  cell: DocxTableCell,
  ...keys: K[]
): DocxTableCell {
  if (!cell.properties) {
    return cell;
  }

  const newProperties = { ...cell.properties };
  for (const key of keys) {
    delete (newProperties as Record<string, unknown>)[key];
  }

  const hasProperties = Object.keys(newProperties).length > 0;
  return {
    ...cell,
    properties: hasProperties ? newProperties : undefined,
  };
}

// =============================================================================
// Cell Border Operations
// =============================================================================

/**
 * Set cell borders.
 */
export function setCellBorders(cell: DocxTableCell, borders: DocxCellBorders): DocxTableCell {
  return mergeCellProperties(cell, { tcBorders: borders });
}

/**
 * Clear cell borders.
 */
export function clearCellBorders(cell: DocxTableCell): DocxTableCell {
  return removeCellProperty(cell, "tcBorders");
}

// =============================================================================
// Table Query Functions
// =============================================================================

/**
 * Get table row count.
 */
export function getRowCount(table: DocxTable): number {
  return table.rows.length;
}

/**
 * Get table column count.
 */
export function getColumnCount(table: DocxTable): number {
  return table.grid?.columns.length ?? table.rows[0]?.cells.length ?? 0;
}

/**
 * Check if table is empty.
 */
export function isTableEmpty(table: DocxTable): boolean {
  return table.rows.length === 0;
}

/**
 * Get table grid columns.
 */
export function getTableGridColumns(table: DocxTable): readonly TableGridColumn[] {
  return table.grid?.columns ?? [];
}
