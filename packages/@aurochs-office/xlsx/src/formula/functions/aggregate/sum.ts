/**
 * @file SUM function implementation (ODF 1.3 §6.10.1).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const sumFunction: FormulaFunctionEagerDefinition = {
  name: "SUM",
  category: "aggregate",
  description: {
    en: "Adds all numeric arguments, ignoring empty cells and null values.",
    ja: "空のセルやnullを無視して数値引数を合計します。",
  },
  examples: ["SUM(1, 2, 3)", "SUM(A1:A10)"],
  samples: [
    {
      input: "SUM(1, 2, 3)",
      output: 6,
      description: {
        en: "Sum of three numbers",
        ja: "3つの数値の合計",
      },
    },
    {
      input: "SUM(10, 20, 30, 40)",
      output: 100,
      description: {
        en: "Sum of four numbers",
        ja: "4つの数値の合計",
      },
    },
    {
      input: "SUM(-5, 5, 10)",
      output: 10,
      description: {
        en: "Sum with negative numbers",
        ja: "負の数を含む合計",
      },
    },
  ],
  evaluate: (args, helpers) => {
    const values = helpers.flattenArguments(args);
    return values.reduce<number>((total, value) => {
      if (value === null) {
        return total;
      }
      if (typeof value !== "number") {
        throw new Error("SUM expects numeric arguments");
      }
      return total + value;
    }, 0);
  },
};
