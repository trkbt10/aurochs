/**
 * @file VBA Runtime Value utilities
 *
 * Type coercion, comparison, and arithmetic operations for VBA runtime values.
 *
 * @see MS-VBAL (VBA Language Specification)
 */

import type { VbaRuntimeValue, HostObject } from "../host/api";

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if value is Nothing (null).
 */
export function isNothing(value: VbaRuntimeValue): value is null {
  return value === null;
}

/**
 * Check if value is Empty (undefined).
 */
export function isEmpty(value: VbaRuntimeValue): value is undefined {
  return value === undefined;
}

/**
 * Check if value is a HostObject.
 */
export function isHostObject(value: VbaRuntimeValue): value is HostObject {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "hostType" in value
  );
}

/**
 * Check if value is an array.
 */
export function isArray(value: VbaRuntimeValue): value is VbaRuntimeValue[] {
  return Array.isArray(value);
}

/**
 * Check if value is a Date.
 */
export function isDate(value: VbaRuntimeValue): value is Date {
  return value instanceof Date;
}

// =============================================================================
// Type Coercion
// =============================================================================

/**
 * Coerce value to Boolean.
 *
 * VBA rules:
 * - 0 → False, non-zero → True
 * - "" → False (type mismatch in strict VBA, but we coerce)
 * - Empty → False
 * - Nothing → runtime error (we return false)
 */
export function toBoolean(value: VbaRuntimeValue): boolean {
  if (value === undefined) {return false;} // Empty
  if (value === null) {return false;} // Nothing
  if (typeof value === "boolean") {return value;}
  if (typeof value === "number") {return value !== 0;}
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower === "true") {return true;}
    if (lower === "false") {return false;}
    // Try numeric conversion
    const num = parseFloat(value);
    if (!isNaN(num)) {return num !== 0;}
    return value.length > 0;
  }
  if (value instanceof Date) {return true;}
  if (isHostObject(value)) {return true;}
  if (Array.isArray(value)) {return true;}
  return false;
}

/**
 * Coerce value to Number (Double).
 *
 * VBA rules:
 * - Boolean: True → -1, False → 0
 * - String: parsed as number, error if invalid
 * - Date: OLE Automation date (days since 1899-12-30)
 * - Empty → 0
 * - Nothing → runtime error (we return NaN)
 */
export function toNumber(value: VbaRuntimeValue): number {
  if (value === undefined) {return 0;} // Empty
  if (value === null) {return NaN;} // Nothing - type mismatch
  if (typeof value === "number") {return value;}
  if (typeof value === "boolean") {return value ? -1 : 0;}
  if (typeof value === "string") {
    if (value === "") {return 0;}
    const num = parseFloat(value);
    return num;
  }
  if (value instanceof Date) {
    return dateToOleAutomation(value);
  }
  return NaN;
}

/**
 * Coerce value to String.
 *
 * VBA rules:
 * - Number: formatted as string
 * - Boolean: "True" or "False"
 * - Date: formatted as string
 * - Empty → ""
 * - Nothing → runtime error (we return "")
 */
export function toString(value: VbaRuntimeValue): string {
  if (value === undefined) {return "";} // Empty
  if (value === null) {return "";} // Nothing
  if (typeof value === "string") {return value;}
  if (typeof value === "number") {return String(value);}
  if (typeof value === "boolean") {return value ? "True" : "False";}
  if (value instanceof Date) {return formatDate(value);}
  if (isHostObject(value)) {return `[object ${value.hostType}]`;}
  if (Array.isArray(value)) {return "[Array]";}
  return "";
}

/**
 * Coerce value to Integer (Int16, -32768 to 32767).
 */
export function toInteger(value: VbaRuntimeValue): number {
  const num = toNumber(value);
  if (isNaN(num)) {return 0;}
  const int = Math.trunc(num);
  // Clamp to Int16 range
  return Math.max(-32768, Math.min(32767, int));
}

/**
 * Coerce value to Long (Int32).
 */
export function toLong(value: VbaRuntimeValue): number {
  const num = toNumber(value);
  if (isNaN(num)) {return 0;}
  const int = Math.trunc(num);
  // Clamp to Int32 range
  return Math.max(-2147483648, Math.min(2147483647, int));
}

