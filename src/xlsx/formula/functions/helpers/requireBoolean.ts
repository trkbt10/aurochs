/**
 * @file Boolean coercion helper for formula function arguments.
 */

import type { EvalResult } from "./types";
import { coerceScalar } from "./coerceScalar";

export const requireBoolean = (result: EvalResult, description: string): boolean => {
  const scalar = coerceScalar(result, description);
  if (typeof scalar !== "boolean") {
    throw new Error(`Expected boolean for ${description}`);
  }
  return scalar;
};
