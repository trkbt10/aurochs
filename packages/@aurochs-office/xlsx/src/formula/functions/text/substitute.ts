/**
 * @file SUBSTITUTE function implementation (ODF 1.3 §6.16).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const substituteFunction: FormulaFunctionEagerDefinition = {
  name: "SUBSTITUTE",
  category: "text",
  description: {
    en: "Replaces occurrences of text with new text, optionally targeting a specific instance.",
    ja: "文字列の出現箇所を新しい文字列に置き換え、指定回のみ置換することも可能です。",
  },
  examples: ['SUBSTITUTE("banana", "a", "o")', 'SUBSTITUTE(A1, ".", "-", 1)'],
  samples: [
    {
      input: 'SUBSTITUTE("banana", "a", "o")',
      output: "bonono",
      description: {
        en: "Replaces all occurrences of 'a' with 'o'",
        ja: "全ての'a'を'o'に置換",
      },
    },
    {
      input: 'SUBSTITUTE("banana", "a", "o", 2)',
      output: "banona",
      description: {
        en: "Replaces only the second occurrence of 'a'",
        ja: "2番目の'a'のみを置換",
      },
    },
    {
      input: 'SUBSTITUTE("2024.01.15", ".", "-")',
      output: "2024-01-15",
      description: {
        en: "Replaces all dots with hyphens",
        ja: "全てのドットをハイフンに置換",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length < 3 || args.length > 4) {
      throw new Error("SUBSTITUTE expects three or four arguments");
    }
    const [textArg, oldTextArg, newTextArg, instanceArg] = args;
    const text = helpers.coerceText(textArg, "SUBSTITUTE text");
    const oldText = helpers.coerceText(oldTextArg, "SUBSTITUTE old_text");
    const newText = helpers.coerceText(newTextArg, "SUBSTITUTE new_text");
    if (oldText.length === 0) {
      throw new Error("SUBSTITUTE old_text must be non-empty");
    }
    if (instanceArg === undefined) {
      return text.split(oldText).join(newText);
    }
    const rawInstance = helpers.requireNumber(instanceArg, "SUBSTITUTE instance");
    const instanceNumber = helpers.requireInteger(rawInstance, "SUBSTITUTE instance must be an integer");
    if (instanceNumber <= 0) {
      throw new Error("SUBSTITUTE instance must be greater than or equal to 1");
    }
    const state = { searchIndex: 0, occurrence: 0 };
    while (state.searchIndex <= text.length) {
      const foundIndex = text.indexOf(oldText, state.searchIndex);
      if (foundIndex === -1) {
        return text;
      }
      state.occurrence += 1;
      if (state.occurrence === instanceNumber) {
        const prefix = text.slice(0, foundIndex);
        const suffix = text.slice(foundIndex + oldText.length);
        return `${prefix}${newText}${suffix}`;
      }
      state.searchIndex = foundIndex + oldText.length;
    }
    return text;
  },
};
