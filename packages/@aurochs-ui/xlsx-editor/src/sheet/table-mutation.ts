/**
 * @file Table mutation operations
 *
 * Operations for managing tables (ListObjects) on worksheets.
 */

import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import type { XlsxTable } from "@aurochs-office/xlsx/domain/table/types";
import type { CellRange } from "@aurochs-office/xlsx/domain/cell/address";
import { formatRange } from "@aurochs-office/xlsx/domain/cell/address";

function rangesOverlap(a: CellRange, b: CellRange): boolean {
  return !(
    a.end.row < b.start.row ||
    a.start.row > b.end.row ||
    a.end.col < b.start.col ||
    a.start.col > b.end.col
  );
}

/**
 * Generate a unique table name
 */
function generateTableName(existingTables: readonly XlsxTable[]): string {
  const existingNames = new Set(existingTables.map((t) => t.name));
  let i = 1;
  while (existingNames.has(`Table${i}`)) {
    i++;
  }
  return `Table${i}`;
}

/**
 * Generate a unique table ID
 */
function generateTableId(existingTables: readonly XlsxTable[]): number {
  const existingIds = new Set(existingTables.map((t) => t.id));
  let id = 1;
  while (existingIds.has(id)) {
    id++;
  }
  return id;
}

/**
 * Generate column names from the header row
 * For now, just use Column1, Column2, etc.
 */
function generateColumnNames(colCount: number): readonly { id: number; name: string }[] {
  const columns: { id: number; name: string }[] = [];
  for (let i = 0; i < colCount; i++) {
    columns.push({ id: i + 1, name: `Column${i + 1}` });
  }
  return columns;
}

/**
 * Create a new table from a cell range
 */
export function createTable(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  range: CellRange,
  options?: {
    readonly name?: string;
    readonly hasHeaderRow?: boolean;
    readonly hasTotalsRow?: boolean;
  },
): XlsxWorkbook {
  const existingTables = workbook.tables ?? [];

  // Check for overlapping tables
  const overlaps = existingTables.some(
    (t) => t.sheetIndex === sheetIndex && rangesOverlap(t.ref, range),
  );
  if (overlaps) {
    throw new Error("Table range overlaps with an existing table");
  }

  const colCount = range.end.col - range.start.col + 1;
  const id = generateTableId(existingTables);
  const name = options?.name ?? generateTableName(existingTables);

  const table: XlsxTable = {
    id,
    name,
    displayName: name,
    ref: range,
    headerRowCount: options?.hasHeaderRow !== false ? 1 : 0,
    totalsRowCount: options?.hasTotalsRow === true ? 1 : 0,
    sheetIndex,
    columns: generateColumnNames(colCount),
    styleInfo: {
      name: "TableStyleMedium2",
      showRowStripes: true,
    },
  };

  return {
    ...workbook,
    tables: [...existingTables, table],
  };
}

/**
 * Delete a table by name
 */
export function deleteTable(
  workbook: XlsxWorkbook,
  tableName: string,
): XlsxWorkbook {
  const existingTables = workbook.tables ?? [];
  const newTables = existingTables.filter((t) => t.name !== tableName);

  if (newTables.length === existingTables.length) {
    return workbook; // No table found with that name
  }

  if (newTables.length === 0) {
    return { ...workbook, tables: undefined };
  }

  return { ...workbook, tables: newTables };
}

/**
 * Delete a table at a specific range
 */
export function deleteTableAtRange(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  range: CellRange,
): XlsxWorkbook {
  const existingTables = workbook.tables ?? [];
  const newTables = existingTables.filter(
    (t) => !(t.sheetIndex === sheetIndex && rangesOverlap(t.ref, range)),
  );

  if (newTables.length === existingTables.length) {
    return workbook; // No table found at that range
  }

  if (newTables.length === 0) {
    return { ...workbook, tables: undefined };
  }

  return { ...workbook, tables: newTables };
}

/**
 * Update table style info
 */
export function updateTableStyle(
  workbook: XlsxWorkbook,
  tableName: string,
  styleInfo: XlsxTable["styleInfo"],
): XlsxWorkbook {
  const existingTables = workbook.tables ?? [];
  const newTables = existingTables.map((t) =>
    t.name === tableName ? { ...t, styleInfo } : t,
  );

  return { ...workbook, tables: newTables };
}
