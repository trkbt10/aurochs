/**
 * @file Shared aggregation helpers for SUBTOTAL and AGGREGATE functions (ODF 1.3 §6.10).
 */

import type { FormulaEvaluationResult } from "../../types";
import { summarizeNumbers } from "../helpers";

type AggregationKey = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

type AggregationOptions = {
  ignoreErrors: boolean;
};

const getNumericValues = (values: FormulaEvaluationResult[]): number[] => {
  return values.filter((value): value is number => typeof value === "number");
};

const NUMERIC_AGGREGATIONS: ReadonlySet<AggregationKey> = new Set([1, 4, 5, 6, 7, 8, 9, 10, 11]);

const sanitizeValues = (
  functionNumber: AggregationKey,
  values: FormulaEvaluationResult[],
  options: AggregationOptions,
): FormulaEvaluationResult[] => {
  if (!NUMERIC_AGGREGATIONS.has(functionNumber)) {
    return values;
  }

  if (options.ignoreErrors) {
    return values.filter((value) => value === null || typeof value === "number");
  }

  const invalid = values.find((value) => value !== null && typeof value !== "number");
  if (invalid !== undefined) {
    throw new Error("AGGREGATE encountered a non-numeric value that cannot be ignored");
  }
  return values;
};

const computeAverage = (values: FormulaEvaluationResult[]): number => {
  const numbers = getNumericValues(values);
  if (numbers.length === 0) {
    throw new Error("SUBTOTAL AVERAGE expects at least one numeric value");
  }
  const { sum } = summarizeNumbers(numbers);
  return sum / numbers.length;
};

const computeCount = (values: FormulaEvaluationResult[]): number => {
  return getNumericValues(values).length;
};

const computeCountA = (values: FormulaEvaluationResult[]): number => {
  return values.filter((value) => value !== null).length;
};

const computeMax = (values: FormulaEvaluationResult[]): number => {
  const numbers = getNumericValues(values);
  if (numbers.length === 0) {
    throw new Error("SUBTOTAL MAX expects at least one numeric value");
  }
  return Math.max(...numbers);
};

const computeMin = (values: FormulaEvaluationResult[]): number => {
  const numbers = getNumericValues(values);
  if (numbers.length === 0) {
    throw new Error("SUBTOTAL MIN expects at least one numeric value");
  }
  return Math.min(...numbers);
};

const computeProduct = (values: FormulaEvaluationResult[]): number => {
  const numbers = getNumericValues(values);
  return numbers.reduce((product, value) => product * value, 1);
};

const computeSum = (values: FormulaEvaluationResult[]): number => {
  const numbers = getNumericValues(values);
  return numbers.reduce((total, value) => total + value, 0);
};

const computeSampleVariance = (values: FormulaEvaluationResult[]): number => {
  const numbers = getNumericValues(values);
  if (numbers.length < 2) {
    throw new Error("SUBTOTAL VAR expects at least two numeric values");
  }
  const { count, sum, sumOfSquares } = summarizeNumbers(numbers);
  const varianceNumerator = sumOfSquares - (sum * sum) / count;
  const variance = varianceNumerator / (count - 1);
  return variance < 0 ? 0 : variance;
};

const computePopulationVariance = (values: FormulaEvaluationResult[]): number => {
  const numbers = getNumericValues(values);
  if (numbers.length === 0) {
    throw new Error("SUBTOTAL VARP expects at least one numeric value");
  }
  const { count, sum, sumOfSquares } = summarizeNumbers(numbers);
  const varianceNumerator = sumOfSquares - (sum * sum) / count;
  const variance = varianceNumerator / count;
  return variance < 0 ? 0 : variance;
};

const aggregationMap: Record<AggregationKey, (values: FormulaEvaluationResult[]) => number> = {
  1: computeAverage,
  2: computeCount,
  3: computeCountA,
  4: computeMax,
  5: computeMin,
  6: computeProduct,
  7: (values) => Math.sqrt(computeSampleVariance(values)),
  8: (values) => Math.sqrt(computePopulationVariance(values)),
  9: computeSum,
  10: computeSampleVariance,
  11: computePopulationVariance,
};

export const isSupportedAggregationFunction = (functionNumber: number): functionNumber is AggregationKey => {
  return functionNumber in aggregationMap;
};

export const aggregateValues = (
  functionNumber: AggregationKey,
  values: FormulaEvaluationResult[],
  options: AggregationOptions,
): number => {
  const sanitized = sanitizeValues(functionNumber, values, options);
  return aggregationMap[functionNumber](sanitized);
};
