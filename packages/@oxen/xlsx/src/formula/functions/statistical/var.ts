/**
 * @file VAR function implementation (ODF 1.3 §6.18.15).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { collectNumericArguments, summarizeNumbers } from "../helpers";

export const varianceFunction: FormulaFunctionEagerDefinition = {
  name: "VAR",
  category: "statistical",
  description: {
    en: "Calculates the sample variance of numeric arguments.",
    ja: "数値引数の標本分散を計算します。",
  },
  examples: ["VAR(1, 3, 5)", "VAR(A1:A10)"],
  samples: [
    {
      input: "VAR(2, 4, 6, 8)",
      output: 6.67,
      description: {
        en: "Sample variance",
        ja: "標本分散",
      },
    },
    {
      input: "VAR(10, 20, 30)",
      output: 100,
      description: {
        en: "Variance of evenly spaced values",
        ja: "等間隔の値の分散",
      },
    },
  ],
  evaluate: (args, helpers) => {
    const numericValues = collectNumericArguments(args, helpers);

    if (numericValues.length < 2) {
      throw new Error("VAR expects at least two numeric arguments");
    }

    const summary = summarizeNumbers(numericValues);
    const meanSquare = (summary.sum * summary.sum) / summary.count;
    return (summary.sumOfSquares - meanSquare) / (summary.count - 1);
  },
};

// NOTE: Uses shared aggregation helpers co-developed in src/modules/formula/functions/statistical/numericAggregation.ts.
