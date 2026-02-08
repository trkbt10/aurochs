/**
 * @file DSTDEV/DSTDEVP/DVAR/DVARP implementations (ODF 1.3 §6.7.4, §6.7.5, §6.7.10, §6.7.11).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import {
  collectNumericFieldValues,
  filterDatabaseRows,
  parseDatabaseArgument,
  resolveFieldIndex,
} from "./common";

type EvaluateArgs = Parameters<FormulaFunctionEagerDefinition["evaluate"]>[0];
type EvaluateHelpers = Parameters<FormulaFunctionEagerDefinition["evaluate"]>[1];

const prepareNumericSummary = (args: EvaluateArgs, helpers: EvaluateHelpers, functionName: string) => {
  if (args.length !== 3) {
    throw new Error(`${functionName} expects exactly three arguments`);
  }

  const [databaseArg, fieldArg, criteriaArg] = args;
  const database = parseDatabaseArgument(databaseArg, functionName);
  const fieldValue = helpers.coerceScalar(fieldArg, `${functionName} field`);
  const fieldIndex = resolveFieldIndex(fieldValue, database, functionName);
  const matchingRows = filterDatabaseRows({ database, criteriaArg, helpers, functionName });
  const numericValues = collectNumericFieldValues(matchingRows, fieldIndex);
  const summary = helpers.summarizeNumbers(numericValues);
  return {
    numericValues,
    summary,
  };
};

const computeVarianceComponents = (sum: number, sumOfSquares: number, count: number) => {
  if (count === 0) {
    return {
      sampleVariance: 0,
      populationVariance: 0,
    };
  }
  const meanSquare = (sum * sum) / count;
  const squaredDifferenceSum = Math.max(sumOfSquares - meanSquare, 0);
  const populationVariance = squaredDifferenceSum / count;
  const sampleVariance = count > 1 ? squaredDifferenceSum / (count - 1) : 0;
  return {
    sampleVariance,
    populationVariance,
  };
};

export const dStdevFunction: FormulaFunctionEagerDefinition = {
  name: "DSTDEV",
  category: "database",
  description: {
    en: "Returns the sample standard deviation of numeric entries matching the criteria.",
    ja: "条件を満たす数値の標本標準偏差を返します。",
  },
  examples: ['DSTDEV(A1:C10, "Sales", E1:F2)'],
  samples: [
    {
      input: 'DSTDEV({{"Name", "Score"}; {"Alice", 80}; {"Bob", 90}; {"Carol", 100}}, "Score", {{"Score"}; {">=80"}})',
      output: 10,
      description: {
        en: "Sample standard deviation of scores >= 80 (80, 90, 100)",
        ja: "80以上のスコアの標本標準偏差（80、90、100）",
      },
    },
    {
      input: 'DSTDEV({{"Product", "Value"}; {"A", 10}; {"B", 20}; {"C", 30}}, "Value", {{"Value"}; {">10"}})',
      output: 7.071,
      description: {
        en: "Sample standard deviation where Value > 10 (20, 30)",
        ja: "値が10より大きい標本標準偏差（20、30）",
      },
    },
    {
      input: 'DSTDEV({{"Item", "Measure"}; {"X", 5}; {"Y", 10}; {"Z", 15}}, "Measure", {{"Measure"}; {">=5"}})',
      output: 5,
      description: {
        en: "Sample standard deviation of all measures >= 5",
        ja: "5以上のすべての測定値の標本標準偏差",
      },
    },
  ],
  evaluate: (args, helpers) => {
    const { numericValues, summary } = prepareNumericSummary(args, helpers, "DSTDEV");
    if (numericValues.length < 2) {
      throw new Error("DSTDEV requires at least two numeric values matching criteria");
    }
    const { sampleVariance } = computeVarianceComponents(summary.sum, summary.sumOfSquares, summary.count);
    return Math.sqrt(sampleVariance);
  },
};

export const dStdevpFunction: FormulaFunctionEagerDefinition = {
  name: "DSTDEVP",
  category: "database",
  description: {
    en: "Returns the population standard deviation of numeric entries matching the criteria.",
    ja: "条件を満たす数値の母集団標準偏差を返します。",
  },
  examples: ['DSTDEVP(A1:C10, "Sales", E1:F2)'],
  samples: [
    {
      input: 'DSTDEVP({{"Name", "Score"}; {"Alice", 80}; {"Bob", 90}; {"Carol", 100}}, "Score", {{"Score"}; {">=80"}})',
      output: 8.165,
      description: {
        en: "Population standard deviation of scores >= 80 (80, 90, 100)",
        ja: "80以上のスコアの母集団標準偏差（80、90、100）",
      },
    },
    {
      input: 'DSTDEVP({{"Product", "Value"}; {"A", 10}; {"B", 20}; {"C", 30}}, "Value", {{"Value"}; {">10"}})',
      output: 5,
      description: {
        en: "Population standard deviation where Value > 10 (20, 30)",
        ja: "値が10より大きい母集団標準偏差（20、30）",
      },
    },
    {
      input: 'DSTDEVP({{"Item", "Measure"}; {"X", 2}; {"Y", 4}; {"Z", 6}}, "Measure", {{"Measure"}; {">=2"}})',
      output: 1.633,
      description: {
        en: "Population standard deviation of all measures >= 2",
        ja: "2以上のすべての測定値の母集団標準偏差",
      },
    },
  ],
  evaluate: (args, helpers) => {
    const { numericValues, summary } = prepareNumericSummary(args, helpers, "DSTDEVP");
    if (numericValues.length === 0) {
      throw new Error("DSTDEVP requires at least one numeric value matching criteria");
    }
    const { populationVariance } = computeVarianceComponents(summary.sum, summary.sumOfSquares, summary.count);
    return Math.sqrt(populationVariance);
  },
};

export const dVarFunction: FormulaFunctionEagerDefinition = {
  name: "DVAR",
  category: "database",
  description: {
    en: "Returns the sample variance of numeric entries matching the criteria.",
    ja: "条件を満たす数値の標本分散を返します。",
  },
  examples: ['DVAR(A1:C10, "Sales", E1:F2)'],
  samples: [
    {
      input: 'DVAR({{"Name", "Score"}; {"Alice", 80}; {"Bob", 90}; {"Carol", 100}}, "Score", {{"Score"}; {">=80"}})',
      output: 100,
      description: {
        en: "Sample variance of scores >= 80 (80, 90, 100)",
        ja: "80以上のスコアの標本分散（80、90、100）",
      },
    },
    {
      input: 'DVAR({{"Product", "Value"}; {"A", 10}; {"B", 20}; {"C", 30}}, "Value", {{"Value"}; {">10"}})',
      output: 50,
      description: {
        en: "Sample variance where Value > 10 (20, 30)",
        ja: "値が10より大きい標本分散（20、30）",
      },
    },
    {
      input: 'DVAR({{"Item", "Measure"}; {"X", 5}; {"Y", 10}; {"Z", 15}}, "Measure", {{"Measure"}; {">=5"}})',
      output: 25,
      description: {
        en: "Sample variance of all measures >= 5 (5, 10, 15)",
        ja: "5以上のすべての測定値の標本分散（5、10、15）",
      },
    },
  ],
  evaluate: (args, helpers) => {
    const { numericValues, summary } = prepareNumericSummary(args, helpers, "DVAR");
    if (numericValues.length < 2) {
      throw new Error("DVAR requires at least two numeric values matching criteria");
    }
    const { sampleVariance } = computeVarianceComponents(summary.sum, summary.sumOfSquares, summary.count);
    return sampleVariance;
  },
};

export const dVarpFunction: FormulaFunctionEagerDefinition = {
  name: "DVARP",
  category: "database",
  description: {
    en: "Returns the population variance of numeric entries matching the criteria.",
    ja: "条件を満たす数値の母集団分散を返します。",
  },
  examples: ['DVARP(A1:C10, "Sales", E1:F2)'],
  samples: [
    {
      input: 'DVARP({{"Name", "Score"}; {"Alice", 80}; {"Bob", 90}; {"Carol", 100}}, "Score", {{"Score"}; {">=80"}})',
      output: 66.667,
      description: {
        en: "Population variance of scores >= 80 (80, 90, 100)",
        ja: "80以上のスコアの母集団分散（80、90、100）",
      },
    },
    {
      input: 'DVARP({{"Product", "Value"}; {"A", 10}; {"B", 20}; {"C", 30}}, "Value", {{"Value"}; {">10"}})',
      output: 25,
      description: {
        en: "Population variance where Value > 10 (20, 30)",
        ja: "値が10より大きい母集団分散（20、30）",
      },
    },
    {
      input: 'DVARP({{"Item", "Measure"}; {"X", 2}; {"Y", 4}; {"Z", 6}}, "Measure", {{"Measure"}; {">=2"}})',
      output: 2.667,
      description: {
        en: "Population variance of all measures >= 2 (2, 4, 6)",
        ja: "2以上のすべての測定値の母集団分散（2、4、6）",
      },
    },
  ],
  evaluate: (args, helpers) => {
    const { numericValues, summary } = prepareNumericSummary(args, helpers, "DVARP");
    if (numericValues.length === 0) {
      throw new Error("DVARP requires at least one numeric value matching criteria");
    }
    const { populationVariance } = computeVarianceComponents(summary.sum, summary.sumOfSquares, summary.count);
    return populationVariance;
  },
};
