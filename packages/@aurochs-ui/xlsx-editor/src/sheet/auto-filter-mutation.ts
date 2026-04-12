/**
 * @file Auto Filter mutation operations
 *
 * Operations for managing auto filter on worksheets.
 */

import type { XlsxWorkbook, XlsxWorksheet, XlsxRow } from "@aurochs-office/xlsx/domain/workbook";
import type { XlsxAutoFilter, XlsxFilterType, XlsxFilterColumn, XlsxSortCondition, XlsxSortState } from "@aurochs-office/xlsx/domain/auto-filter";
import { evaluateAutoFilter } from "@aurochs-office/xlsx/domain/auto-filter-evaluator";
import { sortWorksheetRows } from "@aurochs-office/xlsx/domain/sort";
import { colIdx, rowIdx } from "@aurochs-office/xlsx/domain/types";
import { formatRange } from "@aurochs-office/xlsx/domain/cell/address";

function assertValidSheetIndex(workbook: XlsxWorkbook, sheetIndex: number): void {
  if (!Number.isInteger(sheetIndex)) {
    throw new Error("sheetIndex must be an integer");
  }
  if (sheetIndex < 0 || sheetIndex >= workbook.sheets.length) {
    throw new Error(`sheetIndex out of range: ${sheetIndex}`);
  }
}

function updateSheet(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  update: Partial<XlsxWorksheet>,
): XlsxWorkbook {
  const sheets = workbook.sheets.map((sheet, idx) =>
    idx === sheetIndex ? { ...sheet, ...update } : sheet,
  );
  return { ...workbook, sheets };
}

/**
 * Determine the data start row for sorting.
 * If start and end rows are the same (single-row range), use the start row as-is.
 * Otherwise, offset the header row by 1 to begin at the first data row.
 */
function computeDataStartRow(
  startRow: ReturnType<typeof rowIdx>,
  endRow: ReturnType<typeof rowIdx>,
  headerRow: number,
): ReturnType<typeof rowIdx> {
  if (startRow === endRow) {
    return startRow;
  }
  return rowIdx(headerRow + 1);
}

/**
 * Set auto filter on a sheet
 */
export function setAutoFilter(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  autoFilter: XlsxAutoFilter | undefined,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  return updateSheet(workbook, sheetIndex, { autoFilter });
}

/**
 * Clear auto filter from a sheet
 */
export function clearAutoFilter(
  workbook: XlsxWorkbook,
  sheetIndex: number,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  return updateSheet(workbook, sheetIndex, { autoFilter: undefined });
}

// =============================================================================
// Filter Column Operations
// =============================================================================

export type SetFilterColumnParams = {
  readonly workbook: XlsxWorkbook;
  readonly sheetIndex: number;
  /** 0-based column index relative to autoFilter ref */
  readonly colId: number;
  /** Filter to apply, or undefined to clear this column's filter */
  readonly filter: XlsxFilterType | undefined;
};

/**
 * Compute updated filterColumns after applying or removing a filter on a specific column.
 */
function computeFilterColumns(
  existingColumns: readonly XlsxFilterColumn[],
  colIdIdx: ReturnType<typeof colIdx>,
  filter: XlsxFilterType | undefined,
): readonly XlsxFilterColumn[] {
  if (filter === undefined) {
    return existingColumns.filter((fc) => fc.colId !== colIdIdx);
  }
  const existingIndex = existingColumns.findIndex((fc) => fc.colId === colIdIdx);
  if (existingIndex >= 0) {
    return existingColumns.map((fc, i) =>
      i === existingIndex ? { ...fc, filter } : fc,
    );
  }
  return [...existingColumns, { colId: colIdIdx, filter }];
}

/**
 * Apply a filter condition to a specific column.
 * Updates filterColumn and recalculates row visibility.
 */
