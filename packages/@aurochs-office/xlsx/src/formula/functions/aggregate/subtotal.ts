/**
 * @file SUBTOTAL function implementation (ODF 1.3 §6.10.15).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import type { FormulaEvaluationResult } from "../../types";
import { aggregateValues, isSupportedAggregationFunction } from "./aggregationHelpers";

const collectValues = (args: FormulaEvaluationResult[][]): FormulaEvaluationResult[] => {
  return args.flat();
};

export const subtotalFunction: FormulaFunctionEagerDefinition = {
  name: "SUBTOTAL",
  category: "aggregate",
  description: {
    en: "Calculates a subtotal using a selected aggregation and one or more ranges.",
    ja: "指定した集計方法で1つ以上の範囲を集計した小計を返します。",
  },
  examples: ["SUBTOTAL(9, A1:A10)", "SUBTOTAL(1, A1:A5, B1:B5)"],
  samples: [
    {
      input: "SUBTOTAL(9, 10, 20, 30)",
      output: 60,
      description: {
        en: "Sum (function 9) of values",
        ja: "値の合計（関数9）",
      },
    },
    {
      input: "SUBTOTAL(1, 5, 10, 15)",
      output: 10,
      description: {
        en: "Average (function 1) of values",
        ja: "値の平均（関数1）",
      },
    },
    {
      input: "SUBTOTAL(4, 3, 7, 2, 8)",
      output: 8,
      description: {
        en: "Maximum (function 4) of values",
        ja: "値の最大（関数4）",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length < 2) {
      throw new Error("SUBTOTAL expects a function number and at least one range");
    }
    const [functionNumberArg, ...rangeArgs] = args;
    const functionNumberValue = helpers.requireNumber(functionNumberArg, "SUBTOTAL function number");
    const functionNumber = helpers.requireInteger(functionNumberValue, "SUBTOTAL function number must be an integer");

    // Excel supports function numbers 1-11 and 101-111 (ignore hidden rows).
    // We currently treat 101-111 as their base equivalents (subtract 100).
    const normalizedFunctionNumber = functionNumber >= 101 && functionNumber <= 111 ? functionNumber - 100 : functionNumber;

    if (!isSupportedAggregationFunction(normalizedFunctionNumber)) {
      throw new Error("SUBTOTAL function number is not supported");
    }

    const rangeValues = rangeArgs.map((rangeArg) => helpers.flattenResult(rangeArg));

    const collected = collectValues(rangeValues);
    // NOTE: SUBTOTAL ignores error cells by design (ODF 1.3 §6.10.15), so we always enable error filtering here.
    return aggregateValues(normalizedFunctionNumber, collected, { ignoreErrors: true });
  },
};
