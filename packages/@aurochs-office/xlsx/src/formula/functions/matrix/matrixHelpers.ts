/**
 * @file Shared helpers for matrix-oriented formula functions (ODF 1.3 §6.17).
 */

import type { EvalResult } from "../helpers";
import { toLookupTable } from "../lookup/table";

export type NumericMatrix = number[][];

const ensureNumericEntry = (params: {
  readonly value: unknown;
  readonly description: string;
  readonly rowIndex: number;
  readonly columnIndex: number;
}): number => {
  const { value, description, rowIndex, columnIndex } = params;
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${description} requires numeric values (row ${rowIndex + 1}, column ${columnIndex + 1})`);
  }
  return value;
};

export const normalizeNumericMatrix = (range: EvalResult, description: string): NumericMatrix => {
  const table = toLookupTable(range, description);
  if (table.length === 0 || table[0]?.length === 0) {
    throw new Error(`${description} requires a non-empty matrix`);
  }
  return table.map((row, rowIndex) => {
    return row.map((value, columnIndex) => ensureNumericEntry({ value, description, rowIndex, columnIndex }));
  });
};

export const requireSquareMatrix = (matrix: NumericMatrix, description: string): NumericMatrix => {
  const columnCount = matrix[0]?.length ?? 0;
  if (matrix.length !== columnCount) {
    throw new Error(`${description} requires a square matrix`);
  }
  return matrix;
};

export const cloneMatrix = (matrix: NumericMatrix): NumericMatrix => {
  return matrix.map((row) => row.slice());
};

export const createIdentityMatrix = (size: number): NumericMatrix => {
  return Array.from({ length: size }, (_, rowIndex) => {
    return Array.from({ length: size }, (_, columnIndex) => (rowIndex === columnIndex ? 1 : 0));
  });
};

export const MATRIX_TOLERANCE = 1e-12;
