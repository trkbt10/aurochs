/**
 * @file Cell range utilities
 *
 * Validation helpers, address shift utilities, and generic helpers
 * used by row and column mutation operations.
 */

import type { Cell } from "@oxen/xlsx/domain/cell/types";
import type { CellAddress, CellRange } from "@oxen/xlsx/domain/cell/address";
import type { XlsxColumnDef, XlsxRow } from "@oxen/xlsx/domain/workbook";
import { colIdx, rowIdx, type ColIndex, type RowIndex } from "@oxen/xlsx/domain/types";

// =============================================================================
// Validation Helpers
// =============================================================================





















/**
 * Assert that a value is a positive integer
 */
export function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer: ${value}`);
  }
}





















/**
 * Assert that a value is a valid 1-based row index
 */
export function assertValidRowIndex(value: RowIndex, label: string): void {
  const n = value as number;
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`${label} must be a 1-based integer RowIndex: ${n}`);
  }
}





















/**
 * Assert that a value is a valid 1-based column index
 */
export function assertValidColIndex(value: ColIndex, label: string): void {
  const n = value as number;
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`${label} must be a 1-based integer ColIndex: ${n}`);
  }
}





















/**
 * Assert that a value is a finite number
 */
export function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number: ${value}`);
  }
}

// =============================================================================
// Type Conversion Helpers
// =============================================================================





















/**
 * Convert RowIndex to number
 */
export function toRowNumber(v: RowIndex): number {
  return v as number;
}





















/**
 * Convert ColIndex to number
 */
export function toColNumber(v: ColIndex): number {
  return v as number;
}

// =============================================================================
// Cell Address Shift Utilities
// =============================================================================





















/**
 * Shift a cell address by row and column delta
 */
export function shiftCellAddressByAddress(
  address: CellAddress,
  rowDelta: number,
  colDelta: number,
): CellAddress {
  const nextRow = toRowNumber(address.row) + rowDelta;
  const nextCol = toColNumber(address.col) + colDelta;

  if (nextRow < 1 || !Number.isInteger(nextRow)) {
    throw new Error(`Invalid row after shift: ${nextRow}`);
  }
  if (nextCol < 1 || !Number.isInteger(nextCol)) {
    throw new Error(`Invalid column after shift: ${nextCol}`);
  }

  return {
    ...address,
    row: rowIdx(nextRow),
    col: colIdx(nextCol),
  };
}





















/**
 * Shift a cell's address by row and column delta
 */
export function shiftCellAddress(cell: Cell, rowDelta: number, colDelta: number): Cell {
  if (rowDelta === 0 && colDelta === 0) {return cell;}
  return {
    ...cell,
    address: shiftCellAddressByAddress(cell.address, rowDelta, colDelta),
  };
}

// =============================================================================
// Cell Range Shift Utilities - Row Operations
// =============================================================================





















/**
 * Shift a cell range after row insertion
 */
export function shiftCellRangeRowsInsert(
  range: CellRange,
  startRow: RowIndex,
  count: number,
): CellRange {
  const minRow = Math.min(toRowNumber(range.start.row), toRowNumber(range.end.row));
  const maxRow = Math.max(toRowNumber(range.start.row), toRowNumber(range.end.row));
  const insertAt = toRowNumber(startRow);

  if (maxRow < insertAt) {return range;}
  if (minRow >= insertAt) {
    return {
      ...range,
      start: shiftCellAddressByAddress(range.start, count, 0),
      end: shiftCellAddressByAddress(range.end, count, 0),
    };
  }

  const newMaxRow = maxRow + count;
  return {
    ...range,
    end: {
      ...range.end,
      row: rowIdx(newMaxRow),
    },
  };
}





















/**
 * Shift a cell range after row deletion
 */
