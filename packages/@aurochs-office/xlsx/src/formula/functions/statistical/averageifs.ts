/**
 * @file AVERAGEIFS function implementation (ODF 1.3 §6.18.4).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { createCriteriaPredicate } from "../helpers";

export const averageIfsFunction: FormulaFunctionEagerDefinition = {
  name: "AVERAGEIFS",
  category: "statistical",
  description: {
    en: "Returns the mean of values that satisfy multiple criteria across ranges.",
    ja: "複数の範囲と条件を満たす値の平均を計算します。",
  },
  examples: ['AVERAGEIFS(C1:C10, A1:A10, "East", B1:B10, ">=2024")', "AVERAGEIFS(A1:A5, B1:B5, 1)"],
  samples: [
    {
      input: 'AVERAGEIFS({10, 20, 30}, {1, 2, 3}, ">1", {5, 10, 15}, ">=10")',
      output: 25,
      description: {
        en: "Average with multiple criteria",
        ja: "複数条件での平均",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length < 3 || (args.length - 1) % 2 !== 0) {
      throw new Error("AVERAGEIFS expects average_range followed by range/criteria pairs");
    }

    const averageRange = helpers.flattenResult(args[0]);
    const pairCount = (args.length - 1) / 2;

    const criteriaPairs = Array.from({ length: pairCount }, (_, pairIndex) => {
      const rangeArg = args[pairIndex * 2 + 1];
      const criteriaArg = args[pairIndex * 2 + 2];
      const rangeValues = helpers.flattenResult(rangeArg);
      if (rangeValues.length !== averageRange.length) {
        throw new Error(`AVERAGEIFS criteria range ${pairIndex + 1} must match average_range size`);
      }
      const criteria = helpers.coerceScalar(criteriaArg, `AVERAGEIFS criteria ${pairIndex + 1}`);
      const predicate = createCriteriaPredicate(
        criteria,
        helpers.comparePrimitiveEquality,
        `AVERAGEIFS criteria ${pairIndex + 1}`,
      );
      return {
        rangeValues,
        predicate,
      };
    });

    const aggregate = averageRange.reduce<{
      sum: number;
      count: number;
    }>(
      (state, candidate, index) => {
        if (!criteriaPairs.every(({ rangeValues, predicate }) => predicate(rangeValues[index]))) {
          return state;
        }
        if (typeof candidate !== "number") {
          return state;
        }
        return {
          sum: state.sum + candidate,
          count: state.count + 1,
        };
      },
      {
        sum: 0,
        count: 0,
      },
    );

    if (aggregate.count === 0) {
      throw new Error("AVERAGEIFS found no numeric values matching criteria");
    }

    return aggregate.sum / aggregate.count;
  },
};

// NOTE: Reused COUNTIFS range validation rules from src/modules/formula/functions/statistical/countifs.ts.
