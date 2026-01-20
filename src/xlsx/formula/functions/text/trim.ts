/**
 * @file TRIM function implementation (ODF 1.3 §6.16).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const trimFunction: FormulaFunctionEagerDefinition = {
  name: "TRIM",
  category: "text",
  description: {
    en: "Removes leading/trailing whitespace and collapses internal spaces to a single space.",
    ja: "前後の空白を削除し、内部の空白連続を1つのスペースに縮めます。",
  },
  examples: ['TRIM("  data  ")', "TRIM(A1)"],
  samples: [
    {
      input: 'TRIM("  Hello World  ")',
      output: "Hello World",
      description: {
        en: "Removes leading and trailing spaces",
        ja: "前後のスペースを削除",
      },
    },
    {
      input: 'TRIM("Data   Analysis")',
      output: "Data Analysis",
      description: {
        en: "Collapses multiple internal spaces to one",
        ja: "内部の複数スペースを1つに縮小",
      },
    },
    {
      input: 'TRIM("  Multiple   Spaces   Everywhere  ")',
      output: "Multiple Spaces Everywhere",
      description: {
        en: "Removes extra spaces from all positions",
        ja: "全ての余分なスペースを削除",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("TRIM expects exactly one argument");
    }
    const [textArg] = args;
    const text = helpers.coerceText(textArg, "TRIM text");
    return text.replace(/\s+/gu, " ").trim();
  },
};
