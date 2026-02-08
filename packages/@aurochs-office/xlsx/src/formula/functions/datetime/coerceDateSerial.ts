/**
 * @file Utility to normalise date inputs for date/time functions.
 */

import type { FormulaFunctionHelpers, EvalResult } from "../helpers";
import { parseDateText } from "./parseDateText";

export const coerceDateSerial = (value: EvalResult, helpers: FormulaFunctionHelpers, description: string): number => {
  if (Array.isArray(value)) {
    const scalar = helpers.coerceScalar(value, description);
    return coerceDateSerial(scalar, helpers, description);
  }

  if (typeof value === "number") {
    return Math.floor(value);
  }
  if (typeof value === "string") {
    return parseDateText(value, description);
  }
  throw new Error(`${description} expects a date serial or text`);
};
