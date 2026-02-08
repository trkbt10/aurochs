/**
 * @file INT function implementation (ODF 1.3 §6.13).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { normalizeZero } from "../helpers";

export const intFunction: FormulaFunctionEagerDefinition = {
  name: "INT",
  category: "aggregate",
  description: {
    en: "Rounds a number down to the nearest integer less than or equal to it.",
    ja: "数値を超えない最大の整数に切り下げます。",
  },
  examples: ["INT(5.9)", "INT(A1)"],
  samples: [
    {
      input: "INT(5.9)",
      output: 5,
      description: {
        en: "Round down positive decimal to integer",
        ja: "正の小数を整数に切り下げ",
      },
    },
    {
      input: "INT(-3.2)",
      output: -4,
      description: {
        en: "Round down negative number to lower integer",
        ja: "負の数を下の整数に切り下げ",
      },
    },
    {
      input: "INT(8)",
      output: 8,
      description: {
        en: "Integer value remains unchanged",
        ja: "整数値はそのまま",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("INT expects exactly one argument");
    }
    const [valueArg] = args;
    const value = helpers.requireNumber(valueArg, "INT number");
    const floored = Math.floor(value);
    return normalizeZero(floored);
  },
};
