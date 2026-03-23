/**
 * @file Column mutation operations
 *
 * Operations for inserting, deleting, resizing, and hiding columns.
 */

import type { XlsxWorksheet } from "../workbook";
import { colIdx, type ColIndex, type StyleId } from "../types";
import {
  assertPositiveInteger,
  assertValidColIndex,
  assertFiniteNumber,
  toColNumber,
  shiftCellAddress,
  updateColumnDefs,
  updateColumnDefsForDeletion,
  applyColumnOverride,
  shiftCellRangeColsInsert,
  shiftCellRangeColsDelete,
  mapDefined,
  mapOptional,
} from "./cell-range-utils";

/**
 * Insert columns at the specified position
 */
export function insertColumns(worksheet: XlsxWorksheet, startCol: ColIndex, count: number): XlsxWorksheet {
  assertValidColIndex(startCol, "startCol");
  assertPositiveInteger(count, "count");

  return {
    ...worksheet,
    columns: updateColumnDefs(worksheet.columns, startCol, count),
    rows: worksheet.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => {
        if (toColNumber(cell.address.col) < toColNumber(startCol)) {
          return cell;
        }
        return shiftCellAddress(cell, 0, count);
      }),
    })),
    mergeCells: mapDefined(worksheet.mergeCells, (range) => shiftCellRangeColsInsert(range, startCol, count)),
    dimension: mapOptional(worksheet.dimension, (dimension) => shiftCellRangeColsInsert(dimension, startCol, count)),
  };
}

/**
 * Delete columns at the specified position
 */
export function deleteColumns(worksheet: XlsxWorksheet, startCol: ColIndex, count: number): XlsxWorksheet {
  assertValidColIndex(startCol, "startCol");
  assertPositiveInteger(count, "count");

  const delStart = toColNumber(startCol);
  const delEnd = delStart + count - 1;

  const rows = worksheet.rows.map((row) => {
    const remainingCells = row.cells
      .filter((cell) => {
        const col = toColNumber(cell.address.col);
        return col < delStart || col > delEnd;
      })
      .map((cell) => (toColNumber(cell.address.col) > delEnd ? shiftCellAddress(cell, 0, -count) : cell));

    return remainingCells === row.cells ? row : { ...row, cells: remainingCells };
  });

  return {
    ...worksheet,
    rows,
    columns: updateColumnDefsForDeletion(worksheet.columns, startCol, count),
    mergeCells: mapDefined(worksheet.mergeCells, (range) => shiftCellRangeColsDelete(range, startCol, count)),
    dimension: mapOptional(worksheet.dimension, (dimension) => shiftCellRangeColsDelete(dimension, startCol, count)),
  };
}

/**
 * Set the width of a column
 */
export function setColumnWidth(worksheet: XlsxWorksheet, colIndex: ColIndex, width: number): XlsxWorksheet {
  assertValidColIndex(colIndex, "colIndex");
  assertFiniteNumber(width, "width");
  if (width < 0) {
    throw new Error(`width must be >= 0: ${width}`);
  }

  return {
    ...worksheet,
    columns: applyColumnOverride(worksheet.columns, colIndex, { width, customWidth: true }),
  };
}

/**
 * Set the customWidth flag for a column.
 *
 * When customWidth is true, the column width was explicitly set by the user.
 * When false/undefined, the width is considered a default width that Excel
 * may recalculate.
 *
 * @param worksheet - The worksheet to modify
 * @param colIndex - The column index
 * @param customWidth - Whether the width is explicitly set
 *
 * @see ECMA-376 Part 4, Section 18.3.1.13 (col)
 */
export function setColumnCustomWidth(worksheet: XlsxWorksheet, colIndex: ColIndex, customWidth: boolean): XlsxWorksheet {
  assertValidColIndex(colIndex, "colIndex");

  return {
    ...worksheet,
    columns: applyColumnOverride(worksheet.columns, colIndex, {
      customWidth: customWidth ? true : undefined,
    }),
  };
}

/**
 * Hide columns at the specified position
 */
export function hideColumns(worksheet: XlsxWorksheet, startCol: ColIndex, count: number): XlsxWorksheet {
  assertValidColIndex(startCol, "startCol");
  assertPositiveInteger(count, "count");

  const start = toColNumber(startCol);
  const indices = Array.from({ length: count }, (_, i) => colIdx(start + i));
  const columns = indices.reduce((acc, col) => applyColumnOverride(acc, col, { hidden: true }), worksheet.columns);

  return { ...worksheet, columns };
}

/**
 * Unhide columns at the specified position
 */
export function unhideColumns(worksheet: XlsxWorksheet, startCol: ColIndex, count: number): XlsxWorksheet {
  assertValidColIndex(startCol, "startCol");
  assertPositiveInteger(count, "count");

  const start = toColNumber(startCol);
  const indices = Array.from({ length: count }, (_, i) => colIdx(start + i));
  const columns = indices.reduce((acc, col) => applyColumnOverride(acc, col, { hidden: undefined }), worksheet.columns);

  return { ...worksheet, columns };
}

