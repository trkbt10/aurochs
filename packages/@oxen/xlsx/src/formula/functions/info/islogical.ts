/**
 * @file ISLOGICAL function implementation (ODF 1.3 §6.15.6).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";
import { extractSingleValue } from "./utils";

export const isLogicalFunction: FormulaFunctionLazyDefinition = {
  name: "ISLOGICAL",
  category: "info",
  description: {
    en: "Returns TRUE if the value is a boolean.",
    ja: "値が論理値であればTRUEを返します。",
  },
  examples: ["ISLOGICAL(A1)", "ISLOGICAL(TRUE)"],
  samples: [
    {
      input: "ISLOGICAL(TRUE)",
      output: true,
      description: {
        en: "Check if value is boolean",
        ja: "値が論理値かどうかをチェック",
      },
    },
    {
      input: "ISLOGICAL(FALSE)",
      output: true,
      description: {
        en: "FALSE is also a boolean",
        ja: "FALSEも論理値",
      },
    },
    {
      input: "ISLOGICAL(1)",
      output: false,
      description: {
        en: "Numbers are not boolean",
        ja: "数値は論理値ではない",
      },
    },
  ],
  evaluateLazy: (nodes, context) => {
    if (nodes.length !== 1) {
      throw new Error("ISLOGICAL expects exactly one argument");
    }
    try {
      const value = context.evaluate(nodes[0]);
      const scalar = extractSingleValue(value, context.helpers, "ISLOGICAL argument");
      return typeof scalar === "boolean";
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
      return false;
    }
  },
};
