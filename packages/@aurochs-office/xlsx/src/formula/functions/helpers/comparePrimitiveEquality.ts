/**
 * @file Primitive comparison helper with null and NaN handling.
 */

import type { FormulaEvaluationResult } from "../../types";

export const comparePrimitiveEquality = (left: FormulaEvaluationResult, right: FormulaEvaluationResult): boolean => {
  if (left === null || right === null) {
    return left === right;
  }
  if (typeof left !== typeof right) {
    return false;
  }
  if (typeof left === "number") {
    if (Number.isNaN(left) || Number.isNaN(right as number)) {
      return false;
    }
    return Object.is(left, right);
  }
  return left === right;
};