export function setFilterColumn(params: SetFilterColumnParams): XlsxWorkbook {
  const { workbook, sheetIndex, colId, filter } = params;
  assertValidSheetIndex(workbook, sheetIndex);
  const sheet = workbook.sheets[sheetIndex];
  const autoFilter = sheet.autoFilter;
  if (!autoFilter) {
    throw new Error("Cannot set filter column: no autoFilter defined on this sheet");
  }

  const existingColumns = autoFilter.filterColumns ?? [];
  const colIdIdx = colIdx(colId);
  const newColumns = computeFilterColumns(existingColumns, colIdIdx, filter);

  const newAutoFilter: XlsxAutoFilter = {
    ...autoFilter,
    filterColumns: newColumns.length > 0 ? newColumns : undefined,
  };

  // Recalculate row visibility
  const updatedSheet = applyFilterVisibility(sheet, newAutoFilter);
  return updateSheet(workbook, sheetIndex, updatedSheet);
}

/**
 * Clear all filters (but keep autoFilter range).
 * Shows all hidden rows that were hidden by the filter.
 */
export function clearAllFilters(
  workbook: XlsxWorkbook,
  sheetIndex: number,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  const sheet = workbook.sheets[sheetIndex];
  const autoFilter = sheet.autoFilter;
  if (!autoFilter) {
    return workbook;
  }

  const newAutoFilter: XlsxAutoFilter = {
    ref: autoFilter.ref,
    // Keep sortState, clear filterColumns
    sortState: autoFilter.sortState,
  };

  // Show all rows within the filter range
  const updatedSheet = applyFilterVisibility(sheet, newAutoFilter);
  return updateSheet(workbook, sheetIndex, updatedSheet);
}

// =============================================================================
// Sort Operations
// =============================================================================

/**
 * Apply sort to the autoFilter range.
 * Reorders rows and updates sortState.
 */
export function applySort(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  sortCondition: XlsxSortCondition,
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  const sheet = workbook.sheets[sheetIndex];
  const autoFilter = sheet.autoFilter;
  if (!autoFilter) {
    throw new Error("Cannot apply sort: no autoFilter defined on this sheet");
  }

  // Build sortState from the autoFilter ref (data range, excluding header)
  const refStartRow = autoFilter.ref.start.row as number;
  const refEndRow = autoFilter.ref.end.row as number;
  const headerRow = Math.min(refStartRow, refEndRow);

  // Build data range ref for the sortState (header+1 to end)
  const dataStartRow = computeDataStartRow(autoFilter.ref.start.row, autoFilter.ref.end.row, headerRow);
  const dataRange = {
    ...autoFilter.ref,
    start: { ...autoFilter.ref.start, row: dataStartRow },
  };

  const sortState: XlsxSortState = {
    ref: formatRange(dataRange),
    sortConditions: [sortCondition],
  };

  // Sort the worksheet rows
  const sortedSheet = sortWorksheetRows(sheet, sortState, autoFilter.ref);

  // Update autoFilter with new sortState
  const newAutoFilter: XlsxAutoFilter = {
    ...autoFilter,
    sortState,
  };

  return updateSheet(workbook, sheetIndex, {
    ...sortedSheet,
    autoFilter: newAutoFilter,
  });
}

// =============================================================================
// Internal: Row visibility recalculation
// =============================================================================

/**
 * Recalculate row visibility based on the given autoFilter configuration.
 *
 * Updates `row.hidden` for rows within the autoFilter range.
 * Rows outside the range are not modified.
 */
function applyFilterVisibility(
  sheet: XlsxWorksheet,
  autoFilter: XlsxAutoFilter,
): Partial<XlsxWorksheet> {
  const hiddenRowSet = evaluateAutoFilter(autoFilter, sheet);
  const refStartRow = Math.min(autoFilter.ref.start.row as number, autoFilter.ref.end.row as number);
  const refEndRow = Math.max(autoFilter.ref.start.row as number, autoFilter.ref.end.row as number);

  const newRows: XlsxRow[] = sheet.rows.map((row) => {
    const rn = row.rowNumber as number;
    // Only modify rows within the autoFilter data range (not header)
    if (rn > refStartRow && rn <= refEndRow) {
      const shouldHide = hiddenRowSet.has(rn);
      if (row.hidden !== shouldHide) {
        return { ...row, hidden: shouldHide || undefined };
      }
    }
    return row;
  });

  return {
    autoFilter,
    rows: newRows,
  };
}
