/**
 * @file MDETERM function implementation (ODF 1.3 §6.17.3).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { MATRIX_TOLERANCE, cloneMatrix, normalizeNumericMatrix, requireSquareMatrix } from "./matrixHelpers";

type DeterminantState = {
  working: number[][];
  determinant: number;
  zeroDetected: boolean;
};

const swapRowsImmutable = (matrix: number[][], rowA: number, rowB: number): number[][] => {
  return matrix.map((row, index) => {
    if (index === rowA) {
      return matrix[rowB] ? matrix[rowB]!.slice() : [];
    }
    if (index === rowB) {
      return matrix[rowA] ? matrix[rowA]!.slice() : [];
    }
    return row.slice();
  });
};

const eliminateBelowPivot = (matrix: number[][], pivotIndex: number, pivot: number): number[][] => {
  return matrix.map((row, rowIndex) => {
    if (rowIndex <= pivotIndex) {
      return row.slice();
    }
    const factor = (row[pivotIndex] ?? 0) / pivot;
    if (Math.abs(factor) <= MATRIX_TOLERANCE) {
      return row.slice();
    }
    return row.map((value, columnIndex) => {
      if (columnIndex < pivotIndex) {
        return 0;
      }
      const pivotValue = matrix[pivotIndex]?.[columnIndex] ?? 0;
      return (value ?? 0) - factor * pivotValue;
    });
  });
};

const computeDeterminant = (matrix: number[][]): number => {
  const size = matrix.length;
  const initialState: DeterminantState = {
    working: cloneMatrix(matrix),
    determinant: 1,
    zeroDetected: false,
  };

  const result = Array.from({ length: size }).reduce<DeterminantState>((state, _, pivotIndex) => {
    if (state.zeroDetected) {
      return state;
    }
    const pivotRowIndex = state.working.findIndex(
      (row, rowIndex) => rowIndex >= pivotIndex && Math.abs(row?.[pivotIndex] ?? 0) > MATRIX_TOLERANCE,
    );
    if (pivotRowIndex === -1) {
      return {
        working: state.working,
        determinant: 0,
        zeroDetected: true,
      };
    }

    const swapped = pivotRowIndex === pivotIndex ? state.working : swapRowsImmutable(state.working, pivotIndex, pivotRowIndex);
    const adjustedDeterminant = pivotRowIndex === pivotIndex ? state.determinant : -state.determinant;
    const pivot = swapped[pivotIndex]?.[pivotIndex];
    if (pivot === undefined) {
      return {
        working: swapped,
        determinant: 0,
        zeroDetected: true,
      };
    }

    const nextDeterminant = adjustedDeterminant * pivot;
    const nextWorking = eliminateBelowPivot(swapped, pivotIndex, pivot);

    return {
      working: nextWorking,
      determinant: nextDeterminant,
      zeroDetected: Math.abs(nextDeterminant) <= MATRIX_TOLERANCE,
    };
  }, initialState);

  return Math.abs(result.determinant) <= MATRIX_TOLERANCE ? 0 : result.determinant;
};

export const mdetermFunction: FormulaFunctionEagerDefinition = {
  name: "MDETERM",
  category: "matrix",
  description: {
    en: "Returns the determinant of a square matrix.",
    ja: "正方行列の行列式を返します。",
  },
  examples: ["MDETERM({1,2;3,4})", "MDETERM(A1:C3)"],
  samples: [
    {
      input: "MDETERM({{1, 0}; {0, 1}})",
      output: 1,
      description: {
        en: "Determinant of identity matrix is 1",
        ja: "単位行列の行列式は1",
      },
    },
    {
      input: "MDETERM({{1, 2}; {3, 4}})",
      output: -2,
      description: {
        en: "Determinant of a 2x2 matrix is (1*4 - 2*3) = -2",
        ja: "2x2行列の行列式は(1*4 - 2*3) = -2",
      },
    },
    {
      input: "MDETERM({{2, 0, 0}; {0, 3, 0}; {0, 0, 4}})",
      output: 24,
      description: {
        en: "Determinant of diagonal matrix is product of diagonal (2*3*4 = 24)",
        ja: "対角行列の行列式は対角要素の積(2*3*4 = 24)",
      },
    },
  ],
  evaluate: (args) => {
    if (args.length !== 1) {
      throw new Error("MDETERM expects exactly one argument");
    }
    const matrix = requireSquareMatrix(normalizeNumericMatrix(args[0], "MDETERM"), "MDETERM");
    return computeDeterminant(matrix);
  },
};
