/**
 * @file AGGREGATE function implementation (ODF 1.3 §6.10.1).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import type { FormulaEvaluationResult } from "../../types";
import { aggregateValues, isSupportedAggregationFunction } from "./aggregationHelpers";

const collectValues = (args: FormulaEvaluationResult[][]): FormulaEvaluationResult[] => {
  return args.flat();
};

const SUPPORTED_OPTION_VALUES = new Set([0, 6]);

export const aggregateFunction: FormulaFunctionEagerDefinition = {
  name: "AGGREGATE",
  category: "aggregate",
  description: {
    en: "Performs a selected aggregation with options for skipping hidden or error cells.",
    ja: "非表示セルやエラーを除外するオプション付きで集計を実行します。",
  },
  examples: ["AGGREGATE(9, 0, A1:A10)", "AGGREGATE(1, 6, A1:A5, B1:B5)"],
  samples: [
    {
      input: "AGGREGATE(9, 0, 5, 10, 15)",
      output: 30,
      description: {
        en: "Sum (function 9) with default options",
        ja: "デフォルトオプションで合計（関数9）",
      },
    },
    {
      input: "AGGREGATE(1, 6, 2, 4, 6, 8)",
      output: 5,
      description: {
        en: "Average (function 1) ignoring errors",
        ja: "エラーを無視して平均（関数1）",
      },
    },
    {
      input: "AGGREGATE(4, 0, 12, 45, 23, 67)",
      output: 67,
      description: {
        en: "Maximum (function 4) of values",
        ja: "値の最大（関数4）",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length < 3) {
      throw new Error("AGGREGATE expects a function number, options, and at least one range");
    }

    const [functionNumberArg, optionsArg, ...rangeArgs] = args;
    const fnNumberValue = helpers.requireNumber(functionNumberArg, "AGGREGATE function number");
    const fnNumber = helpers.requireInteger(fnNumberValue, "AGGREGATE function number must be an integer");

    if (!isSupportedAggregationFunction(fnNumber)) {
      throw new Error("AGGREGATE function number is not supported");
    }

    const optionsValue = helpers.requireNumber(optionsArg, "AGGREGATE options");
    const options = helpers.requireInteger(optionsValue, "AGGREGATE options must be an integer");
    if (!SUPPORTED_OPTION_VALUES.has(options)) {
      throw new Error("AGGREGATE options value is not supported");
    }

    if (rangeArgs.length === 0) {
      throw new Error("AGGREGATE expects at least one range argument");
    }

    const rangeValues = rangeArgs.map((rangeArg) => helpers.flattenResult(rangeArg));
    const collected = collectValues(rangeValues);

    const ignoreErrors = options === 6;
    // NOTE: ODF 1.3 §6.10.1 defines option value 6 as "ignore error values"; other behaviours (hidden rows, nested subtotals)
    // are handled upstream in the engine, so we only toggle error filtering here.
    return aggregateValues(fnNumber, collected, { ignoreErrors });
  },
};
