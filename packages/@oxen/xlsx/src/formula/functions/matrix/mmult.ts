/**
 * @file MMULT function implementation (ODF 1.3 §6.17.4).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { normalizeNumericMatrix } from "./matrixHelpers";

const multiplyMatrices = (left: number[][], right: number[][], description: string): number[][] => {
  const sharedDimension = left[0]?.length ?? 0;
  if (sharedDimension === 0) {
    throw new Error(`${description} requires non-empty matrices`);
  }
  if (right.length !== sharedDimension) {
    throw new Error(`${description} requires the number of columns in the first matrix to match the number of rows in the second matrix`);
  }
  const rightColumnCount = right[0]?.length ?? 0;
  if (rightColumnCount === 0) {
    throw new Error(`${description} requires non-empty matrices`);
  }

  return left.map((leftRow) => {
    return Array.from({ length: rightColumnCount }, (_, columnIndex) => {
      return leftRow.reduce((total, leftValue, sharedIndex) => {
        const rightValue = right[sharedIndex]?.[columnIndex];
        if (typeof rightValue !== "number") {
          throw new Error(`${description} requires rectangular matrices`);
        }
        return total + leftValue * rightValue;
      }, 0);
    });
  });
};

export const mmultFunction: FormulaFunctionEagerDefinition = {
  name: "MMULT",
  category: "matrix",
  description: {
    en: "Returns the matrix product of two arrays.",
    ja: "2つの配列の行列積を返します。",
  },
  examples: ["MMULT({1,2;3,4},{5;6})", "MMULT(A1:B2, C1:D2)"],
  samples: [
    {
      input: "MMULT({{1, 2}; {3, 4}}, {{5}; {6}})",
      output: [[17], [39]],
      description: {
        en: "2x2 matrix multiplied by 2x1 column vector",
        ja: "2x2行列と2x1列ベクトルの乗算",
      },
    },
    {
      input: "MMULT({{1, 2}}, {{3, 4}; {5, 6}})",
      output: [[13, 16]],
      description: {
        en: "1x2 row vector multiplied by 2x2 matrix",
        ja: "1x2行ベクトルと2x2行列の乗算",
      },
    },
    {
      input: "MMULT({{1, 0}; {0, 1}}, {{2, 3}; {4, 5}})",
      output: [[2, 3], [4, 5]],
      description: {
        en: "Identity matrix multiplied by 2x2 matrix",
        ja: "単位行列と2x2行列の乗算",
      },
    },
  ],
  evaluate: (args) => {
    if (args.length !== 2) {
      throw new Error("MMULT expects exactly two arguments");
    }

    const left = normalizeNumericMatrix(args[0], "MMULT");
    const right = normalizeNumericMatrix(args[1], "MMULT");

    return multiplyMatrices(left, right, "MMULT");
  },
};
