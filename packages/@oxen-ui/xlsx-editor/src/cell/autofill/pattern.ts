/**
 * @file Autofill pattern extraction
 *
 * Reads the worksheet's sparse data structures into lookup maps that are optimized for autofill:
 * - Column/row style inheritance
 * - Fast access to base-range cells by (row, col)
 */

import type { Cell } from "@oxen/xlsx/domain/cell/types";
import type { XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import type { RangeBounds } from "./types";

/**
 * Resolve the column-level `styleId` for a 1-based column number, if any column definition covers it.
 */
export function getColumnStyleId(sheet: XlsxWorksheet, colNumber: number): number | undefined {
  for (const def of sheet.columns ?? []) {
    if ((def.min as number) <= colNumber && colNumber <= (def.max as number)) {
      return def.styleId as number | undefined;
    }
  }
  return undefined;
}

/**
 * Build a map of rowNumber→styleId so base-range lookups can compute effective style quickly.
 */
export function buildRowStyleIdMap(sheet: XlsxWorksheet): ReadonlyMap<number, number | undefined> {
  const map = new Map<number, number | undefined>();
  for (const row of sheet.rows) {
    map.set(row.rowNumber as number, row.styleId as number | undefined);
  }
  return map;
}

/**
 * Build a sparse lookup of cells within `bounds` indexed by rowNumber→colNumber→Cell.
 */
export function buildCellLookup(sheet: XlsxWorksheet, bounds: RangeBounds): ReadonlyMap<number, ReadonlyMap<number, Cell>> {
  const rowMap = new Map<number, Map<number, Cell>>();
  for (const row of sheet.rows) {
    const rowNumber = row.rowNumber as number;
    if (rowNumber < bounds.minRow || rowNumber > bounds.maxRow) {
      continue;
    }
    const cols = new Map<number, Cell>();
    for (const cell of row.cells) {
      const colNumber = cell.address.col as number;
      if (colNumber < bounds.minCol || colNumber > bounds.maxCol) {
        continue;
      }
      cols.set(colNumber, cell);
    }
    rowMap.set(rowNumber, cols);
  }
  return rowMap;
}
