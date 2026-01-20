/**
 * @file POWER function implementation (ODF 1.3 §6.13).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const powerFunction: FormulaFunctionEagerDefinition = {
  name: "POWER",
  category: "aggregate",
  description: {
    en: "Raises a base number to a given exponent.",
    ja: "指定した指数で底となる数値をべき乗します。",
  },
  examples: ["POWER(2, 3)", "POWER(A1, 0.5)"],
  samples: [
    {
      input: "POWER(2, 3)",
      output: 8,
      description: {
        en: "Two raised to the power of three",
        ja: "2の3乗",
      },
    },
    {
      input: "POWER(5, 2)",
      output: 25,
      description: {
        en: "Five squared",
        ja: "5の2乗",
      },
    },
    {
      input: "POWER(4, 0.5)",
      output: 2,
      description: {
        en: "Square root using fractional exponent",
        ja: "小数指数を使用した平方根",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 2) {
      throw new Error("POWER expects exactly two arguments");
    }
    const [baseArg, exponentArg] = args;
    const base = helpers.requireNumber(baseArg, "POWER base");
    const exponent = helpers.requireNumber(exponentArg, "POWER exponent");
    return base ** exponent;
  },
};
