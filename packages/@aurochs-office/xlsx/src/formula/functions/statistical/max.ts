/**
 * @file MAX function implementation (ODF 1.3 §6.18.46).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const maxFunction: FormulaFunctionEagerDefinition = {
  name: "MAX",
  category: "statistical",
  description: {
    en: "Returns the largest numeric value from the arguments.",
    ja: "引数の中で最大の数値を返します。",
  },
  examples: ["MAX(1, 5, 3)", "MAX(A1:A10)"],
  samples: [
    {
      input: "MAX(1, 5, 3, 9, 2)",
      output: 9,
      description: {
        en: "Maximum of five numbers",
        ja: "5つの数値の最大値",
      },
    },
    {
      input: "MAX(-10, -5, -20)",
      output: -5,
      description: {
        en: "Maximum of negative numbers",
        ja: "負の数の最大値",
      },
    },
    {
      input: "MAX(100, 200, 50)",
      output: 200,
      description: {
        en: "Largest value",
        ja: "最大の値",
      },
    },
  ],
  evaluate: (args, helpers) => {
    const values = helpers.flattenArguments(args).filter((value): value is number => typeof value === "number");
    if (values.length === 0) {
      throw new Error("MAX expects at least one numeric argument");
    }
    return Math.max(...values);
  },
};
