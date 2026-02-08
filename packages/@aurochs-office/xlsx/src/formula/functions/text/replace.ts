/**
 * @file REPLACE function implementation (ODF 1.3 §6.16).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const replaceFunction: FormulaFunctionEagerDefinition = {
  name: "REPLACE",
  category: "text",
  description: {
    en: "Replaces part of a text string with new text based on position and length.",
    ja: "文字列の指定位置と長さに基づいて新しい文字列に置き換えます。",
  },
  examples: ['REPLACE("Spreadsheet", 7, 4, "book")', 'REPLACE(A1, 1, 2, "X")'],
  samples: [
    {
      input: 'REPLACE("Spreadsheet", 7, 5, "book")',
      output: "Spreadbook",
      description: {
        en: "Replaces 5 characters at position 7 with 'book'",
        ja: "7文字目から5文字を'book'に置換",
      },
    },
    {
      input: 'REPLACE("2024-01-15", 6, 2, "12")',
      output: "2024-12-15",
      description: {
        en: "Replaces month in date string",
        ja: "日付文字列の月部分を置換",
      },
    },
    {
      input: 'REPLACE("Hello World", 1, 5, "Hi")',
      output: "Hi World",
      description: {
        en: "Replaces first word with shorter text",
        ja: "最初の単語をより短いテキストに置換",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 4) {
      throw new Error("REPLACE expects exactly four arguments");
    }
    const [textArg, startArg, lengthArg, newTextArg] = args;
    const text = helpers.coerceText(textArg, "REPLACE text");
    const startValue = helpers.requireNumber(startArg, "REPLACE position");
    const lengthValue = helpers.requireNumber(lengthArg, "REPLACE length");
    const startPosition = helpers.requireInteger(startValue, "REPLACE position must be an integer");
    const replaceLength = helpers.requireInteger(lengthValue, "REPLACE length must be an integer");
    if (startPosition < 1) {
      throw new Error("REPLACE position must be greater than or equal to 1");
    }
    if (replaceLength < 0) {
      throw new Error("REPLACE length must be non-negative");
    }
    const newText = helpers.coerceText(newTextArg, "REPLACE new_text");
    const characters = Array.from(text);
    const zeroBasedStart = startPosition - 1;
    const zeroBasedEnd = zeroBasedStart + replaceLength;
    const prefix = characters.slice(0, zeroBasedStart).join("");
    const suffix = characters.slice(Math.min(zeroBasedEnd, characters.length)).join("");
    return `${prefix}${newText}${suffix}`;
  },
};
