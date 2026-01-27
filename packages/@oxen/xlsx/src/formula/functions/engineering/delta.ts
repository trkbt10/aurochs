/**
 * @file DELTA function implementation (ODF 1.3 §6.19).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const deltaFunction: FormulaFunctionEagerDefinition = {
  name: "DELTA",
  category: "engineering",
  description: {
    en: "Tests whether two numbers are equal.",
    ja: "2つの数値が等しいかどうかを判定します。",
  },
  examples: ["DELTA(5, 5)", "DELTA(3)"],
  samples: [
    {
      input: "DELTA(5, 5)",
      output: 1,
      description: {
        en: "Returns 1 when numbers are equal",
        ja: "数値が等しいときは1を返す",
      },
    },
    {
      input: "DELTA(5, 3)",
      output: 0,
      description: {
        en: "Returns 0 when numbers are different",
        ja: "数値が異なるときは0を返す",
      },
    },
    {
      input: "DELTA(0)",
      output: 1,
      description: {
        en: "Single argument compares with 0 (returns 1 when value is 0)",
        ja: "引数1つの場合は0と比較（値が0の場合は1を返す）",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length === 0 || args.length > 2) {
      throw new Error("DELTA expects one or two arguments");
    }
    const x = helpers.requireNumber(args[0], "DELTA number1");
    const y = args.length === 2 ? helpers.requireNumber(args[1], "DELTA number2") : 0;
    return x === y ? 1 : 0;
  },
};
