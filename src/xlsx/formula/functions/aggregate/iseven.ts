/**
 * @file ISEVEN function implementation (Excel compatibility).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const isEvenFunction: FormulaFunctionEagerDefinition = {
  name: "ISEVEN",
  category: "aggregate",
  description: {
    en: "Returns TRUE if the number is even.",
    ja: "数値が偶数ならTRUEを返します。",
  },
  examples: ["ISEVEN(2)", "ISEVEN(A1)"],
  samples: [
    {
      input: "ISEVEN(2)",
      output: true,
      description: {
        en: "2 is even",
        ja: "2 は偶数",
      },
    },
    {
      input: "ISEVEN(3)",
      output: false,
      description: {
        en: "3 is odd",
        ja: "3 は奇数",
      },
    },
    {
      input: "ISEVEN(2.9)",
      output: true,
      description: {
        en: "Fractional numbers are truncated before parity check",
        ja: "小数は切り捨てた整数部で判定",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("ISEVEN expects exactly one argument");
    }
    const value = helpers.requireNumber(args[0], "ISEVEN number");
    const truncated = Math.trunc(value);
    return truncated % 2 === 0;
  },
};

