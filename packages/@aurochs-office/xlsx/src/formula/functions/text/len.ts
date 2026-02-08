/**
 * @file LEN function implementation (ODF 1.3 §6.16).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const lenFunction: FormulaFunctionEagerDefinition = {
  name: "LEN",
  category: "text",
  description: {
    en: "Counts the number of Unicode characters in a text value.",
    ja: "文字列内のUnicode文字数を返します。",
  },
  examples: ['LEN("Spreadsheet")', "LEN(A1)"],
  samples: [
    {
      input: 'LEN("Spreadsheet")',
      output: 11,
      description: {
        en: "Counts 11 characters in the text",
        ja: "文字列の11文字をカウント",
      },
    },
    {
      input: 'LEN("Hello World")',
      output: 11,
      description: {
        en: "Counts characters including space",
        ja: "スペースを含めて文字数をカウント",
      },
    },
    {
      input: 'LEN("")',
      output: 0,
      description: {
        en: "Empty string has length 0",
        ja: "空文字列の長さは0",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("LEN expects exactly one argument");
    }
    const [textArg] = args;
    const text = helpers.coerceText(textArg, "LEN text");
    return Array.from(text).length;
  },
};
