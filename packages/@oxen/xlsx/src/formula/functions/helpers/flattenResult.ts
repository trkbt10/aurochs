/**
 * @file Helper to flatten nested evaluation results into primitives.
 */

import type { FormulaEvaluationResult } from "../../types";
import type { EvalResult } from "./types";
import { isArrayResult } from "./isArrayResult";

export const flattenResult = (result: EvalResult): FormulaEvaluationResult[] => {
  if (!isArrayResult(result)) {
    return [result];
  }
  return result.flatMap((value) => flattenResult(value));
};
