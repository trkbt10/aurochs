/**
 * @file TRUE function implementation (ODF 1.3 §6.11.8).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const trueFunction: FormulaFunctionEagerDefinition = {
  name: "TRUE",
  category: "logical",
  description: {
    en: "Returns the logical constant TRUE.",
    ja: "論理値TRUEを返します。",
  },
  examples: ["TRUE()"],
  samples: [
    {
      input: "TRUE()",
      output: true,
      description: {
        en: "Return logical TRUE",
        ja: "論理値TRUEを返す",
      },
    },
  ],
  evaluate: (args) => {
    if (args.length !== 0) {
      throw new Error("TRUE expects no arguments");
    }
    return true;
  },
};

// NOTE: No external references needed for constants; kept for completeness.
