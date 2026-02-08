/**
 * @file FALSE function implementation (ODF 1.3 §6.11.9).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const falseFunction: FormulaFunctionEagerDefinition = {
  name: "FALSE",
  category: "logical",
  description: {
    en: "Returns the logical constant FALSE.",
    ja: "論理値FALSEを返します。",
  },
  examples: ["FALSE()"],
  samples: [
    {
      input: "FALSE()",
      output: false,
      description: {
        en: "Return logical FALSE",
        ja: "論理値FALSEを返す",
      },
    },
  ],
  evaluate: (args) => {
    if (args.length !== 0) {
      throw new Error("FALSE expects no arguments");
    }
    return false;
  },
};

// NOTE: Mirrors src/modules/formula/functions/logical/true.ts for symmetry.
