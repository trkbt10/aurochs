/**
 * @file COUNTIFS function implementation (ODF 1.3 §6.18.8).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { createCriteriaPredicate } from "../helpers";

export const countIfsFunction: FormulaFunctionEagerDefinition = {
  name: "COUNTIFS",
  category: "statistical",
  description: {
    en: "Counts values that satisfy multiple range/criteria pairs.",
    ja: "複数の範囲と条件をすべて満たす件数を数えます。",
  },
  examples: ['COUNTIFS(A1:A10, "East", B1:B10, ">=2024")', "COUNTIFS(A1:A5, B1:B5, 1)"],
  samples: [
    {
      input: 'COUNTIFS({1, 2, 3, 4}, ">1", {10, 20, 30, 40}, ">=20")',
      output: 2,
      description: {
        en: "Count with multiple criteria",
        ja: "複数条件でのカウント",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length < 2 || args.length % 2 !== 0) {
      throw new Error("COUNTIFS expects range/criteria pairs");
    }

    const pairCount = args.length / 2;
    const pairs = Array.from({ length: pairCount }, (_, pairIndex) => {
      const rangeArg = args[pairIndex * 2];
      const criteriaArg = args[pairIndex * 2 + 1];
      const rangeValues = helpers.flattenResult(rangeArg);
      const criteria = helpers.coerceScalar(criteriaArg, `COUNTIFS criteria ${pairIndex + 1}`);
      const predicate = createCriteriaPredicate(
        criteria,
        helpers.comparePrimitiveEquality,
        `COUNTIFS criteria ${pairIndex + 1}`,
      );
      return {
        rangeValues,
        predicate,
      };
    });

    const referenceLength = pairs[0]?.rangeValues.length ?? 0;
    if (pairs.some(({ rangeValues }) => rangeValues.length !== referenceLength)) {
      throw new Error("COUNTIFS requires all ranges to be the same size");
    }

    return Array.from({ length: referenceLength }, (_, index) => index).reduce<number>(
      (count, index) =>
        pairs.every(({ rangeValues, predicate }) => predicate(rangeValues[index])) ? count + 1 : count,
      0,
    );
  },
};

// NOTE: Shares predicate creation logic with COUNTIF at src/modules/formula/functions/statistical/countif.ts.
