/**
 * @file COUNTIF function implementation (ODF 1.3 §6.18.5).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { createCriteriaPredicate } from "../helpers";

export const countIfFunction: FormulaFunctionEagerDefinition = {
  name: "COUNTIF",
  category: "statistical",
  description: {
    en: "Counts the number of values in a range that meet a single condition.",
    ja: "範囲内で条件を満たす値の件数を数えます。",
  },
  examples: ['COUNTIF(A1:A10, ">10")', 'COUNTIF(A1:A10, "=Yes")'],
  samples: [
    {
      input: 'COUNTIF({5, 10, 15, 20}, ">10")',
      output: 2,
      description: {
        en: "Count values greater than 10",
        ja: "10より大きい値をカウント",
      },
    },
    {
      input: 'COUNTIF({"Yes", "No", "Yes"}, "Yes")',
      output: 2,
      description: {
        en: "Count matching text values",
        ja: "一致するテキスト値をカウント",
      },
    },
    {
      input: 'COUNTIF({1, 2, 3, 4, 5}, ">=3")',
      output: 3,
      description: {
        en: "Count with greater-than-or-equal condition",
        ja: "以上の条件でカウント",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 2) {
      throw new Error("COUNTIF expects exactly two arguments");
    }
    const [rangeArg, criteriaArg] = args;
    const values = helpers.flattenResult(rangeArg);
    const criteria = helpers.coerceScalar(criteriaArg, "COUNTIF criteria");
    const predicate = createCriteriaPredicate(criteria, helpers.comparePrimitiveEquality, "COUNTIF criteria");
    return values.reduce<number>((count, value) => (predicate(value) ? count + 1 : count), 0);
  },
};
