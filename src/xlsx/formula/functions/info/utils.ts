/**
 * @file Shared utilities for information functions.
 */

import type { FormulaEvaluationResult } from "../../types";
import type { EvalResult, FormulaFunctionHelpers } from "../helpers";

export const extractSingleValue = (
  value: EvalResult,
  helpers: FormulaFunctionHelpers,
  description: string,
): FormulaEvaluationResult => {
  if (!Array.isArray(value)) {
    return value;
  }
  const flattened = helpers.flattenResult(value);
  if (flattened.length !== 1) {
    throw new Error(`${description} expects a single value`);
  }
  return flattened[0] ?? null;
};
