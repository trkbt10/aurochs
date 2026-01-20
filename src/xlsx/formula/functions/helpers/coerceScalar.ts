/**
 * @file Scalar coercion helper for formula function arguments.
 */

import type { FormulaEvaluationResult } from "../../types";
import type { EvalResult } from "./types";
import { flattenResult } from "./flattenResult";

export const coerceScalar = (result: EvalResult, description: string): FormulaEvaluationResult => {
  const flattened = flattenResult(result);
  if (flattened.length === 0) {
    return null;
  }
  if (flattened.length === 1) {
    return flattened[0] ?? null;
  }
  throw new Error(`Range cannot be coerced to scalar for ${description}`);
};
