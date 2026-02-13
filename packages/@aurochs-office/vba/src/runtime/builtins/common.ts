/**
 * @file Common utilities for VBA built-in functions
 */

import type { VbaRuntimeValue } from "../../host/api";
import { VbaRuntimeError, isDate, oleAutomationToDate } from "../value";

// =============================================================================
// Argument Validation
// =============================================================================

type ArgCount = {
  readonly min: number;
  readonly max: number;
};

/**
 * Create argument count requirement.
 */
export function args(exact: number): ArgCount;
export function args(min: number, max: number): ArgCount;
export function args(minOrExact: number, max?: number): ArgCount {
  if (max === undefined) {
    return { min: minOrExact, max: minOrExact };
  }
  return { min: minOrExact, max };
}

/**
 * Validate argument count for a function.
 */
export function checkArgs(name: string, actual: readonly VbaRuntimeValue[], expected: ArgCount): void {
  const count = actual.length;
  if (count < expected.min) {
    throw new VbaRuntimeError(
      `${name}: expected at least ${expected.min} argument(s), got ${count}`,
      "invalidProcedureCall"
    );
  }
  if (count > expected.max) {
    throw new VbaRuntimeError(
      `${name}: expected at most ${expected.max} argument(s), got ${count}`,
      "invalidProcedureCall"
    );
  }
}

// =============================================================================
// Type Conversion Helpers
// =============================================================================

/**
 * Convert VBA runtime value to Date.
 */
export function toDate(value: VbaRuntimeValue): Date {
  if (isDate(value)) {
    return value;
  }
  if (typeof value === "number") {
    return oleAutomationToDate(value);
  }
  if (typeof value === "string") {
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      throw new VbaRuntimeError("Type mismatch: cannot convert to Date", "typeMismatch");
    }
    return d;
  }
  throw new VbaRuntimeError("Type mismatch: cannot convert to Date", "typeMismatch");
}
