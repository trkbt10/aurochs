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
import { colIdx } from "./types";
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

  let hasText = false;
  let hasNumber = false;
  let hasDate = false;

  for (let row = startRow; row <= endRow; row++) {
    const value = getCellValue(worksheet, {
      col: colIdx(col1),
      row: colIdx(row) as unknown as typeof autoFilter.ref.start.row,
      colAbsolute: false,
      rowAbsolute: false,
    });

    if (!value) continue;

    switch (value.type) {
      case "string":
        hasText = true;
        break;
      case "number":
        hasNumber = true;
        break;
      case "date":
        hasDate = true;
        break;
      // empty, error, boolean — ignored for type determination
    }
  }

  // Determine the predominant type
  if (hasText && (hasNumber || hasDate)) {
    return "mixed";
  }
  if (hasText) {
    return "text";
  }
  if (hasDate && !hasNumber) {
    return "date";
  }
  if (hasNumber || hasDate) {
    // number+date → "number" (dates are numeric in Excel)
    return "number";
  }

  // All empty/error/boolean → fallback to text
  return "text";
}
