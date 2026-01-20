/**
 * @file MID function implementation (ODF 1.3 §6.16).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const midFunction: FormulaFunctionEagerDefinition = {
  name: "MID",
  category: "text",
  description: {
    en: "Returns a substring starting at a given position for a specified length.",
    ja: "指定した位置から指定した長さの部分文字列を返します。",
  },
  examples: ['MID("Spreadsheet", 2, 5)', "MID(A1, 3, 4)"],
  samples: [
    {
      input: 'MID("Spreadsheet", 7, 5)',
      output: "sheet",
      description: {
        en: "Extracts 5 characters starting at position 7",
        ja: "7文字目から5文字を抽出",
      },
    },
    {
      input: 'MID("Hello World", 7, 5)',
      output: "World",
      description: {
        en: "Extracts 5 characters starting at position 7",
        ja: "7文字目から5文字を抽出",
      },
    },
    {
      input: 'MID("2024-01-15", 6, 2)',
      output: "01",
      description: {
        en: "Extracts month portion from date string",
        ja: "日付文字列から月部分を抽出",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 3) {
      throw new Error("MID expects exactly three arguments");
    }
    const [textArg, startArg, lengthArg] = args;
    const text = helpers.coerceText(textArg, "MID text");
    const startValue = helpers.requireNumber(startArg, "MID start");
    const lengthValue = helpers.requireNumber(lengthArg, "MID length");
    const startPosition = helpers.requireInteger(startValue, "MID start must be an integer");
    const requestedLength = helpers.requireInteger(lengthValue, "MID length must be an integer");
    if (startPosition < 1) {
      throw new Error("MID start must be greater than or equal to 1");
    }
    if (requestedLength < 0) {
      throw new Error("MID length must be non-negative");
    }
    if (requestedLength === 0) {
      return "";
    }
    const characters = Array.from(text);
    const zeroBasedStart = startPosition - 1;
    if (zeroBasedStart >= characters.length) {
      return "";
    }
    const sliceEnd = Math.min(zeroBasedStart + requestedLength, characters.length);
    return characters.slice(zeroBasedStart, sliceEnd).join("");
  },
};
