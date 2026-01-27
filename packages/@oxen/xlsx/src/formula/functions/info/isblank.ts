/**
 * @file ISBLANK function implementation (ODF 1.3 §6.15.3).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";
import { extractSingleValue } from "./utils";

export const isBlankFunction: FormulaFunctionLazyDefinition = {
  name: "ISBLANK",
  category: "info",
  description: {
    en: "Returns TRUE if the value is empty (null).",
    ja: "値が空(null)の場合にTRUEを返します。",
  },
  examples: ["ISBLANK(A1)", 'ISBLANK("")'],
  samples: [
    {
      input: 'ISBLANK("")',
      output: false,
      description: {
        en: "Empty string is not blank (null)",
        ja: "空文字列はblank（null）ではない",
      },
    },
    {
      input: "ISBLANK(0)",
      output: false,
      description: {
        en: "Zero is not blank",
        ja: "ゼロはblankではない",
      },
    },
  ],
  evaluateLazy: (nodes, context) => {
    if (nodes.length !== 1) {
      throw new Error("ISBLANK expects exactly one argument");
    }
    try {
      const value = context.evaluate(nodes[0]);
      const scalar = extractSingleValue(value, context.helpers, "ISBLANK argument");
      return scalar === null;
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
      return false;
    }
  },
};