export function shiftCellRangeRowsDelete(
  range: CellRange,
  startRow: RowIndex,
  count: number,
): CellRange | undefined {
  const minRow = Math.min(toRowNumber(range.start.row), toRowNumber(range.end.row));
  const maxRow = Math.max(toRowNumber(range.start.row), toRowNumber(range.end.row));

  const delStart = toRowNumber(startRow);
  const delEnd = delStart + count - 1;

  if (maxRow < delStart) {return range;}
  if (minRow > delEnd) {
    return {
      ...range,
      start: shiftCellAddressByAddress(range.start, -count, 0),
      end: shiftCellAddressByAddress(range.end, -count, 0),
    };
  }

  if (delStart <= minRow && delEnd >= maxRow) {
    return undefined;
  }

  const overlapStart = Math.max(minRow, delStart);
  const overlapEnd = Math.min(maxRow, delEnd);
  const removed = Math.max(0, overlapEnd - overlapStart + 1);

  const newMinRow = delStart <= minRow ? delStart : minRow;
  const newMaxRow = maxRow - removed;

  return {
    ...range,
    start: {
      ...range.start,
      row: rowIdx(newMinRow),
    },
    end: {
      ...range.end,
      row: rowIdx(newMaxRow),
    },
  };
}

// =============================================================================
// Cell Range Shift Utilities - Column Operations
// =============================================================================





















/**
 * Shift a cell range after column insertion
 */
export function shiftCellRangeColsInsert(
  range: CellRange,
  startCol: ColIndex,
  count: number,
): CellRange {
  const minCol = Math.min(toColNumber(range.start.col), toColNumber(range.end.col));
  const maxCol = Math.max(toColNumber(range.start.col), toColNumber(range.end.col));
  const insertAt = toColNumber(startCol);

  if (maxCol < insertAt) {return range;}
  if (minCol >= insertAt) {
    return {
      ...range,
      start: shiftCellAddressByAddress(range.start, 0, count),
      end: shiftCellAddressByAddress(range.end, 0, count),
    };
  }

  const newMaxCol = maxCol + count;
  return {
    ...range,
    end: {
      ...range.end,
      col: colIdx(newMaxCol),
    },
  };
}





















/**
 * Shift a cell range after column deletion
 */
export function shiftCellRangeColsDelete(
  range: CellRange,
  startCol: ColIndex,
  count: number,
): CellRange | undefined {
  const minCol = Math.min(toColNumber(range.start.col), toColNumber(range.end.col));
  const maxCol = Math.max(toColNumber(range.start.col), toColNumber(range.end.col));

  const delStart = toColNumber(startCol);
  const delEnd = delStart + count - 1;

  if (maxCol < delStart) {return range;}
  if (minCol > delEnd) {
    return {
      ...range,
      start: shiftCellAddressByAddress(range.start, 0, -count),
      end: shiftCellAddressByAddress(range.end, 0, -count),
    };
  }

  if (delStart <= minCol && delEnd >= maxCol) {
    return undefined;
  }

  const overlapStart = Math.max(minCol, delStart);
  const overlapEnd = Math.min(maxCol, delEnd);
  const removed = Math.max(0, overlapEnd - overlapStart + 1);

  const newMinCol = delStart <= minCol ? delStart : minCol;
  const newMaxCol = maxCol - removed;

  return {
    ...range,
    start: {
      ...range.start,
      col: colIdx(newMinCol),
    },
    end: {
      ...range.end,
      col: colIdx(newMaxCol),
    },
  };
}

// =============================================================================
// Generic Helpers
// =============================================================================





















/**
 * Map array values, filtering out undefined results
 */
export function mapDefined<T>(
  values: readonly T[] | undefined,
  mapper: (value: T) => T | undefined,
): readonly T[] | undefined {
  if (!values) {return undefined;}
  const next: T[] = [];
  for (const value of values) {
    const mapped = mapper(value);
    if (mapped !== undefined) {next.push(mapped);}
  }
  return next;
}





















/**
 * Map an optional value
 */
export function mapOptional<T, R>(value: T | undefined, mapper: (value: T) => R): R | undefined {
  if (value === undefined) {return undefined;}
  return mapper(value);
}

// =============================================================================
// Row Collection Helpers
// =============================================================================





















/**
 * Update or insert a row in a row collection
 */
export function updateRowCollection(
  rows: readonly XlsxRow[],
  rowIndex: RowIndex,
  update: (row: XlsxRow | undefined) => XlsxRow,
): readonly XlsxRow[] {
  const target = toRowNumber(rowIndex);
  const existingIndex = rows.findIndex((r) => toRowNumber(r.rowNumber) === target);

  if (existingIndex >= 0) {
    const next = [...rows];
    next[existingIndex] = update(rows[existingIndex]);
    return next;
  }

  const created = update(undefined);
  const insertIndex = rows.findIndex((r) => toRowNumber(r.rowNumber) > target);
  if (insertIndex === -1) {return [...rows, created];}
  return [...rows.slice(0, insertIndex), created, ...rows.slice(insertIndex)];
}





















