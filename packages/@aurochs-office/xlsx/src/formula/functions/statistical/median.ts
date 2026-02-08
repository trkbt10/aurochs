/**
 * @file MEDIAN function implementation (ODF 1.3 §6.18.13).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const medianFunction: FormulaFunctionEagerDefinition = {
  name: "MEDIAN",
  category: "statistical",
  description: {
    en: "Returns the median of numeric arguments, ignoring non-numeric values.",
    ja: "数値以外を無視して引数の中央値を返します。",
  },
  examples: ["MEDIAN(1, 3, 5)", "MEDIAN(A1:A9)"],
  samples: [
    {
      input: "MEDIAN(1, 3, 5)",
      output: 3,
      description: {
        en: "Median of odd count of numbers",
        ja: "奇数個の数値の中央値",
      },
    },
    {
      input: "MEDIAN(1, 2, 3, 4)",
      output: 2.5,
      description: {
        en: "Median of even count (average of middle two)",
        ja: "偶数個の中央値（中央2つの平均）",
      },
    },
    {
      input: "MEDIAN(10, 20, 15, 25, 30)",
      output: 20,
      description: {
        en: "Median of unsorted values",
        ja: "未ソート値の中央値",
      },
    },
  ],
  evaluate: (args, helpers) => {
    const numericValues = helpers.flattenArguments(args).filter((value): value is number => typeof value === "number");

    if (numericValues.length === 0) {
      throw new Error("MEDIAN expects at least one numeric argument");
    }

    const sorted = [...numericValues].sort((left, right) => left - right);
    const midIndex = Math.floor(sorted.length / 2);

    if (sorted.length % 2 !== 0) {
      return sorted[midIndex];
    }

    return (sorted[midIndex - 1] + sorted[midIndex]) / 2;
  },
};

// NOTE: Matched numeric extraction rules from src/modules/formula/functions/statistical/average.ts.
