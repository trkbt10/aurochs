/**
 * @file Shared helpers for lookup table manipulation (ODF 1.3 §6.14).
 */

import type { FormulaEvaluationResult } from "../../types";
import type { EvalResult } from "../helpers";
import { isArrayResult } from "../helpers";

export type LookupTable = FormulaEvaluationResult[][];

const normalizeRow = (row: EvalResult, description: string): FormulaEvaluationResult[] => {
  if (!isArrayResult(row)) {
    return [(row ?? null) as FormulaEvaluationResult];
  }
  return row.map((value) => {
    if (isArrayResult(value)) {
      throw new Error(`${description} does not support nested ranges`);
    }
    return (value ?? null) as FormulaEvaluationResult;
  });
};

export const toLookupTable = (range: EvalResult, description: string): LookupTable => {
  if (!isArrayResult(range)) {
    throw new Error(`${description} requires a range argument`);
  }
  if (range.length === 0) {
    throw new Error(`${description} range cannot be empty`);
  }

  const rows = range.map((row) => normalizeRow(row, description));
  const columnCount = rows[0]?.length ?? 0;
  if (columnCount === 0) {
    throw new Error(`${description} range cannot be empty`);
  }

  rows.forEach((row) => {
    if (row.length !== columnCount) {
      throw new Error(`${description} requires rectangular ranges`);
    }
  });

  return rows;
};

export const readTableCell = (
  table: LookupTable,
  rowIndex: number,
  columnIndex: number,
  description: string,
): FormulaEvaluationResult => {
  const row = table[rowIndex];
  if (!row) {
    throw new Error(`${description} failed: missing row in range`);
  }
  const value = row[columnIndex];
  if (value === undefined) {
    throw new Error(`${description} failed: missing column in range`);
  }
  return value;
};

export const readTableRow = (table: LookupTable, rowIndex: number, description: string): FormulaEvaluationResult[] => {
  const row = table[rowIndex];
  if (!row) {
    throw new Error(`${description} failed: row index ${rowIndex + 1} is out of range`);
  }
  return row;
};

export const readTableColumn = (
  table: LookupTable,
  columnIndex: number,
  description: string,
): FormulaEvaluationResult[] => {
  return table.map((row, rowIndex) => {
    const value = row[columnIndex];
    if (value === undefined) {
      throw new Error(`${description} failed: column index ${columnIndex + 1} is out of range for row ${rowIndex + 1}`);
    }
    return value;
  });
};

// NOTE: Based on VLOOKUP normalization rules in src/modules/formula/functions/lookup/vlookup.ts.
