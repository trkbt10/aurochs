/**
 * @file Formula scalar types
 *
 * Minimal scalar/value types used by the formula evaluator and display formatting.
 */

import type { ErrorValue } from "../domain/cell/types";

export type FormulaPrimitiveValue = string | number | boolean | null;

/**
 * Primitive evaluation result for function implementations.
 *
 * Note: errors are represented via thrown exceptions in the function helper layer.
 */
export type FormulaEvaluationResult = FormulaPrimitiveValue;

export type FormulaError = {
  readonly type: "error";
  readonly value: ErrorValue;
};

export type FormulaScalar = FormulaPrimitiveValue | FormulaError;

/**
 * Type guard for `FormulaError`.
 */
export function isFormulaError(value: FormulaScalar): value is FormulaError {
  return typeof value === "object" && value !== null && "type" in value && value.type === "error";
}

/**
 * Convert a formula scalar to a displayable string (Excel-like TRUE/FALSE, empty as "").
 */
export function toDisplayText(value: FormulaScalar): string {
  if (value === null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  return value.value;
}
