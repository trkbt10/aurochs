/**
 * @file Number coercion helper for formula function arguments.
 */

import type { EvalResult } from "./types";
import { coerceScalar } from "./coerceScalar";

export const requireNumber = (result: EvalResult, description: string): number => {
  const scalar = coerceScalar(result, description);
  if (typeof scalar !== "number" || Number.isNaN(scalar)) {
    throw new Error(`Expected number for ${description}`);
  }
  return scalar;
};
