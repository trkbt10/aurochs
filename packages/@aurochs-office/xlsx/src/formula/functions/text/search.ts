/**
 * @file SEARCH function implementation (ODF 1.3 §6.16).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

const toCharacters = (text: string): string[] => Array.from(text);

const isMatchAt = (haystack: string[], needle: string[], startIndex: number): boolean => {
  for (let index = 0; index < needle.length; index += 1) {
    if (haystack[startIndex + index] !== needle[index]) {
      return false;
    }
  }
  return true;
};

export const searchFunction: FormulaFunctionEagerDefinition = {
  name: "SEARCH",
  category: "text",
  description: {
    en: "Locates one text value within another without matching case.",
    ja: "大文字小文字を区別せずに文字列の位置を検索します。",
  },
  examples: ['SEARCH("SHEET", "Spreadsheet")', 'SEARCH("-", A1, 2)'],
  samples: [
    {
      input: 'SEARCH("SHEET", "Spreadsheet")',
      output: 7,
      description: {
        en: "Finds 'sheet' at position 7 (case-insensitive)",
        ja: "'sheet'が7文字目から始まる（大文字小文字区別なし）",
      },
    },
    {
      input: 'SEARCH("data", "Database")',
      output: 1,
      description: {
        en: "Finds 'data' at position 1 ignoring case",
        ja: "大文字小文字を無視して'data'を1文字目に発見",
      },
    },
    {
      input: 'SEARCH("-", "2024-01-15", 6)',
      output: 8,
      description: {
        en: "Finds hyphen starting from position 6",
        ja: "6文字目以降のハイフンを検索",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length < 2 || args.length > 3) {
      throw new Error("SEARCH expects two or three arguments");
    }
    const [needleArg, haystackArg, startArg] = args;
    const haystack = helpers.coerceText(haystackArg, "SEARCH within_text");
    const needle = helpers.coerceText(needleArg, "SEARCH find_text");
    const startValue = startArg === undefined ? 1 : helpers.requireNumber(startArg, "SEARCH start");
    const startPosition = helpers.requireInteger(startValue, "SEARCH start must be an integer");
    if (startPosition < 1) {
      throw new Error("SEARCH start must be greater than or equal to 1");
    }
    const haystackChars = toCharacters(haystack.toLocaleLowerCase());
    const needleChars = toCharacters(needle.toLocaleLowerCase());
    if (needleChars.length === 0) {
      if (startPosition > haystackChars.length + 1) {
        throw new Error("SEARCH start is beyond the length of within_text");
      }
      return startPosition;
    }
    if (startPosition > haystackChars.length) {
      throw new Error("SEARCH start is beyond the length of within_text");
    }
    const zeroBasedStart = startPosition - 1;
    const maxStart = haystackChars.length - needleChars.length;
    for (let index = zeroBasedStart; index <= maxStart; index += 1) {
      if (isMatchAt(haystackChars, needleChars, index)) {
        return index + 1;
      }
    }
    throw new Error("SEARCH could not locate the specified text");
  },
};