/**
 * Shift row numbers by a delta starting from a row index
 */
export function shiftRowNumbers(
  rows: readonly XlsxRow[],
  startRow: RowIndex,
  delta: number,
): readonly XlsxRow[] {
  const start = toRowNumber(startRow);
  return rows.map((row) => {
    const rowNumber = toRowNumber(row.rowNumber);
    if (rowNumber < start) {return row;}

    const nextRowNumber = rowNumber + delta;
    if (nextRowNumber < 1 || !Number.isInteger(nextRowNumber)) {
      throw new Error(`Invalid rowNumber after shift: ${nextRowNumber}`);
    }

    return {
      ...row,
      rowNumber: rowIdx(nextRowNumber),
      cells: row.cells.map((cell) => shiftCellAddress(cell, delta, 0)),
    };
  });
}

// =============================================================================
// Column Definition Helpers
// =============================================================================





















/**
 * Update column definitions after column insertion/deletion
 */
export function updateColumnDefs(
  columns: readonly XlsxColumnDef[] | undefined,
  startCol: ColIndex,
  delta: number,
): readonly XlsxColumnDef[] | undefined {
  if (!columns) {return undefined;}
  if (delta === 0) {return columns;}

  const start = toColNumber(startCol);
  return columns.map((col) => {
    const min = toColNumber(col.min);
    const max = toColNumber(col.max);

    if (max < start) {return col;}
    if (min >= start) {
      return {
        ...col,
        min: colIdx(min + delta),
        max: colIdx(max + delta),
      };
    }

    return {
      ...col,
      max: colIdx(max + delta),
    };
  });
}

function splitColumnDefAt(
  def: XlsxColumnDef,
  col: ColIndex,
  override: Partial<XlsxColumnDef>,
): readonly XlsxColumnDef[] {
  const min = toColNumber(def.min);
  const max = toColNumber(def.max);
  const target = toColNumber(col);

  if (target < min || target > max) {return [def];}
  if (min === max && min === target) {
    return [{ ...def, ...override, min: col, max: col }];
  }

  const next: XlsxColumnDef[] = [];

  if (min < target) {
    next.push({ ...def, max: colIdx(target - 1) });
  }

  next.push({ ...def, ...override, min: col, max: col });

  if (target < max) {
    next.push({ ...def, min: colIdx(target + 1) });
  }

  return next;
}

function normalizeColumnDefs(columns: readonly XlsxColumnDef[]): readonly XlsxColumnDef[] {
  if (columns.length <= 1) {return columns;}
  const merged: XlsxColumnDef[] = [];

  for (const def of columns) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push(def);
      continue;
    }

    const lastMax = toColNumber(last.max);
    const defMin = toColNumber(def.min);
    const contiguous = lastMax + 1 === defMin;
    const sameProps =
      last.width === def.width &&
      last.hidden === def.hidden &&
      last.bestFit === def.bestFit &&
      last.styleId === def.styleId;

    if (contiguous && sameProps) {
      merged[merged.length - 1] = { ...last, max: def.max };
    } else {
      merged.push(def);
    }
  }

  return merged;
}











function isColumnInRange(col: ColIndex, def: XlsxColumnDef): boolean {
  return toColNumber(def.min) <= toColNumber(col) && toColNumber(col) <= toColNumber(def.max);
}











/**
 * Apply an override to a column definition
 */
export function applyColumnOverride(
  columns: readonly XlsxColumnDef[] | undefined,
  col: ColIndex,
  override: Partial<XlsxColumnDef>,
): readonly XlsxColumnDef[] {
  if (!columns || columns.length === 0) {
    return [{ min: col, max: col, ...override }];
  }

  const result = columns.reduce<{
    readonly defs: readonly XlsxColumnDef[];
    readonly covered: boolean;
  }>(
    (acc, def) => {
      if (isColumnInRange(col, def)) {
        return {
          defs: [...acc.defs, ...splitColumnDefAt(def, col, override)],
          covered: true,
        };
      }
      return { defs: [...acc.defs, def], covered: acc.covered };
    },
    { defs: [], covered: false },
  );

  const next = result.covered ? result.defs : [...result.defs, { min: col, max: col, ...override }];
  const sorted = [...next].sort((a, b) => toColNumber(a.min) - toColNumber(b.min));
  return [...normalizeColumnDefs(sorted)];
}

