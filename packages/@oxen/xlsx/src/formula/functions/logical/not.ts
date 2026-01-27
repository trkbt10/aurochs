/**
 * @file NOT function implementation (ODF 1.3 §6.11.3).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const notFunction: FormulaFunctionEagerDefinition = {
  name: "NOT",
  category: "logical",
  description: {
    en: "Returns the logical negation of a boolean value.",
    ja: "真偽値を反転させた結果を返します。",
  },
  examples: ["NOT(TRUE)", "NOT(A1)"],
  samples: [
    {
      input: "NOT(TRUE)",
      output: false,
      description: {
        en: "Negate TRUE to FALSE",
        ja: "TRUEをFALSEに反転",
      },
    },
    {
      input: "NOT(FALSE)",
      output: true,
      description: {
        en: "Negate FALSE to TRUE",
        ja: "FALSEをTRUEに反転",
      },
    },
    {
      input: "NOT(0)",
      output: true,
      description: {
        en: "Zero is FALSE, so NOT returns TRUE",
        ja: "ゼロはFALSEなのでNOTはTRUEを返す",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("NOT expects exactly one argument");
    }
    const booleanValue = helpers.coerceLogical(args[0], "NOT argument");
    return !booleanValue;
  },
};

// NOTE: Confirmed logical coercion behaviour in src/modules/formula/functions/helpers/coerceLogical.ts.
