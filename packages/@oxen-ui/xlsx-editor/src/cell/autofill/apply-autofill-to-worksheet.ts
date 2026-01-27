/**
 * @file Spreadsheet fill handle implementation (autofill)
 *
 * Applies an Excel-like autofill from a base range to a target range:
 * - Numeric/date series when the entire base segment is a compatible series
 * - Otherwise repeats the base pattern (including formulas, with relative refs shifted)
 * - Copies the effective style (cell/row/col) from the base pattern
 *
 * The mutation is intentionally sparse: it creates cells only when value/formula/style need to exist.
 */

import type { CellAddress, CellRange } from "@oxen/xlsx/domain/cell/address";
import type { Formula } from "@oxen/xlsx/domain/cell/formula";
import type { Cell } from "@oxen/xlsx/domain/cell/types";
import type { XlsxRow, XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import { colIdx, rowIdx } from "@oxen/xlsx/domain/types";
import { shiftFormulaReferences } from "@oxen/xlsx/formula/shift";
import { buildCellLookup, buildRowStyleIdMap, getColumnStyleId } from "./pattern";
import { getFillColCount, getFillRowCount, computeDirection, getRangeBounds, normalizeRange } from "./range";
import { buildCellIfNeeded, upsertCellsIntoRow } from "./mutation";
import { computeDateFillValue, computeNumericFillValue, computeNumericSeries, getRepeatIndex } from "./series";
import type { PatternCell, PatternSeries } from "./types";
import { EMPTY_VALUE } from "./types";

/**
 * Apply autofill edits to a worksheet, extending `baseRange` to match `targetRange`.
 *
 * This is called by the XLSX editor reducer when the user commits a fill-handle drag.
 */
export function applyAutofillToWorksheet(params: {
  readonly worksheet: XlsxWorksheet;
  readonly baseRange: CellRange;
  readonly targetRange: CellRange;
}): XlsxWorksheet {
  const baseRange = normalizeRange(params.baseRange);
  const targetRange = normalizeRange(params.targetRange);

  const baseBounds = getRangeBounds(baseRange);
  const targetBounds = getRangeBounds(targetRange);

  const direction = computeDirection(baseBounds, targetBounds);

  const fillRowCount = getFillRowCount(direction, baseBounds, targetBounds);
  const fillColCount = getFillColCount(direction, baseBounds, targetBounds);

  if (fillRowCount <= 0 && fillColCount <= 0) {
    return params.worksheet;
  }

  const worksheet = params.worksheet;
  const rowStyleIds = buildRowStyleIdMap(worksheet);

  const baseCellLookup = buildCellLookup(worksheet, baseBounds);

  const columns = Array.from({ length: baseBounds.maxCol - baseBounds.minCol + 1 }, (_, i) => baseBounds.minCol + i);
  const rows = Array.from({ length: baseBounds.maxRow - baseBounds.minRow + 1 }, (_, i) => baseBounds.minRow + i);

  const patternByCol = new Map<number, readonly PatternCell[]>();
  const seriesByCol = new Map<number, PatternSeries>();

  for (const colNumber of columns) {
    const colStyleId = getColumnStyleId(worksheet, colNumber);
    const pattern: PatternCell[] = rows.map((rowNumber) => {
      const rowStyleId = rowStyleIds.get(rowNumber);
      const cell = baseCellLookup.get(rowNumber)?.get(colNumber);
      const effectiveStyleId = (cell?.styleId as number | undefined) ?? rowStyleId ?? colStyleId;
      const origin: CellAddress = { col: colIdx(colNumber), row: rowIdx(rowNumber), colAbsolute: false, rowAbsolute: false };
      return {
        value: cell?.value ?? EMPTY_VALUE,
        formula: cell?.formula,
        effectiveStyleId,
        origin,
      };
    });
    patternByCol.set(colNumber, pattern);
    seriesByCol.set(colNumber, computeNumericSeries(pattern));
  }

  const isForwardFill = direction === "down" || direction === "right";

  const buildVerticalUpdatesForRow = (rowNumber: number, stepIndex: number): readonly Cell[] => {
    const directionKind = direction === "up" ? "backward" : "forward";
    return columns
      .map((colNumber): Cell | undefined => {
        const pattern = patternByCol.get(colNumber);
        if (!pattern) {
          return undefined;
        }
        const baseIndex = getRepeatIndex(stepIndex, pattern.length, directionKind);
        const base = pattern[baseIndex]!;

        const series = seriesByCol.get(colNumber) ?? { type: "repeat" as const };
        const address: CellAddress = { col: colIdx(colNumber), row: rowIdx(rowNumber), colAbsolute: false, rowAbsolute: false };

        if (series.type === "numeric") {
          const styleBase = isForwardFill ? pattern[pattern.length - 1]! : pattern[0]!;
          const stepAmount = stepIndex + 1;
          const value = computeNumericFillValue(series, stepAmount, isForwardFill);
          return buildCellIfNeeded({ address, base: styleBase, value: { type: "number", value }, formula: undefined });
        }

        if (series.type === "date") {
          const styleBase = isForwardFill ? pattern[pattern.length - 1]! : pattern[0]!;
          const stepAmount = stepIndex + 1;
          const value = computeDateFillValue(series, stepAmount, isForwardFill);
          return buildCellIfNeeded({ address, base: styleBase, value: { type: "date", value }, formula: undefined });
        }

        if (base.formula) {
          const deltaRows = (address.row as number) - (base.origin.row as number);
          const deltaCols = (address.col as number) - (base.origin.col as number);
          const shifted = shiftFormulaReferences(base.formula.expression, deltaCols, deltaRows);
          const formula: Formula = { ...base.formula, expression: shifted };
          return buildCellIfNeeded({ address, base, value: EMPTY_VALUE, formula });
        }

        return buildCellIfNeeded({ address, base, value: base.value, formula: undefined });
      })
      .filter((cell): cell is Cell => cell !== undefined);
  };

  if (direction === "down" || direction === "up") {
    const startRow = direction === "down" ? baseBounds.maxRow + 1 : baseBounds.minRow - 1;
    const step = direction === "down" ? 1 : -1;
    const count = fillRowCount;

    const updatesByRow = new Map<number, readonly Cell[]>();
    for (let i = 0; i < count; i += 1) {
      const rowNumber = startRow + step * i;
      updatesByRow.set(rowNumber, buildVerticalUpdatesForRow(rowNumber, i));
    }

    const nextRows: XlsxRow[] = [];
    const seenUpdatedRows = new Set<number>();

    for (const row of worksheet.rows) {
      const rowNumber = row.rowNumber as number;
      const updates = updatesByRow.get(rowNumber) ?? [];
      const shouldClear = updatesByRow.has(rowNumber);
      if (!shouldClear) {
        nextRows.push(row);
        continue;
      }
      const updatedRow = upsertCellsIntoRow(row, updates, { minCol: baseBounds.minCol, maxCol: baseBounds.maxCol });
      if (updatedRow) {
        nextRows.push(updatedRow);
      }
      seenUpdatedRows.add(rowNumber);
    }

    for (const [rowNumber, updates] of updatesByRow.entries()) {
      if (seenUpdatedRows.has(rowNumber)) {
        continue;
      }
      const created = upsertCellsIntoRow(undefined, updates, { minCol: baseBounds.minCol, maxCol: baseBounds.maxCol });
      if (created) {
        nextRows.push(created);
      }
    }

    nextRows.sort((a, b) => (a.rowNumber as number) - (b.rowNumber as number));
    return { ...worksheet, rows: nextRows };
  }

  const directionKind = direction === "left" ? "backward" : "forward";
  const baseWidth = columns.length;
  const updatesByRow = new Map<number, readonly Cell[]>();

  const seriesByRow = new Map<number, PatternSeries>();
  for (const rowNumber of rows) {
    const rowIndex = rowNumber - baseBounds.minRow;
    const rowPattern = columns
      .map((colNumber) => patternByCol.get(colNumber)?.[rowIndex])
      .filter((cell): cell is PatternCell => cell !== undefined);
    seriesByRow.set(rowNumber, computeNumericSeries(rowPattern));
  }

  for (const rowNumber of rows) {
    const rowUpdates: Cell[] = [];
    const rowSeries = seriesByRow.get(rowNumber) ?? { type: "repeat" as const };

    const rowIndex = rowNumber - baseBounds.minRow;
    const first = patternByCol.get(columns[0]!)?.[rowIndex];
    const last = patternByCol.get(columns[columns.length - 1]!)?.[rowIndex];
    const styleBaseForSeries = direction === "right" ? last : first;

    for (let i = 0; i < fillColCount; i += 1) {
      const colNumber = direction === "right" ? baseBounds.maxCol + 1 + i : baseBounds.minCol - 1 - i;
      const cycleIndex = getRepeatIndex(i, baseWidth, directionKind);
      const baseColNumber = columns[cycleIndex]!;

      const colPattern = patternByCol.get(baseColNumber);
      if (!colPattern) {
        continue;
      }

      const baseRowIndex = rowNumber - baseBounds.minRow;
      const base = colPattern[baseRowIndex]!;

      const address: CellAddress = { col: colIdx(colNumber), row: rowIdx(rowNumber), colAbsolute: false, rowAbsolute: false };

      if (rowSeries.type === "numeric" && styleBaseForSeries) {
        const stepAmount = i + 1;
        const value = computeNumericFillValue(rowSeries, stepAmount, isForwardFill);
        const cell = buildCellIfNeeded({ address, base: styleBaseForSeries, value: { type: "number", value }, formula: undefined });
        if (cell) {
          rowUpdates.push(cell);
        }
        continue;
      }

      if (rowSeries.type === "date" && styleBaseForSeries) {
        const stepAmount = i + 1;
        const value = computeDateFillValue(rowSeries, stepAmount, isForwardFill);
        const cell = buildCellIfNeeded({ address, base: styleBaseForSeries, value: { type: "date", value }, formula: undefined });
        if (cell) {
          rowUpdates.push(cell);
        }
        continue;
      }

      if (base.formula) {
        const deltaRows = (address.row as number) - (base.origin.row as number);
        const deltaCols = (address.col as number) - (base.origin.col as number);
        const shifted = shiftFormulaReferences(base.formula.expression, deltaCols, deltaRows);
        const formula: Formula = { ...base.formula, expression: shifted };
        const cell = buildCellIfNeeded({ address, base, value: EMPTY_VALUE, formula });
        if (cell) {
          rowUpdates.push(cell);
        }
        continue;
      }

      const cell = buildCellIfNeeded({ address, base, value: base.value, formula: undefined });
      if (cell) {
        rowUpdates.push(cell);
      }
    }
    updatesByRow.set(rowNumber, rowUpdates);
  }

  const getClearBounds = (): { readonly minCol: number; readonly maxCol: number } => {
    if (direction === "right") {
      return { minCol: baseBounds.maxCol + 1, maxCol: targetBounds.maxCol };
    }
    return { minCol: targetBounds.minCol, maxCol: baseBounds.minCol - 1 };
  };
  const clearBounds = getClearBounds();

  const nextRows: XlsxRow[] = [];
  const seenUpdatedRows = new Set<number>();

  for (const row of worksheet.rows) {
    const rowNumber = row.rowNumber as number;
    if (rowNumber < baseBounds.minRow || rowNumber > baseBounds.maxRow) {
      nextRows.push(row);
      continue;
    }

    const updates = updatesByRow.get(rowNumber) ?? [];
    const updatedRow = upsertCellsIntoRow(row, updates, clearBounds);
    if (updatedRow) {
      nextRows.push(updatedRow);
    }
    seenUpdatedRows.add(rowNumber);
  }

  for (const [rowNumber, updates] of updatesByRow.entries()) {
    if (seenUpdatedRows.has(rowNumber)) {
      continue;
    }
    const created = upsertCellsIntoRow(undefined, updates, clearBounds);
    if (created) {
      nextRows.push(created);
    }
  }

  nextRows.sort((a, b) => (a.rowNumber as number) - (b.rowNumber as number));
  return { ...worksheet, rows: nextRows };
}
