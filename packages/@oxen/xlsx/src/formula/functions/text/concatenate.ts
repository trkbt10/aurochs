/**
 * @file CONCATENATE function implementation (Excel compatibility).
 *
 * Historical alias of CONCAT().
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { valueToText } from "../helpers";

export const concatenateFunction: FormulaFunctionEagerDefinition = {
  name: "CONCATENATE",
  category: "text",
  description: {
    en: "Concatenates text values into a single string (legacy alias of CONCAT).",
    ja: "文字列を連結して1つの文字列にします（CONCAT の互換・旧名）。",
  },
  examples: ['CONCATENATE("Hello", " ", "World")', "CONCATENATE(A1, B1)"],
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

