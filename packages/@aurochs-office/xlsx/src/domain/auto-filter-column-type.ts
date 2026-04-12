/**
 * @file AutoFilter column data type inference
 *
 * Infers the predominant data type of an autoFilter column by scanning
 * its data cells (excluding the header row). The result drives the UI:
 *
 * | ColumnDataType | Sort asc       | Sort desc      | Filter submenu     |
 * |----------------|---------------|----------------|--------------------|
 * | "text"         | 昇順 (A→Z)    | 降順 (Z→A)     | テキストフィルター  |
 * | "number"       | 小さい順       | 大きい順        | 数値フィルター      |
 * | "date"         | 古い順         | 新しい順        | 日付フィルター      |
 * | "mixed"        | 昇順 (A→Z)    | 降順 (Z→A)     | —                  |
 *
 * The data type classification is an application-level concept that determines
 * which ECMA-376 filter structures are offered to the user:
 * - "text" → customFilter with wildcards (§18.3.2.1)
 * - "number" → customFilter with numeric operators (§18.18.31), top10 (§18.3.2.10)
 * - "date" → dynamicFilter date types (§18.18.26), dateGroupItem (§18.3.2.4)
 *
 * @see ECMA-376 Part 4, Section 18.3.2.8 (filters — value-list filtering)
 * @see ECMA-376 Part 4, Section 18.3.2.4 (dateGroupItem — date hierarchy)
 * @see ECMA-376 Part 4, Section 18.18.11 (ST_CellType — cell value types)
 */

import type { XlsxWorksheet } from "./workbook";
import type { XlsxAutoFilter } from "./auto-filter";
import { colIdx, rowIdx } from "./types";
import { getCellValue } from "./mutation/query";

// =============================================================================
// Types
// =============================================================================

/**
 * The predominant data type of an autoFilter column.
 *
 * Determines sort labels and available filter submenu in the dropdown.
 */
export type ColumnDataType = "text" | "number" | "date" | "mixed";

// =============================================================================
// Implementation
// =============================================================================

/**
 * Build an array of 1-based row indices for a range [startRow, endRow].
 */
function rowRange(startRow: number, endRow: number): readonly number[] {
  return Array.from({ length: endRow - startRow + 1 }, (_, i) => startRow + i);
}

/**
 * Scan data cells in a column range and classify which primary types are present.
 */
function countDataTypes(params: {
  readonly worksheet: XlsxWorksheet;
  readonly col1: number;
  readonly startRow: number;
  readonly endRow: number;
}): { hasText: boolean; hasNumber: boolean; hasDate: boolean } {
  const types = new Set<string>();

  for (const row of rowRange(params.startRow, params.endRow)) {
    const value = getCellValue(params.worksheet, {
      col: colIdx(params.col1),
      row: rowIdx(row),
      colAbsolute: false,
      rowAbsolute: false,
    });

    if (value) {
      types.add(value.type);
    }
  }

  return {
    hasText: types.has("string"),
    hasNumber: types.has("number"),
    hasDate: types.has("date"),
  };
}

/**
 * Infer the predominant data type of a column within an autoFilter range.
 *
 * Scans data cells (header row excluded) and classifies them into
 * primary types: text, number, date. The rules are:
 *
 * 1. Empty cells and error cells are ignored (they don't influence the type).
 * 2. Boolean cells are ignored (they coexist with any type without changing it).
 * 3. Date and number cells belong to the same numeric category in Excel
 *    (dates are serial numbers internally). If all non-ignored cells are
 *    dates → "date". If there are numbers and dates mixed → "number".
 * 4. If there are text cells and numeric/date cells mixed → "mixed".
 * 5. If no data cells exist (all empty/error/boolean) → "text" (fallback).
 *
 * @param worksheet - The worksheet containing the data
 * @param autoFilter - The autoFilter configuration (provides the ref range)
 * @param col1 - 1-based absolute column index
 * @returns The inferred column data type
 */
export function inferColumnDataType(
  worksheet: XlsxWorksheet,
  autoFilter: XlsxAutoFilter,
  col1: number,
): ColumnDataType {
  const startRow = (autoFilter.ref.start.row as number) + 1; // skip header
  const endRow = autoFilter.ref.end.row as number;

  const typeCounts = countDataTypes({ worksheet, col1, startRow, endRow });

  // Determine the predominant type
  if (typeCounts.hasText && (typeCounts.hasNumber || typeCounts.hasDate)) {
    return "mixed";
  }
  if (typeCounts.hasText) {
    return "text";
  }
  if (typeCounts.hasDate && !typeCounts.hasNumber) {
    return "date";
  }
  if (typeCounts.hasNumber || typeCounts.hasDate) {
    // number+date → "number" (dates are numeric in Excel)
    return "number";
  }

  // All empty/error/boolean → fallback to text
  return "text";
}
