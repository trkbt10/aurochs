/**
 * @file Mutation Applicator
 *
 * Apply VBA cell mutations to an XlsxWorkbook.
 */

import type { XlsxWorkbook, XlsxWorksheet, XlsxRow } from "@aurochs-office/xlsx/domain/workbook";
import type { Cell, CellValue } from "@aurochs-office/xlsx/domain/cell/types";
import type { CellAddress } from "@aurochs-office/xlsx/domain/cell/address";
import { rowIdx, colIdx } from "@aurochs-office/xlsx/domain/types";
import type { CellMutation } from "./types";

// =============================================================================
// Mutation Applicator
// =============================================================================

/**
 * Apply VBA cell mutations to a workbook.
 *
 * Creates a new workbook with the mutations applied (immutable update).
 *
 * @param workbook - Original workbook
 * @param mutations - Cell mutations to apply
 * @returns New workbook with mutations applied
 *
 * @example
 * ```typescript
 * const result = executeVbaProcedure({ ... });
 * if (result.ok && result.mutations.length > 0) {
 *   const updatedWorkbook = applyMutations(workbook, result.mutations);
 * }
 * ```
 */
export function applyMutations(
  workbook: XlsxWorkbook,
  mutations: readonly CellMutation[]
): XlsxWorkbook {
  if (mutations.length === 0) {
    return workbook;
  }

  // Group mutations by sheet index
  const mutationsBySheet = groupMutationsBySheet(mutations);

  // Apply mutations to each sheet
  const updatedSheets = workbook.sheets.map((sheet, sheetIndex) => {
    const sheetMutations = mutationsBySheet.get(sheetIndex);
    if (!sheetMutations || sheetMutations.length === 0) {
      return sheet;
    }
    return applyMutationsToSheet(sheet, sheetMutations);
  });

  return {
    ...workbook,
    sheets: updatedSheets,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Group mutations by sheet index.
 */
function groupMutationsBySheet(
  mutations: readonly CellMutation[]
): Map<number, CellMutation[]> {
  const grouped = new Map<number, CellMutation[]>();

  for (const mutation of mutations) {
    const existing = grouped.get(mutation.sheetIndex);
    if (existing) {
      existing.push(mutation);
    } else {
      grouped.set(mutation.sheetIndex, [mutation]);
    }
  }

  return grouped;
}

/**
 * Apply mutations to a single sheet.
 */
function applyMutationsToSheet(
  sheet: XlsxWorksheet,
  mutations: readonly CellMutation[]
): XlsxWorksheet {
  // Group mutations by row
  const mutationsByRow = new Map<number, CellMutation[]>();
  for (const mutation of mutations) {
    const existing = mutationsByRow.get(mutation.row);
    if (existing) {
      existing.push(mutation);
    } else {
      mutationsByRow.set(mutation.row, [mutation]);
    }
  }

  // Get all row numbers that have mutations
  const mutatedRowNumbers = new Set(mutationsByRow.keys());

  // Get existing row numbers
  const existingRowNumbers = new Set(sheet.rows.map((r) => r.rowNumber as number));

  // Find new rows that need to be created
  const newRowNumbers = [...mutatedRowNumbers].filter((r) => !existingRowNumbers.has(r));

  // Update existing rows and create new rows
  const updatedRows: XlsxRow[] = [];

  // Process existing rows
  for (const row of sheet.rows) {
    const rowMutations = mutationsByRow.get(row.rowNumber as number);
    if (rowMutations) {
      updatedRows.push(applyMutationsToRow(row, rowMutations));
    } else {
      updatedRows.push(row);
    }
  }

  // Create new rows for mutations
  for (const rowNum of newRowNumbers) {
    const rowMutations = mutationsByRow.get(rowNum)!;
    updatedRows.push(createRowFromMutations(rowNum, rowMutations));
  }

  // Sort rows by row number
  updatedRows.sort((a, b) => (a.rowNumber as number) - (b.rowNumber as number));

  return {
    ...sheet,
    rows: updatedRows,
  };
}

/**
 * Apply mutations to a single row.
 */
function applyMutationsToRow(row: XlsxRow, mutations: readonly CellMutation[]): XlsxRow {
  // Create a map of col -> mutation for quick lookup
  const mutationByCol = new Map<number, CellMutation>();
  for (const mutation of mutations) {
    mutationByCol.set(mutation.col, mutation);
  }

  // Get existing col numbers
  const existingCols = new Set(row.cells.map((c) => c.address.col as number));

  // Find new cols that need to be created
  const mutatedCols = new Set(mutationByCol.keys());
  const newCols = [...mutatedCols].filter((c) => !existingCols.has(c));

  // Update existing cells and create new cells
  const updatedCells: Cell[] = [];

  // Process existing cells
  for (const cell of row.cells) {
    const mutation = mutationByCol.get(cell.address.col as number);
    if (mutation) {
      updatedCells.push(applyCellMutation(cell, mutation.value));
    } else {
      updatedCells.push(cell);
    }
  }

  // Create new cells for mutations
  for (const colNum of newCols) {
    const mutation = mutationByCol.get(colNum)!;
    updatedCells.push(createCellFromMutation(row.rowNumber as number, colNum, mutation.value));
  }

  // Sort cells by column
  updatedCells.sort((a, b) => (a.address.col as number) - (b.address.col as number));

  return {
    ...row,
    cells: updatedCells,
  };
}

/**
 * Create a new row from mutations.
 */
function createRowFromMutations(rowNumber: number, mutations: readonly CellMutation[]): XlsxRow {
  const cells = mutations.map((m) =>
    createCellFromMutation(rowNumber, m.col, m.value)
  );

  // Sort cells by column
  cells.sort((a, b) => (a.address.col as number) - (b.address.col as number));

  return {
    rowNumber: rowIdx(rowNumber),
    cells,
  };
}

/**
 * Apply a mutation to a cell (update value).
 */
function applyCellMutation(cell: Cell, value: CellValue): Cell {
  return {
    ...cell,
    value,
    // Clear formula when setting a value directly
    formula: undefined,
  };
}

/**
 * Create a new cell from a mutation.
 */
function createCellFromMutation(row: number, col: number, value: CellValue): Cell {
  const address: CellAddress = {
    row: rowIdx(row),
    col: colIdx(col),
    rowAbsolute: false,
    colAbsolute: false,
  };

  return {
    address,
    value,
  };
}
