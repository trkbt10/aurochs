import type { Cell } from "../../../xlsx/domain/cell/types";
import type { XlsxWorksheet } from "../../../xlsx/domain/workbook";
import type { RangeBounds } from "./types";

export function getColumnStyleId(sheet: XlsxWorksheet, colNumber: number): number | undefined {
  for (const def of sheet.columns ?? []) {
    if ((def.min as number) <= colNumber && colNumber <= (def.max as number)) {
      return def.styleId as number | undefined;
    }
  }
  return undefined;
}

export function buildRowStyleIdMap(sheet: XlsxWorksheet): ReadonlyMap<number, number | undefined> {
  const map = new Map<number, number | undefined>();
  for (const row of sheet.rows) {
    map.set(row.rowNumber as number, row.styleId as number | undefined);
  }
  return map;
}

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

