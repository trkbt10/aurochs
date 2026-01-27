/**
 * @file TRANSPOSE function implementation (ODF 1.3 §6.17.13).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { toLookupTable } from "../lookup/table";
import { isArrayResult } from "../helpers";

export const transposeFunction: FormulaFunctionEagerDefinition = {
  name: "TRANSPOSE",
  category: "matrix",
  description: {
    en: "Returns the transpose of an array.",
    ja: "配列の転置を返します。",
  },
  examples: ["TRANSPOSE({1,2,3})", "TRANSPOSE(A1:C2)"],
  samples: [
    {
      input: "TRANSPOSE({{1, 2, 3}})",
      output: [[1], [2], [3]],
      description: {
        en: "Transpose row vector to column vector",
        ja: "行ベクトルを列ベクトルに転置",
      },
    },
    {
      input: "TRANSPOSE({{1, 2}; {3, 4}})",
      output: [[1, 3], [2, 4]],
      description: {
        en: "Transpose 2x2 matrix",
        ja: "2x2行列の転置",
      },
    },
    {
      input: "TRANSPOSE({{1, 2, 3}; {4, 5, 6}})",
      output: [[1, 4], [2, 5], [3, 6]],
      description: {
        en: "Transpose 2x3 to 3x2 matrix",
        ja: "2x3行列を3x2行列に転置",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("TRANSPOSE expects exactly one argument");
    }
    const source = args[0];
    if (!isArrayResult(source)) {
      return helpers.coerceScalar(source, "TRANSPOSE value");
    }
    const table = toLookupTable(source, "TRANSPOSE");
    const rowCount = table.length;
    const columnCount = table[0]?.length ?? 0;
    if (columnCount === 0) {
      throw new Error("TRANSPOSE range cannot be empty");
    }
    return Array.from({ length: columnCount }, (_, columnIndex) => {
      return Array.from({ length: rowCount }, (_, rowIndex) => {
        const value = table[rowIndex]?.[columnIndex] ?? null;
        return value === null || value === "" ? 0 : value;
      });
    });
  },
};
