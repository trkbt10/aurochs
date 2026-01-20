/**
 * @file Normalizes formula arguments into a flat list of primitive values.
 */

import type { FormulaEvaluationResult } from "../../types";
import type { EvalResult } from "./types";
import { flattenResult } from "./flattenResult";

export const flattenArguments = (args: EvalResult[]): FormulaEvaluationResult[] => {
  return args.flatMap((arg) => flattenResult(arg));
};
