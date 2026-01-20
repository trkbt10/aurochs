/**
 * @file ISERROR function implementation (ODF 1.3 §6.15.7).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";

export const isErrorFunction: FormulaFunctionLazyDefinition = {
  name: "ISERROR",
  category: "info",
  description: {
    en: "Returns TRUE if evaluating the value results in an error.",
    ja: "値の評価でエラーが発生した場合にTRUEを返します。",
  },
  examples: ["ISERROR(1/0)", 'ISERROR(VLOOKUP("=", A1:B2, 2, FALSE))'],
  samples: [
    {
      input: "ISERROR(1/0)",
      output: true,
      description: {
        en: "Division by zero is an error",
        ja: "ゼロ除算はエラー",
      },
    },
    {
      input: "ISERROR(42)",
      output: false,
      description: {
        en: "Valid values are not errors",
        ja: "有効な値はエラーではない",
      },
    },
  ],
  evaluateLazy: (nodes, context) => {
    if (nodes.length !== 1) {
      throw new Error("ISERROR expects exactly one argument");
    }
    try {
      context.evaluate(nodes[0]);
      return false;
    } catch (error) {
      context.helpers.getErrorCode(error);
      return true;
    }
  },
};
