/**
 * @file IFNA function implementation (ODF 1.3 §6.15.11).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";

export const ifNaFunction: FormulaFunctionLazyDefinition = {
  name: "IFNA",
  category: "info",
  description: {
    en: "Returns an alternative value if the original evaluation results in #N/A; otherwise returns the original result.",
    ja: "元の評価が#N/Aエラーとなった場合に代替値を返し、そうでなければ元の結果を返します。",
  },
  examples: ['IFNA(VLOOKUP("x", A1:B2, 2, FALSE), "Not found")'],
  samples: [
    {
      input: 'IFNA(100, "N/A")',
      output: 100,
      description: {
        en: "Return original value if not #N/A",
        ja: "#N/Aでなければ元の値を返す",
      },
    },
    {
      input: 'IFNA("result", "fallback")',
      output: "result",
      description: {
        en: "Valid result is returned",
        ja: "有効な結果が返される",
      },
    },
  ],
  evaluateLazy: (nodes, context) => {
    if (nodes.length < 1 || nodes.length > 2) {
      throw new Error("IFNA expects one or two arguments");
    }
    try {
      return context.evaluate(nodes[0]);
    } catch (error) {
      if (!context.helpers.isNAError(error)) {
        throw error;
      }
      if (nodes.length === 1) {
        return null;
      }
      return context.evaluate(nodes[1]);
    }
  },
};
