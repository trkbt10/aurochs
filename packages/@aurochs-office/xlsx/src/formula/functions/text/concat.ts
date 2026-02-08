/**
 * @file CONCAT function implementation (ODF 1.3 §6.16).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { valueToText } from "../helpers";

export const concatFunction: FormulaFunctionEagerDefinition = {
  name: "CONCAT",
  category: "text",
  description: {
    en: "Concatenates text values, numbers, and booleans into a single string.",
    ja: "文字列や数値、真偽値を連結して1つの文字列にします。",
  },
  examples: ['CONCAT("Hello", " ", "World")', "CONCAT(A1:A3)"],
  samples: [
    {
      input: 'CONCAT("Hello", " ", "World")',
      output: "Hello World",
      description: {
        en: "Concatenates three text strings with a space",
        ja: "3つの文字列をスペースで連結",
      },
    },
    {
      input: 'CONCAT("Year: ", 2024)',
      output: "Year: 2024",
      description: {
        en: "Concatenates text and number",
        ja: "文字列と数値を連結",
      },
    },
    {
      input: 'CONCAT("Status: ", TRUE)',
      output: "Status: TRUE",
      description: {
        en: "Concatenates text and boolean value",
        ja: "文字列と真偽値を連結",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length === 0) {
      return "";
    }
    const values = helpers.flattenArguments(args);
    return values.reduce<string>((accumulator, value) => {
      return `${accumulator}${valueToText(value)}`;
    }, "");
  },
};
