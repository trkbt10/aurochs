/**
 * @file MINVERSE function implementation (ODF 1.3 §6.17.5).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import {
  MATRIX_TOLERANCE,
  cloneMatrix,
  createIdentityMatrix,
  normalizeNumericMatrix,
  requireSquareMatrix,
  type NumericMatrix,
} from "./matrixHelpers";

const findPivotRow = (matrix: NumericMatrix, pivotIndex: number): number | undefined => {
  const size = matrix.length;
  for (let rowIndex = pivotIndex; rowIndex < size; rowIndex += 1) {
    if (Math.abs(matrix[rowIndex]?.[pivotIndex] ?? 0) > MATRIX_TOLERANCE) {
      return rowIndex;
    }
  }
  return undefined;
};

const swapRows = (matrix: NumericMatrix, rowA: number, rowB: number): void => {
  const temp = matrix[rowA];
  matrix[rowA] = matrix[rowB];
  matrix[rowB] = temp;
};

const scaleRow = (matrix: NumericMatrix, rowIndex: number, factor: number): void => {
  matrix[rowIndex] = matrix[rowIndex]?.map((value) => value / factor) ?? [];
};

const eliminateColumn = (matrix: NumericMatrix, pivotIndex: number, rowIndex: number): void => {
  const pivotRow = matrix[pivotIndex];
  const currentRow = matrix[rowIndex];
  if (!pivotRow || !currentRow) {
    return;
  }
  const factor = currentRow[pivotIndex];
  matrix[rowIndex] = currentRow.map((value, columnIndex) => value - factor * (pivotRow[columnIndex] ?? 0));
};

const augmentMatrices = (left: NumericMatrix, right: NumericMatrix): NumericMatrix => {
  return left.map((row, rowIndex) => {
    return [...row, ...right[rowIndex]];
  });
};

const extractRightHalf = (augmented: NumericMatrix, size: number): NumericMatrix => {
  return augmented.map((row) => row.slice(size));
};

const invertMatrix = (matrix: NumericMatrix): NumericMatrix => {
  const size = matrix.length;
  const augmented = augmentMatrices(cloneMatrix(matrix), createIdentityMatrix(size));

  for (let pivotIndex = 0; pivotIndex < size; pivotIndex += 1) {
    const pivotRowIndex = findPivotRow(augmented, pivotIndex);
    if (pivotRowIndex === undefined) {
      throw new Error("MINVERSE requires a non-singular matrix");
    }
    if (pivotRowIndex !== pivotIndex) {
      swapRows(augmented, pivotIndex, pivotRowIndex);
    }

    const pivotValue = augmented[pivotIndex]?.[pivotIndex];
    if (pivotValue === undefined || Math.abs(pivotValue) <= MATRIX_TOLERANCE) {
      throw new Error("MINVERSE requires a non-singular matrix");
    }

    scaleRow(augmented, pivotIndex, pivotValue);

    for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
      if (rowIndex !== pivotIndex) {
        eliminateColumn(augmented, pivotIndex, rowIndex);
      }
    }
  }

  return extractRightHalf(augmented, size);
};

export const minverseFunction: FormulaFunctionEagerDefinition = {
  name: "MINVERSE",
  category: "matrix",
  description: {
    en: "Returns the inverse matrix for a square array.",
    ja: "正方行列の逆行列を返します。",
  },
  examples: ["MINVERSE({1,2;3,4})", "MINVERSE(A1:C3)"],
  samples: [
    {
      input: "MINVERSE({{1, 0}; {0, 1}})",
      output: [[1, 0], [0, 1]],
      description: {
        en: "Inverse of identity matrix is itself",
        ja: "単位行列の逆行列は自分自身",
      },
    },
    {
      input: "MINVERSE({{1, 2}; {3, 4}})",
      output: [[-2, 1], [1.5, -0.5]],
      description: {
        en: "Inverse of a 2x2 matrix",
        ja: "2x2行列の逆行列",
      },
    },
    {
      input: "MINVERSE({{2, 0}; {0, 2}})",
      output: [[0.5, 0], [0, 0.5]],
      description: {
        en: "Inverse of a diagonal matrix",
        ja: "対角行列の逆行列",
      },
    },
  ],
  evaluate: (args) => {
    if (args.length !== 1) {
      throw new Error("MINVERSE expects exactly one argument");
    }
    const matrix = requireSquareMatrix(normalizeNumericMatrix(args[0], "MINVERSE"), "MINVERSE");
    return invertMatrix(matrix);
  },
};
