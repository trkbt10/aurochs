/**
 * @file AND function implementation (ODF 1.3 §6.11.1).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const andFunction: FormulaFunctionEagerDefinition = {
  name: "AND",
  category: "logical",
  description: {
    en: "Returns TRUE if all arguments evaluate to TRUE; otherwise FALSE.",
    ja: "すべての引数がTRUEの場合にTRUEを返し、それ以外はFALSEを返します。",
  },
  examples: ["AND(TRUE, FALSE)", "AND(A1:A3)"],
  samples: [
    {
      input: "AND(TRUE, TRUE, TRUE)",
      output: true,
      description: {
        en: "All values are TRUE",
        ja: "すべての値がTRUE",
      },
    },
    {
      input: "AND(TRUE, FALSE, TRUE)",
      output: false,
      description: {
        en: "At least one FALSE",
        ja: "少なくとも1つがFALSE",
      },
    },
    {
      input: "AND(1, 1, 1)",
      output: true,
      description: {
        en: "Non-zero numbers coerce to TRUE",
        ja: "ゼロ以外の数値はTRUEに変換される",
      },
    },
  ],
  evaluate: (args, helpers) => {
    const values = helpers.flattenArguments(args);
    if (values.length === 0) {
      throw new Error("AND expects at least one argument");
    }
    return values.reduce<boolean>((accumulator, value, index) => {
      if (!accumulator) {
        return false;
      }
      const booleanValue = helpers.coerceLogical(value, `AND argument ${index + 1}`);
      return accumulator && booleanValue;
    }, true);
  },
};

// NOTE: Reviewed src/modules/formula/functions/helpers/index.ts to align helper usage.
