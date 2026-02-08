/**
 * @file Boolean coercion helper that treats null as false.
 */

import type { FormulaEvaluationResult } from "../../types";
import type { EvalResult } from "./types";
import { coerceScalar } from "./coerceScalar";

const toBoolean = (value: FormulaEvaluationResult, description: string): boolean => {
  if (value === null) {
    return false;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${description} expects finite numeric arguments`);
    }
    return value !== 0;
  }
  throw new Error(`${description} expects logical arguments`);
};

export const coerceLogical = (result: EvalResult, description: string): boolean => {
  const scalar = coerceScalar(result, description);
  // NOTE: ODF 1.3 §6.11 mandates zero/non-zero coercion for numeric logical arguments.
  return toBoolean(scalar, description);
};
