/**
 * @file ISNA function implementation (ODF 1.3 §6.15.9).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";

export const isNaFunction: FormulaFunctionLazyDefinition = {
  name: "ISNA",
  category: "info",
  description: {
    en: "Returns TRUE if evaluating the value results in a #N/A error.",
    ja: "値の評価で#N/Aエラーが発生した場合にTRUEを返します。",
  },
  examples: ['ISNA(VLOOKUP("x", A1:B2, 2, FALSE))', "ISNA(NA())"],
  samples: [
    {
      input: "ISNA(1/0)",
      output: false,
      description: {
        en: "Division by zero is not #N/A",
        ja: "ゼロ除算は#N/Aではない",
      },
    },
  ],
  evaluateLazy: (nodes, context) => {
    if (nodes.length !== 1) {
      throw new Error("ISNA expects exactly one argument");
    }
    try {
      context.evaluate(nodes[0]);
      return false;
    } catch (error) {
      const code = context.helpers.getErrorCode(error);
      return code === "#N/A";
    }
  },
};

