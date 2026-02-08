/**
 * @file Text coercion helpers for formula functions.
 */

import type { FormulaEvaluationResult } from "../../types";
import type { EvalResult } from "./types";
import { coerceScalar } from "./coerceScalar";

export const valueToText = (value: FormulaEvaluationResult): string => {
  if (value === null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? `${value}` : String(value);
  }
  throw new Error("Unsupported value for text conversion");
};

export const coerceText = (result: EvalResult, description: string): string => {
  const scalar = coerceScalar(result, description);
  return valueToText(scalar);
};