// =============================================================================
// Comparison
// =============================================================================

/**
 * Compare two values for equality.
 * Returns true if values are equal according to VBA rules.
 */
export function vbaEquals(left: VbaRuntimeValue, right: VbaRuntimeValue): boolean {
  // Nothing/Empty comparisons
  if (left === null && right === null) {return true;}
  if (left === undefined && right === undefined) {return true;}
  if (left === null || right === null) {return false;}

  // Same type comparisons
  if (typeof left === typeof right) {
    if (typeof left === "string") {
      // Case-insensitive string comparison (VBA default with Option Compare Text)
      // For Option Compare Binary, use exact comparison
      // Default to case-insensitive
      return left.toLowerCase() === (right as string).toLowerCase();
    }
    return left === right;
  }

  // Numeric comparisons (coerce both to numbers)
  const leftNum = toNumber(left);
  const rightNum = toNumber(right);
  if (!isNaN(leftNum) && !isNaN(rightNum)) {
    return leftNum === rightNum;
  }

  // String comparison fallback
  return toString(left) === toString(right);
}

/**
 * Compare two values.
 * Returns -1 if left < right, 0 if equal, 1 if left > right.
 */
export function vbaCompare(left: VbaRuntimeValue, right: VbaRuntimeValue): number {
  // Numeric comparison
  const leftNum = toNumber(left);
  const rightNum = toNumber(right);

  if (!isNaN(leftNum) && !isNaN(rightNum)) {
    if (leftNum < rightNum) {return -1;}
    if (leftNum > rightNum) {return 1;}
    return 0;
  }

  // String comparison
  const leftStr = toString(left);
  const rightStr = toString(right);

  // Case-insensitive comparison
  const cmp = leftStr.toLowerCase().localeCompare(rightStr.toLowerCase());
  if (cmp < 0) {return -1;}
  if (cmp > 0) {return 1;}
  return 0;
}

// =============================================================================
// Arithmetic
// =============================================================================

/**
 * VBA addition (+).
 * Numeric addition or string concatenation.
 */
export function vbaAdd(left: VbaRuntimeValue, right: VbaRuntimeValue): VbaRuntimeValue {
  // If both are strings, concatenate
  if (typeof left === "string" && typeof right === "string") {
    return left + right;
  }
  // Otherwise, numeric addition
  return toNumber(left) + toNumber(right);
}

/**
 * VBA subtraction (-).
 */
export function vbaSubtract(left: VbaRuntimeValue, right: VbaRuntimeValue): number {
  return toNumber(left) - toNumber(right);
}

/**
 * VBA multiplication (*).
 */
export function vbaMultiply(left: VbaRuntimeValue, right: VbaRuntimeValue): number {
  return toNumber(left) * toNumber(right);
}

/**
 * VBA division (/).
 */
export function vbaDivide(left: VbaRuntimeValue, right: VbaRuntimeValue): number {
  const divisor = toNumber(right);
  if (divisor === 0) {
    throw new VbaRuntimeError("Division by zero", "overflow");
  }
  return toNumber(left) / divisor;
}

/**
 * VBA integer division (\).
 */
export function vbaIntDivide(left: VbaRuntimeValue, right: VbaRuntimeValue): number {
  const divisor = toLong(right);
  if (divisor === 0) {
    throw new VbaRuntimeError("Division by zero", "overflow");
  }
  return Math.trunc(toLong(left) / divisor);
}

/**
 * VBA modulo (Mod).
 */
export function vbaMod(left: VbaRuntimeValue, right: VbaRuntimeValue): number {
  const divisor = toLong(right);
  if (divisor === 0) {
    throw new VbaRuntimeError("Division by zero", "overflow");
  }
  return toLong(left) % divisor;
}

/**
 * VBA exponentiation (^).
 */
export function vbaPower(left: VbaRuntimeValue, right: VbaRuntimeValue): number {
  return Math.pow(toNumber(left), toNumber(right));
}

/**
 * VBA negation (-).
 */
export function vbaNegate(value: VbaRuntimeValue): number {
  return -toNumber(value);
}

