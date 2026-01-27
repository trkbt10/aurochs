/**
 * @file RIGHT function implementation (ODF 1.3 §6.16).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const rightFunction: FormulaFunctionEagerDefinition = {
  name: "RIGHT",
  category: "text",
  description: {
    en: "Returns the rightmost characters from a text value.",
    ja: "文字列の右端から指定した文字数を返します。",
  },
  examples: ['RIGHT("Spreadsheet", 4)', "RIGHT(A1, 2)"],
  samples: [
    {
      input: 'RIGHT("Spreadsheet", 5)',
      output: "sheet",
      description: {
        en: "Extracts last 5 characters from the right",
        ja: "右から最後の5文字を抽出",
      },
    },
    {
      input: 'RIGHT("Hello World", 5)',
      output: "World",
      description: {
        en: "Extracts last 5 characters",
        ja: "最後の5文字を抽出",
      },
    },
    {
      input: 'RIGHT("Data")',
      output: "a",
      description: {
        en: "Defaults to 1 character when count is omitted",
        ja: "文字数省略時は1文字を返す",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length === 0 || args.length > 2) {
      throw new Error("RIGHT expects one or two arguments");
    }
    const [textArg, countArg] = args;
    const text = helpers.coerceText(textArg, "RIGHT text");
    const countValue = countArg === undefined ? 1 : helpers.requireNumber(countArg, "RIGHT number");
    const requestedCount = helpers.requireInteger(countValue, "RIGHT number must be an integer");
    if (requestedCount < 0) {
      throw new Error("RIGHT number must be non-negative");
    }
    if (requestedCount === 0) {
      return "";
    }
    const characters = Array.from(text);
    const sliceStart = Math.max(characters.length - requestedCount, 0);
    return characters.slice(sliceStart).join("");
  },
};
