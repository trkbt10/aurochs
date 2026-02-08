/**
 * @file ISNUMBER function implementation (ODF 1.3 §6.15.4).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";
import { extractSingleValue } from "./utils";

export const isNumberFunction: FormulaFunctionLazyDefinition = {
  name: "ISNUMBER",
  category: "info",
  description: {
    en: "Returns TRUE if the value is a finite number.",
    ja: "値が有限の数値であればTRUEを返します。",
  },
  examples: ["ISNUMBER(A1)", "ISNUMBER(42)"],
  samples: [
    {
      input: "ISNUMBER(42)",
      output: true,
      description: {
        en: "Check if value is a number",
        ja: "値が数値かどうかをチェック",
      },
    },
    {
      input: 'ISNUMBER("text")',
      output: false,
      description: {
        en: "Text is not a number",
        ja: "テキストは数値ではない",
      },
    },
    {
      input: "ISNUMBER(3.14)",
      output: true,
      description: {
        en: "Decimal numbers are valid",
        ja: "小数も有効な数値",
      },
    },
  ],
  evaluateLazy: (nodes, context) => {
    if (nodes.length !== 1) {
      throw new Error("ISNUMBER expects exactly one argument");
    }
    try {
      const value = context.evaluate(nodes[0]);
      const scalar = extractSingleValue(value, context.helpers, "ISNUMBER argument");
      return typeof scalar === "number" && Number.isFinite(scalar);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
      return false;
    }
  },
};
