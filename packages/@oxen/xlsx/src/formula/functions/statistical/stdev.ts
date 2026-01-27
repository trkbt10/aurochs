/**
 * @file STDEV function implementation (ODF 1.3 §6.18.17).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { collectNumericArguments, summarizeNumbers } from "../helpers";

export const standardDeviationFunction: FormulaFunctionEagerDefinition = {
  name: "STDEV",
  category: "statistical",
  description: {
    en: "Calculates the sample standard deviation of numeric arguments.",
    ja: "数値引数の標本標準偏差を計算します。",
  },
  examples: ["STDEV(1, 3, 5)", "STDEV(A1:A10)"],
  samples: [
    {
      input: "STDEV(2, 4, 6, 8)",
      output: 2.58,
      description: {
        en: "Sample standard deviation",
        ja: "標本標準偏差",
      },
    },
    {
      input: "STDEV(10, 20, 30)",
      output: 10,
      description: {
        en: "Standard deviation of evenly spaced values",
        ja: "等間隔の値の標準偏差",
      },
    },
  ],
  evaluate: (args, helpers) => {
    const numericValues = collectNumericArguments(args, helpers);

    if (numericValues.length < 2) {
      throw new Error("STDEV expects at least two numeric arguments");
    }

    const summary = summarizeNumbers(numericValues);
    const meanSquare = (summary.sum * summary.sum) / summary.count;
    const variance = (summary.sumOfSquares - meanSquare) / (summary.count - 1);
    return Math.sqrt(variance);
  },
};

// NOTE: Depends on the same variance summary as VAR defined in src/modules/formula/functions/statistical/var.ts.
