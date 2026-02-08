/**
 * @file SIGN function implementation (ODF 1.3 §6.13).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const signFunction: FormulaFunctionEagerDefinition = {
  name: "SIGN",
  category: "aggregate",
  description: {
    en: "Returns 1 for positive numbers, -1 for negative numbers, and 0 otherwise.",
    ja: "数値が正なら1、負なら-1、それ以外は0を返します。",
  },
  examples: ["SIGN(-3)", "SIGN(A1)"],
  samples: [
    {
      input: "SIGN(10)",
      output: 1,
      description: {
        en: "Sign of positive number",
        ja: "正の数の符号",
      },
    },
    {
      input: "SIGN(-5)",
      output: -1,
      description: {
        en: "Sign of negative number",
        ja: "負の数の符号",
      },
    },
    {
      input: "SIGN(0)",
      output: 0,
      description: {
        en: "Sign of zero",
        ja: "ゼロの符号",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("SIGN expects exactly one argument");
    }
    const [valueArg] = args;
    const value = helpers.requireNumber(valueArg, "SIGN number");
    if (value > 0) {
      return 1;
    }
    if (value < 0) {
      return -1;
    }
    return 0;
  },
};
