/**
 * @file LOWER function implementation (ODF 1.3 §6.16).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const lowerFunction: FormulaFunctionEagerDefinition = {
  name: "LOWER",
  category: "text",
  description: {
    en: "Converts text to lowercase using locale-aware rules.",
    ja: "ロケールに応じた規則で文字列を小文字に変換します。",
  },
  examples: ['LOWER("SpreadSheet")', "LOWER(A1)"],
  samples: [
    {
      input: 'LOWER("SPREADSHEET")',
      output: "spreadsheet",
      description: {
        en: "Converts all letters to lowercase",
        ja: "全ての文字を小文字に変換",
      },
    },
    {
      input: 'LOWER("Hello World")',
      output: "hello world",
      description: {
        en: "Converts uppercase text to lowercase",
        ja: "大文字テキストを小文字に変換",
      },
    },
    {
      input: 'LOWER("MixedCase123")',
      output: "mixedcase123",
      description: {
        en: "Converts letters while preserving numbers",
        ja: "数字を保持して文字を小文字化",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("LOWER expects exactly one argument");
    }
    const [textArg] = args;
    const text = helpers.coerceText(textArg, "LOWER text");
    return text.toLocaleLowerCase();
  },
};
