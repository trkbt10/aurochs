/**
 * @file UPPER function implementation (ODF 1.3 §6.16).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const upperFunction: FormulaFunctionEagerDefinition = {
  name: "UPPER",
  category: "text",
  description: {
    en: "Converts text to uppercase using locale-aware rules.",
    ja: "ロケールに応じた規則で文字列を大文字に変換します。",
  },
  examples: ['UPPER("Spreadsheet")', "UPPER(A1)"],
  samples: [
    {
      input: 'UPPER("Spreadsheet")',
      output: "SPREADSHEET",
      description: {
        en: "Converts all letters to uppercase",
        ja: "全ての文字を大文字に変換",
      },
    },
    {
      input: 'UPPER("hello world")',
      output: "HELLO WORLD",
      description: {
        en: "Converts lowercase text to uppercase",
        ja: "小文字テキストを大文字に変換",
      },
    },
    {
      input: 'UPPER("MixedCase123")',
      output: "MIXEDCASE123",
      description: {
        en: "Converts letters while preserving numbers",
        ja: "数字を保持して文字を大文字化",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("UPPER expects exactly one argument");
    }
    const [textArg] = args;
    const text = helpers.coerceText(textArg, "UPPER text");
    return text.toLocaleUpperCase();
  },
};
