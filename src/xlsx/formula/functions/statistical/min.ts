/**
 * @file MIN function implementation (ODF 1.3 §6.18.48).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const minFunction: FormulaFunctionEagerDefinition = {
  name: "MIN",
  category: "statistical",
  description: {
    en: "Returns the smallest numeric value from the arguments.",
    ja: "引数の中で最小の数値を返します。",
  },
  examples: ["MIN(1, 5, 3)", "MIN(A1:A10)"],
  samples: [
    {
      input: "MIN(1, 5, 3, 9, 2)",
      output: 1,
      description: {
        en: "Minimum of five numbers",
        ja: "5つの数値の最小値",
      },
    },
    {
      input: "MIN(-10, -5, -20)",
      output: -20,
      description: {
        en: "Minimum of negative numbers",
        ja: "負の数の最小値",
      },
    },
    {
      input: "MIN(100, 200, 50)",
      output: 50,
      description: {
        en: "Smallest value",
        ja: "最小の値",
      },
    },
  ],
  evaluate: (args, helpers) => {
    const values = helpers.flattenArguments(args).filter((value): value is number => typeof value === "number");
    if (values.length === 0) {
      throw new Error("MIN expects at least one numeric argument");
    }
    return Math.min(...values);
  },
};
