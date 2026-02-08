/**
 * @file XOR function implementation (ODF 1.3 §6.11.4).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const xorFunction: FormulaFunctionEagerDefinition = {
  name: "XOR",
  category: "logical",
  description: {
    en: "Returns TRUE when an odd number of arguments evaluate to TRUE.",
    ja: "TRUEとなる引数の数が奇数の場合にTRUEを返します。",
  },
  examples: ["XOR(TRUE, FALSE, TRUE)", "XOR(A1:A4)"],
  samples: [
    {
      input: "XOR(TRUE, FALSE)",
      output: true,
      description: {
        en: "Odd number (1) of TRUE values",
        ja: "TRUE値が奇数個（1個）",
      },
    },
    {
      input: "XOR(TRUE, TRUE)",
      output: false,
      description: {
        en: "Even number (2) of TRUE values",
        ja: "TRUE値が偶数個（2個）",
      },
    },
    {
      input: "XOR(TRUE, FALSE, TRUE)",
      output: false,
      description: {
        en: "Even number (2) of TRUE values",
        ja: "TRUE値が偶数個（2個）",
      },
    },
  ],
  evaluate: (args, helpers) => {
    const values = helpers.flattenArguments(args);
    if (values.length === 0) {
      throw new Error("XOR expects at least one argument");
    }
    const truthyCount = values.reduce<number>((count, value, index) => {
      const booleanValue = helpers.coerceLogical(value, `XOR argument ${index + 1}`);
      return booleanValue ? count + 1 : count;
    }, 0);
    return truthyCount % 2 === 1;
  },
};

// NOTE: Reused reduction approach from src/modules/formula/functions/logical/or.ts.
