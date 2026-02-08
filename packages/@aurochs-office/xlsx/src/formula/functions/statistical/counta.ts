/**
 * @file COUNTA function implementation (ODF 1.3 §6.18.11).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const countAFunction: FormulaFunctionEagerDefinition = {
  name: "COUNTA",
  category: "statistical",
  description: {
    en: "Counts non-empty values, including text and booleans.",
    ja: "文字列や真偽値を含む空でない値の件数を数えます。",
  },
  examples: ["COUNTA(A1:A10)", 'COUNTA(1, "text", TRUE, null)'],
  samples: [
    {
      input: 'COUNTA(1, "text", TRUE)',
      output: 3,
      description: {
        en: "Count all non-empty values",
        ja: "すべての空でない値をカウント",
      },
    },
    {
      input: 'COUNTA(1, 2, "", 3)',
      output: 4,
      description: {
        en: "Empty string counts as non-empty",
        ja: "空文字列も空でないとしてカウント",
      },
    },
    {
      input: "COUNTA(10, 20, 30)",
      output: 3,
      description: {
        en: "Count numbers",
        ja: "数値をカウント",
      },
    },
  ],
  evaluate: (args, helpers) => {
    const values = helpers.flattenArguments(args);
    return values.reduce<number>((count, value) => (value === null ? count : count + 1), 0);
  },
};

// NOTE: Followed numeric filtering conventions established in src/modules/formula/functions/statistical/count.ts.
