/**
 * @file FREQUENCY function implementation (ODF 1.3 §6.17.8).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import type { FormulaEvaluationResult } from "../../types";

const collectNumericValues = (values: FormulaEvaluationResult[]): number[] => {
  return values.reduce<number[]>((collected, value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      collected.push(value);
    }
    return collected;
  }, []);
};

const validateAscendingBins = (bins: number[], description: string): void => {
  bins.forEach((bin, index) => {
    if (index > 0 && bin < bins[index - 1]) {
      throw new Error(`${description} bins must be sorted in ascending order`);
    }
  });
};

const computeFrequencyCounts = (data: number[], bins: number[]): number[] => {
  const sortedData = [...data].sort((left, right) => left - right);
  const binCounts = bins.map((bin, index) => {
    const lowerBound = index === 0 ? Number.NEGATIVE_INFINITY : bins[index - 1];
    return sortedData.filter((value) => value > lowerBound && value <= bin).length;
  });
  const beyondUpperBound = sortedData.filter((value) => value > bins[bins.length - 1]).length;
  return [...binCounts, beyondUpperBound];
};

export const frequencyFunction: FormulaFunctionEagerDefinition = {
  name: "FREQUENCY",
  category: "matrix",
  description: {
    en: "Returns a frequency distribution as a vertical array.",
    ja: "度数分布を縦方向の配列として返します。",
  },
  examples: ["FREQUENCY(A1:A10, B1:B3)"],
  samples: [
    {
      input: "FREQUENCY({1, 2, 3, 4, 5, 6}, {2, 4})",
      output: [[2], [2], [2]],
      description: {
        en: "Count values <=2, 2<x<=4, >4 (returns 2, 2, 2)",
        ja: "値を<=2、2<x<=4、>4でカウント（2、2、2を返す）",
      },
    },
    {
      input: "FREQUENCY({10, 20, 30, 40}, {15, 25, 35})",
      output: [[1], [1], [1], [1]],
      description: {
        en: "Count data in bins <=15, 15<x<=25, 25<x<=35, >35",
        ja: "<=15、15<x<=25、25<x<=35、>35の範囲でデータをカウント",
      },
    },
    {
      input: "FREQUENCY({5, 5, 5, 15, 25, 25}, {10, 20})",
      output: [[3], [1], [2]],
      description: {
        en: "Count values <=10 (3), 10<x<=20 (1), >20 (2)",
        ja: "<=10 (3)、10<x<=20 (1)、>20 (2)の値をカウント",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 2) {
      throw new Error("FREQUENCY expects exactly two arguments");
    }

    const dataValues = collectNumericValues(helpers.flattenResult(args[0]));
    const binValues = helpers.flattenResult(args[1]).map((value, index) => {
      if (typeof value !== "number" || Number.isNaN(value)) {
        throw new Error(`FREQUENCY bins must be numeric (index ${index + 1})`);
      }
      return value;
    });

    if (binValues.length === 0) {
      throw new Error("FREQUENCY bins array cannot be empty");
    }

    validateAscendingBins(binValues, "FREQUENCY");
    const counts = computeFrequencyCounts(dataValues, binValues);

    return counts.map((count) => [count]);
  },
};
