/**
 * @file COUNT function implementation (ODF 1.3 §6.18.4).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const countFunction: FormulaFunctionEagerDefinition = {
  name: "COUNT",
  category: "statistical",
  description: {
    en: "Counts numeric values in the arguments, ignoring non-numeric entries.",
    ja: "数値以外を無視して引数内の数値を数えます。",
  },
  examples: ['COUNT(1, 2, "x")', "COUNT(A1:A10)"],
  samples: [
    {
      input: 'COUNT(1, 2, 3, "text", 4)',
      output: 4,
      description: {
        en: "Count only numeric values",
        ja: "数値のみをカウント",
      },
    },
    {
      input: "COUNT(10, 20, 30)",
      output: 3,
      description: {
        en: "Count all numbers",
        ja: "すべての数値をカウント",
      },
    },
    {
      input: 'COUNT("a", "b", "c")',
      output: 0,
      description: {
        en: "No numeric values",
        ja: "数値がない",
      },
    },
  ],
  evaluate: (args, helpers) => {
    const values = helpers.flattenArguments(args);
    return values.reduce<number>((count, value) => (typeof value === "number" ? count + 1 : count), 0);
  },
};
