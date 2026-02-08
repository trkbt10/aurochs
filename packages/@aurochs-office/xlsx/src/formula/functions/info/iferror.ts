/**
 * @file IFERROR function implementation (ODF 1.3 §6.15.10).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";

export const ifErrorFunction: FormulaFunctionLazyDefinition = {
  name: "IFERROR",
  category: "info",
  description: {
    en: "Returns an alternative value if an error occurs; otherwise returns the original result.",
    ja: "エラーが発生した場合は代替値を返し、そうでなければ元の結果を返します。",
  },
  examples: ['IFERROR(1/0, 0)', 'IFERROR(VLOOKUP("x", A1:B2, 2, FALSE), "Not found")'],
  samples: [
    {
      input: "IFERROR(1/0, 0)",
      output: 0,
      description: {
        en: "Return fallback value on error",
        ja: "エラー時に代替値を返す",
      },
    },
    {
      input: "IFERROR(10/2, 0)",
      output: 5,
      description: {
        en: "Return original value if no error",
        ja: "エラーがなければ元の値を返す",
      },
    },
    {
      input: 'IFERROR(100, "error")',
      output: 100,
      description: {
        en: "Valid value is returned as-is",
        ja: "有効な値はそのまま返される",
      },
    },
  ],
  evaluateLazy: (nodes, context) => {
    if (nodes.length < 1 || nodes.length > 2) {
      throw new Error("IFERROR expects one or two arguments");
    }
    try {
      return context.evaluate(nodes[0]);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
      if (nodes.length === 1) {
        return null;
      }
      return context.evaluate(nodes[1]);
    }
  },
};
