/**
 * @file ERROR.TYPE function implementation (ODF 1.3 §6.15.12).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";

export const errorTypeFunction: FormulaFunctionLazyDefinition = {
  name: "ERROR.TYPE",
  category: "info",
  description: {
    en: "Returns a number corresponding to an error value.",
    ja: "エラー値に対応する番号を返します。",
  },
  examples: ['ERROR.TYPE(1/0)', 'ERROR.TYPE(IFNA(A1, "Fallback"))'],
  samples: [
    {
      input: "ERROR.TYPE(1/0)",
      output: 2,
      description: {
        en: "Division by zero error type",
        ja: "ゼロ除算エラーのタイプ",
      },
    },
  ],
  evaluateLazy: (nodes, context) => {
    if (nodes.length !== 1) {
      throw new Error("ERROR.TYPE expects exactly one argument");
    }
    try {
      context.evaluate(nodes[0]);
    } catch (error) {
      const code = context.helpers.getErrorCode(error);
      return context.helpers.getErrorTypeNumber(code);
    }
    throw context.helpers.createFormulaError("#N/A", "ERROR.TYPE expects an error value");
  },
};
