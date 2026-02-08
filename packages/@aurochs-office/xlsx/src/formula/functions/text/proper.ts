/**
 * @file PROPER function implementation (ODF 1.3 §6.16).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

const LETTER_PATTERN = /\p{L}/u;

const isLetter = (character: string): boolean => LETTER_PATTERN.test(character);

export const properFunction: FormulaFunctionEagerDefinition = {
  name: "PROPER",
  category: "text",
  description: {
    en: "Capitalizes the first letter of each word and lowercases the rest.",
    ja: "各単語の先頭文字を大文字にし、残りを小文字に変換します。",
  },
  examples: ['PROPER("hello WORLD")', "PROPER(A1)"],
  samples: [
    {
      input: 'PROPER("hello world")',
      output: "Hello World",
      description: {
        en: "Capitalizes first letter of each word",
        ja: "各単語の先頭文字を大文字化",
      },
    },
    {
      input: 'PROPER("SPREADSHEET DATA")',
      output: "Spreadsheet Data",
      description: {
        en: "Converts to proper case from uppercase",
        ja: "大文字から適切な大文字小文字に変換",
      },
    },
    {
      input: 'PROPER("john DOE")',
      output: "John Doe",
      description: {
        en: "Normalizes mixed case names",
        ja: "混合ケースの名前を正規化",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("PROPER expects exactly one argument");
    }
    const [textArg] = args;
    const text = helpers.coerceText(textArg, "PROPER text");
    const state = { shouldCapitalize: true };
    const result = Array.from(text).map((character) => {
      const lower = character.toLocaleLowerCase();
      if (isLetter(lower)) {
        const next = state.shouldCapitalize ? lower.toLocaleUpperCase() : lower;
        state.shouldCapitalize = false;
        return next;
      }
      state.shouldCapitalize = true;
      return character;
    });
    return result.join("");
  },
};
