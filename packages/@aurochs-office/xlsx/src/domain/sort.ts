/**
 * @file Worksheet Row Sort
 *
 * Sorts worksheet rows according to ECMA-376 sortState specification.
 * Reorders rows within the autoFilter data range (excluding header row).
 *
 * Sort order follows Excel convention:
 * - Numbers < Text < Logical < Error < Empty
 * - Empty cells are always placed at the end regardless of sort direction.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.92 (sortState)
 * @see ECMA-376 Part 4, Section 18.3.1.91 (sortCondition)
 */

import type { CellValue } from "./cell/types";
import type { CellRange } from "./cell/address";
import { parseRange } from "./cell/address";
import type { XlsxWorksheet, XlsxRow } from "./workbook";
import type { XlsxSortState } from "./auto-filter";
import { rowIdx, type ColIndex } from "./types";

// =============================================================================
// Sort key extraction
// =============================================================================

/**
 * Type category for sort ordering.
 * Lower number = earlier in ascending sort.
 *
 * Excel order: numbers (0) < text (1) < boolean (2) < error (3) < empty (4)
 */
function typeSortOrder(value: CellValue): number {
  switch (value.type) {
    case "number":
    case "date":
      return 0;
    case "string":
      return 1;
    case "boolean":
      return 2;
    case "error":
      return 3;
    case "empty":
      return 4;
  }
}

/**
 * Compare two cell values for sorting.
 *
 * @returns negative if a < b, 0 if equal, positive if a > b
 */
function compareCellValues(a: CellValue, b: CellValue): number {
  const typeA = typeSortOrder(a);
  const typeB = typeSortOrder(b);

  // Different type categories: sort by category
  if (typeA !== typeB) {
    return typeA - typeB;
  }

  // Same type category
  switch (a.type) {
    case "number":
      return a.value - (b as typeof a).value;
    case "date":
      return a.value.getTime() - (b as typeof a).value.getTime();
    case "string":
      return a.value.localeCompare((b as typeof a).value);
    case "boolean":
      // false < true
      return (a.value ? 1 : 0) - ((b as typeof a).value ? 1 : 0);
    case "error":
      return a.value.localeCompare((b as typeof a).value);
    case "empty":
      return 0; // all empties are equal
  }
}

/**
 * Extract the column index from a sortCondition ref string.
 *
 * The ref is e.g. "A2:A58" — we need the column (A → 1).
 */
function sortConditionColumn(ref: string): ColIndex {
  const range = parseRange(ref);
  return range.start.col;
}

/**
 * Get the cell value at a specific column from a row.
 */
function getRowCellValue(row: XlsxRow, col: ColIndex): CellValue {
  const cell = row.cells.find((c) => c.address.col === col);
  return cell?.value ?? { type: "empty" };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Sort worksheet rows by the given sort conditions.
 *
 * Reorders rows within the autoFilter data range (excluding header row).
 * Rows outside the range are not modified.
 * Row numbers and cell addresses are updated to reflect new positions.
 *
 * @param worksheet - The worksheet to sort
 * @param sortState - Sort configuration with conditions
 * @param autoFilterRef - The autoFilter ref range (header + data)
 * @returns New worksheet with sorted rows
 *
 * @see ECMA-376 Part 4, Section 18.3.1.92 (sortState)
 */
export function sortWorksheetRows(
  worksheet: XlsxWorksheet,
  sortState: XlsxSortState,
  autoFilterRef: CellRange,
): XlsxWorksheet {
  if (!sortState.sortConditions || sortState.sortConditions.length === 0) {
    return worksheet;
  }

  const headerRow = Math.min(autoFilterRef.start.row as number, autoFilterRef.end.row as number);
  const dataStartRow = headerRow + 1;
  const dataEndRow = Math.max(autoFilterRef.start.row as number, autoFilterRef.end.row as number);

  // Separate rows into: before range, header, data (in range), after range
  const beforeRows: XlsxRow[] = [];
  const headerRows: XlsxRow[] = [];
  const dataRows: XlsxRow[] = [];
  const afterRows: XlsxRow[] = [];

  for (const row of worksheet.rows) {
    const rn = row.rowNumber as number;
    if (rn < headerRow) {
      beforeRows.push(row);
    } else if (rn === headerRow) {
      headerRows.push(row);
    } else if (rn >= dataStartRow && rn <= dataEndRow) {
      dataRows.push(row);
    } else {
      afterRows.push(row);
    }
  }

  // Fill in missing rows within the data range as empty rows
  // so they participate in sorting (empty rows go to end)
  const existingRowNumbers = new Set(dataRows.map((r) => r.rowNumber as number));
  for (let rn = dataStartRow; rn <= dataEndRow; rn++) {
    if (!existingRowNumbers.has(rn)) {
      dataRows.push({
        rowNumber: rowIdx(rn),
        cells: [],
      });
    }
  }

  // Extract sort columns
  const sortColumns = sortState.sortConditions.map((sc) => ({
    col: sortConditionColumn(sc.ref),
    descending: sc.descending === true,
  }));

  // Sort data rows
  const sortedDataRows = [...dataRows].sort((a, b) => {
    for (const { col, descending } of sortColumns) {
      const va = getRowCellValue(a, col);
      const vb = getRowCellValue(b, col);

      // Empty cells always go to the end regardless of direction
      const aEmpty = va.type === "empty";
      const bEmpty = vb.type === "empty";
      if (aEmpty && bEmpty) {
        continue;
      }
      if (aEmpty) {
        return 1;
      }
      if (bEmpty) {
        return -1;
      }

      const cmp = compareCellValues(va, vb);
      if (cmp !== 0) {
        return descending ? -cmp : cmp;
      }
    }
    return 0;
  });

  // Reassign row numbers and update cell addresses
  const reassignedDataRows: XlsxRow[] = sortedDataRows.map((row, index) => {
    const newRowNumber = rowIdx(dataStartRow + index);
    return {
      ...row,
      rowNumber: newRowNumber,
      cells: row.cells.map((cell) => ({
        ...cell,
        address: {
          ...cell.address,
          row: newRowNumber,
        },
      })),
    };
  });

  // Filter out empty placeholder rows (rows that had no cells and remain empty)
  const nonEmptyDataRows = reassignedDataRows.filter(
    (row) => row.cells.length > 0 || row.hidden || row.height !== undefined || row.styleId !== undefined,
  );

  return {
    ...worksheet,
    rows: [...beforeRows, ...headerRows, ...nonEmptyDataRows, ...afterRows],
  };
}