/**
 * Set the outline level for a column
 *
 * @param worksheet - The worksheet to modify
 * @param colIndex - The column index (0-based)
 * @param outlineLevel - The outline level (0-7, 0 means no grouping)
 */
export function setColumnOutlineLevel(worksheet: XlsxWorksheet, colIndex: ColIndex, outlineLevel: number): XlsxWorksheet {
  assertValidColIndex(colIndex, "colIndex");
  if (outlineLevel < 0 || outlineLevel > 7) {
    throw new Error(`outlineLevel must be 0-7: ${outlineLevel}`);
  }

  return {
    ...worksheet,
    columns: applyColumnOverride(worksheet.columns, colIndex, {
      outlineLevel: outlineLevel === 0 ? undefined : outlineLevel,
    }),
  };
}

/**
 * Group columns by increasing their outline level
 *
 * @param worksheet - The worksheet to modify
 * @param startCol - The starting column index (0-based)
 * @param count - Number of columns to group
 */
export function groupColumns(worksheet: XlsxWorksheet, startCol: ColIndex, count: number): XlsxWorksheet {
  assertValidColIndex(startCol, "startCol");
  assertPositiveInteger(count, "count");

  const start = toColNumber(startCol);
  const indices = Array.from({ length: count }, (_, i) => colIdx(start + i));

  const columnsRef = { value: worksheet.columns };
  for (const col of indices) {
    const currentDef = columnsRef.value?.find((c) => c.min <= col && c.max >= col);
    const currentLevel = currentDef?.outlineLevel ?? 0;
    const newLevel = Math.min(currentLevel + 1, 7);
    columnsRef.value = applyColumnOverride(columnsRef.value, col, { outlineLevel: newLevel });
  }

  return { ...worksheet, columns: columnsRef.value };
}

/**
 * Ungroup columns by decreasing their outline level
 *
 * @param worksheet - The worksheet to modify
 * @param startCol - The starting column index (0-based)
 * @param count - Number of columns to ungroup
 */
export function ungroupColumns(worksheet: XlsxWorksheet, startCol: ColIndex, count: number): XlsxWorksheet {
  assertValidColIndex(startCol, "startCol");
  assertPositiveInteger(count, "count");

  const start = toColNumber(startCol);
  const indices = Array.from({ length: count }, (_, i) => colIdx(start + i));

  const columnsRef = { value: worksheet.columns };
  for (const col of indices) {
    const currentDef = columnsRef.value?.find((c) => c.min <= col && c.max >= col);
    const currentLevel = currentDef?.outlineLevel ?? 0;
    const newLevel = Math.max(currentLevel - 1, 0);
    columnsRef.value = applyColumnOverride(columnsRef.value, col, { outlineLevel: newLevel === 0 ? undefined : newLevel });
  }

  return { ...worksheet, columns: columnsRef.value };
}

/**
 * Set the default style for cells in a column.
 *
 * @param worksheet - The worksheet to modify
 * @param colIndex - The column index
 * @param sid - The style ID to apply (0 or undefined removes the override)
 */
export function setColumnStyleId(worksheet: XlsxWorksheet, colIndex: ColIndex, sid: StyleId): XlsxWorksheet {
  assertValidColIndex(colIndex, "colIndex");

  return {
    ...worksheet,
    columns: applyColumnOverride(worksheet.columns, colIndex, {
      styleId: (sid as number) === 0 ? undefined : sid,
    }),
  };
}

/**
 * Set the bestFit flag for a column.
 *
 * When bestFit is true, the column width was determined by auto-fit
 * rather than manual user input. This distinction affects the
 * customWidth attribute in OOXML serialization (§18.3.1.13).
 *
 * @param worksheet - The worksheet to modify
 * @param colIndex - The column index
 * @param bestFit - Whether the width is auto-fit to content
 */
export function setColumnBestFit(worksheet: XlsxWorksheet, colIndex: ColIndex, bestFit: boolean): XlsxWorksheet {
  assertValidColIndex(colIndex, "colIndex");

  return {
    ...worksheet,
    columns: applyColumnOverride(worksheet.columns, colIndex, {
      bestFit: bestFit ? true : undefined,
    }),
  };
}

/**
 * Collapse or expand a column group
 *
 * @param worksheet - The worksheet to modify
 * @param colIndex - The column index that acts as the group header
 * @param collapsed - Whether to collapse (true) or expand (false)
 */
export function setColumnCollapsed(worksheet: XlsxWorksheet, colIndex: ColIndex, collapsed: boolean): XlsxWorksheet {
  assertValidColIndex(colIndex, "colIndex");

  return {
    ...worksheet,
    columns: applyColumnOverride(worksheet.columns, colIndex, {
      collapsed: collapsed ? true : undefined,
    }),
  };
}
