/**
 * @file ISTEXT function implementation (ODF 1.3 §6.15.5).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";
import { extractSingleValue } from "./utils";

export const isTextFunction: FormulaFunctionLazyDefinition = {
  name: "ISTEXT",
  category: "info",
  description: {
    en: "Returns TRUE if the value is text.",
    ja: "値が文字列の場合にTRUEを返します。",
  },
  examples: ["ISTEXT(A1)", "ISTEXT(\"hello\")"],
  samples: [
    {
      input: 'ISTEXT("hello")',
      output: true,
      description: {
        en: "Check if value is text",
        ja: "値がテキストかどうかをチェック",
      },
    },
    {
      input: "ISTEXT(123)",
      output: false,
      description: {
        en: "Numbers are not text",
        ja: "数値はテキストではない",
      },
    },
    {
      input: 'ISTEXT("")',
      output: true,
      description: {
        en: "Empty string is text",
        ja: "空文字列もテキスト",
      },
    },
  ],
  evaluateLazy: (nodes, context) => {
    if (nodes.length !== 1) {
      throw new Error("ISTEXT expects exactly one argument");
    }
    try {
      const value = context.evaluate(nodes[0]);
      const scalar = extractSingleValue(value, context.helpers, "ISTEXT argument");
      return typeof scalar === "string";
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
      return false;
    }
  },
};