/**
 * Apply an override to a range of columns (inclusive).
 *
 * This is used by editor operations like applying a style to whole columns
 * without iterating and re-normalizing per column.
 */
export function applyColumnRangeOverride(
  columns: readonly XlsxColumnDef[] | undefined,
  startCol: ColIndex,
  endCol: ColIndex,
  override: Partial<XlsxColumnDef>,
): readonly XlsxColumnDef[] {
  const min = Math.min(toColNumber(startCol), toColNumber(endCol));
  const max = Math.max(toColNumber(startCol), toColNumber(endCol));

  if (!columns || columns.length === 0) {
    return [{ min: colIdx(min), max: colIdx(max), ...override }];
  }

  const sorted = [...columns].sort((a, b) => toColNumber(a.min) - toColNumber(b.min));
  const next: XlsxColumnDef[] = [];
  const cursorState = { cursor: min };

  for (const def of sorted) {
    const defMin = toColNumber(def.min);
    const defMax = toColNumber(def.max);

    if (defMax < min) {
      next.push(def);
      continue;
    }

    if (defMin > max) {
      if (cursorState.cursor <= max) {
        next.push({ min: colIdx(cursorState.cursor), max: colIdx(max), ...override });
        cursorState.cursor = max + 1;
      }
      next.push(def);
      continue;
    }

    if (defMin < min) {
      next.push({ ...def, max: colIdx(min - 1) });
    }

    if (cursorState.cursor < defMin) {
      const gapMax = Math.min(defMin - 1, max);
      if (cursorState.cursor <= gapMax) {
        next.push({ min: colIdx(cursorState.cursor), max: colIdx(gapMax), ...override });
        cursorState.cursor = gapMax + 1;
      }
    }

    const overlapMin = Math.max(defMin, min);
    const overlapMax = Math.min(defMax, max);
    next.push({ ...def, ...override, min: colIdx(overlapMin), max: colIdx(overlapMax) });
    cursorState.cursor = Math.max(cursorState.cursor, overlapMax + 1);

    if (defMax > max) {
      next.push({ ...def, min: colIdx(max + 1) });
    }
  }

  if (cursorState.cursor <= max) {
    next.push({ min: colIdx(cursorState.cursor), max: colIdx(max), ...override });
  }

  const normalized = [...normalizeColumnDefs(next.sort((a, b) => toColNumber(a.min) - toColNumber(b.min)))];
  return normalized;
}





















/**
 * Update column definitions after column deletion
 */
export function updateColumnDefsForDeletion(
  columns: readonly XlsxColumnDef[] | undefined,
  startCol: ColIndex,
  count: number,
): readonly XlsxColumnDef[] | undefined {
  if (!columns) {return undefined;}
  if (columns.length === 0) {return columns;}

  const delStart = toColNumber(startCol);
  const delEnd = delStart + count - 1;

  const next: XlsxColumnDef[] = [];

  for (const col of columns) {
    const min = toColNumber(col.min);
    const max = toColNumber(col.max);

    if (max < delStart) {
      next.push(col);
      continue;
    }

    if (min > delEnd) {
      next.push({
        ...col,
        min: colIdx(min - count),
        max: colIdx(max - count),
      });
      continue;
    }

    if (delStart <= min && delEnd >= max) {
      continue;
    }

    const overlapStart = Math.max(min, delStart);
    const overlapEnd = Math.min(max, delEnd);
    const removed = Math.max(0, overlapEnd - overlapStart + 1);

    const newMin = delStart <= min ? delStart : min;
    const newMax = max - removed;

    next.push({
      ...col,
      min: colIdx(newMin),
      max: colIdx(newMax),
    });
  }

  next.sort((a, b) => toColNumber(a.min) - toColNumber(b.min));
  return normalizeColumnDefs(next);
}
