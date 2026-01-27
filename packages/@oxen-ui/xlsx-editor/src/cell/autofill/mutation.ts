/**
 * @file Spreadsheet autofill row mutation helpers
 *
 * Utilities for building/merging sparse `Cell` updates into `XlsxRow` while preserving existing cells
 * outside the updated bounds. Used by the fill-handle (autofill) implementation.
 */

import type { CellAddress } from "@oxen/xlsx/domain/cell/address";
import type { Formula } from "@oxen/xlsx/domain/cell/formula";
import type { Cell, CellValue } from "@oxen/xlsx/domain/cell/types";
import type { XlsxRow } from "@oxen/xlsx/domain/workbook";
import { styleId } from "@oxen/xlsx/domain/types";
import type { PatternCell } from "./types";

function shouldCreateCell(patch: { readonly value: CellValue; readonly formula: Formula | undefined; readonly styleId: number | undefined }): boolean {
  if (patch.formula) {
    return true;
  }
  if (patch.value.type !== "empty") {
    return true;
  }
  if (patch.styleId !== undefined && patch.styleId !== 0) {
    return true;
  }
  return false;
}

function buildPatchedCell(params: {
  readonly address: CellAddress;
  readonly base: PatternCell;
  readonly value: CellValue;
  readonly formula: Formula | undefined;
}): Cell {
  const styleIdValue = params.base.effectiveStyleId;
  const baseCell: Cell = {
    address: params.address,
    value: params.value,
    ...(params.formula ? { formula: params.formula } : {}),
    ...(styleIdValue !== undefined && styleIdValue !== 0 ? { styleId: styleId(styleIdValue) } : {}),
  };
  return baseCell;
}

/**
 * Build a sparse `Cell` update when any of value/formula/style needs to be present.
 *
 * When the patch would be empty (no formula, empty value, no style), this returns `undefined`
 * so the caller can omit creating a `<c>` entry in the worksheet.
 */
export function buildCellIfNeeded(params: {
  readonly address: CellAddress;
  readonly base: PatternCell;
  readonly value: CellValue;
  readonly formula: Formula | undefined;
}): Cell | undefined {
  const styleIdValue = params.base.effectiveStyleId;
  if (!shouldCreateCell({ value: params.value, formula: params.formula, styleId: styleIdValue })) {
    return undefined;
  }
  return buildPatchedCell(params);
}

function filterCellsOutsideBounds(cells: readonly Cell[], colBounds: { readonly minCol: number; readonly maxCol: number }): readonly Cell[] {
  return cells.filter((cell) => {
    const colNumber = cell.address.col as number;
    return colNumber < colBounds.minCol || colNumber > colBounds.maxCol;
  });
}

/**
 * Merge `updates` into an existing row while clearing any existing cells within `colBounds`.
 *
 * Returns `undefined` when the resulting row has no cells and the row did not previously exist.
 */
export function upsertCellsIntoRow(
  row: XlsxRow | undefined,
  updates: readonly Cell[],
  colBounds: { readonly minCol: number; readonly maxCol: number },
): XlsxRow | undefined {
  if (!row && updates.length === 0) {
    return undefined;
  }

  const keptCells = row ? filterCellsOutsideBounds(row.cells, colBounds) : [];

  if (updates.length === 0) {
    if (!row) {
      return undefined;
    }
    if (keptCells.length === row.cells.length) {
      return row;
    }
    return { ...row, cells: keptCells };
  }

  const nextCells = [...keptCells, ...updates].sort((a, b) => (a.address.col as number) - (b.address.col as number));
  if (!row) {
    return { rowNumber: updates[0]!.address.row, cells: nextCells };
  }
  if (nextCells.length === row.cells.length && nextCells.every((c, idx) => c === row.cells[idx])) {
    return row;
  }
  return { ...row, cells: nextCells };
}