/**
 * VBA string concatenation (&).
 */
export function vbaConcat(left: VbaRuntimeValue, right: VbaRuntimeValue): string {
  return toString(left) + toString(right);
}

// =============================================================================
// Logical Operations
// =============================================================================

/**
 * VBA logical And.
 * Performs bitwise And on integers, boolean And on booleans.
 */
export function vbaAnd(left: VbaRuntimeValue, right: VbaRuntimeValue): VbaRuntimeValue {
  // If both are numeric, perform bitwise And
  if (typeof left === "number" || typeof right === "number") {
    return toLong(left) & toLong(right);
  }
  // Boolean And
  return toBoolean(left) && toBoolean(right);
}

/**
 * VBA logical Or.
 */
export function vbaOr(left: VbaRuntimeValue, right: VbaRuntimeValue): VbaRuntimeValue {
  if (typeof left === "number" || typeof right === "number") {
    return toLong(left) | toLong(right);
  }
  return toBoolean(left) || toBoolean(right);
}

/**
 * VBA logical Xor.
 */
export function vbaXor(left: VbaRuntimeValue, right: VbaRuntimeValue): VbaRuntimeValue {
  if (typeof left === "number" || typeof right === "number") {
    return toLong(left) ^ toLong(right);
  }
  return toBoolean(left) !== toBoolean(right);
}

/**
 * VBA logical Not.
 */
export function vbaNot(value: VbaRuntimeValue): VbaRuntimeValue {
  if (typeof value === "number") {
    return ~toLong(value);
  }
  return !toBoolean(value);
}

/**
 * VBA logical Eqv (equivalence).
 */
export function vbaEqv(left: VbaRuntimeValue, right: VbaRuntimeValue): number {
  // Eqv is bitwise: ~(left Xor right)
  return ~(toLong(left) ^ toLong(right));
}

/**
 * VBA logical Imp (implication).
 */
export function vbaImp(left: VbaRuntimeValue, right: VbaRuntimeValue): number {
  // Imp is bitwise: (Not left) Or right
  return ~toLong(left) | toLong(right);
}

// =============================================================================
// Date Utilities
// =============================================================================

/**
 * Convert JavaScript Date to OLE Automation date.
 * OLE dates are days since 1899-12-30, with fractional days for time.
 */
export function dateToOleAutomation(date: Date): number {
  // JavaScript epoch: 1970-01-01
  // OLE epoch: 1899-12-30
  // Difference: 25569 days
  const msPerDay = 86400000;
  return date.getTime() / msPerDay + 25569;
}

/**
 * Convert OLE Automation date to JavaScript Date.
 */
export function oleAutomationToDate(oleDate: number): Date {
  const msPerDay = 86400000;
  return new Date((oleDate - 25569) * msPerDay);
}

/**
 * Format date as VBA string.
 */
function formatDate(date: Date): string {
  // Simple ISO-like format for now
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

// =============================================================================
// Runtime Error
// =============================================================================

/**
 * VBA runtime error types.
 */
export type VbaErrorType =
  | "typeMismatch"
  | "overflow"
  | "divisionByZero"
  | "subscriptOutOfRange"
  | "objectRequired"
  | "invalidProcedureCall"
  | "notImplemented"
  | "generic";

/**
 * VBA Runtime Error.
 */
export class VbaRuntimeError extends Error {
  readonly errorType: VbaErrorType;
  readonly errorNumber: number;

  constructor(message: string, errorType: VbaErrorType = "generic", errorNumber?: number) {
    super(message);
    this.name = "VbaRuntimeError";
    this.errorType = errorType;
    this.errorNumber = errorNumber ?? getDefaultErrorNumber(errorType);
  }
}

/**
 * Get default VBA error number for error type.
 */
function getDefaultErrorNumber(errorType: VbaErrorType): number {
  switch (errorType) {
    case "typeMismatch":
      return 13;
    case "overflow":
      return 6;
    case "divisionByZero":
      return 11;
    case "subscriptOutOfRange":
      return 9;
    case "objectRequired":
      return 424;
    case "invalidProcedureCall":
      return 5;
    case "notImplemented":
      return 445;
    case "generic":
    default:
      return 0;
  }
}
