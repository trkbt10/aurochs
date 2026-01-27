/**
 * @file ABS function implementation (ODF 1.3 §6.13).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { normalizeZero } from "../helpers";

export const absFunction: FormulaFunctionEagerDefinition = {
  name: "ABS",
  category: "aggregate",
  description: {
    en: "Returns the absolute value of a number.",
    ja: "数値の絶対値を返します。",
  },
  examples: ["ABS(-5)", "ABS(A1)"],
  samples: [
    {
      input: "ABS(-5)",
      output: 5,
      description: {
        en: "Absolute value of a negative number",
        ja: "負の数の絶対値",
      },
    },
    {
      input: "ABS(3.14)",
      output: 3.14,
      description: {
        en: "Absolute value of a positive number",
        ja: "正の数の絶対値",
      },
    },
    {
      input: "ABS(0)",
      output: 0,
      description: {
        en: "Absolute value of zero",
        ja: "ゼロの絶対値",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("ABS expects exactly one argument");
    }
    const [valueArg] = args;
    const value = helpers.requireNumber(valueArg, "ABS number");
    const result = Math.abs(value);
    return normalizeZero(result);
  },
};
