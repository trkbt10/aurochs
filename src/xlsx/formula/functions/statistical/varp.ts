/**
 * @file VARP function implementation (ODF 1.3 §6.18.16).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { collectNumericArguments, summarizeNumbers } from "../helpers";

export const variancePopulationFunction: FormulaFunctionEagerDefinition = {
  name: "VARP",
  category: "statistical",
  description: {
    en: "Calculates the population variance of numeric arguments.",
    ja: "数値引数の母分散を計算します。",
  },
  examples: ["VARP(1, 3, 5)", "VARP(A1:A10)"],
  samples: [
    {
      input: "VARP(2, 4, 6, 8)",
      output: 5,
      description: {
        en: "Population variance",
        ja: "母分散",
      },
    },
    {
      input: "VARP(10, 20, 30)",
      output: 66.67,
      description: {
        en: "Population variance of evenly spaced values",
        ja: "等間隔の値の母分散",
      },
    },
  ],
  evaluate: (args, helpers) => {
    const numericValues = collectNumericArguments(args, helpers);

    if (numericValues.length === 0) {
      throw new Error("VARP expects at least one numeric argument");
    }

    const summary = summarizeNumbers(numericValues);
    const meanSquare = (summary.sum * summary.sum) / summary.count;
    return (summary.sumOfSquares - meanSquare) / summary.count;
  },
};

// NOTE: Shares helper usage with VAR at src/modules/formula/functions/statistical/var.ts.
