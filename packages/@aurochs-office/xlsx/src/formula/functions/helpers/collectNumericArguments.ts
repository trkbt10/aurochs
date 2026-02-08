/**
 * @file Collects numeric argument values from formula evaluations.
 */

import type { EvalResult, FormulaFunctionHelpers } from "./types";

export const collectNumericArguments = (args: EvalResult[], helpers: FormulaFunctionHelpers): number[] => {
  return helpers.flattenArguments(args).filter((value): value is number => typeof value === "number");
};
