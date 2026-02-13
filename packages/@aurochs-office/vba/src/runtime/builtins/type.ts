/**
 * @file VBA Type Conversion and Checking Functions
 */

import type { VbaRuntimeValue } from "../../host/api";
import {
  toNumber,
  toString,
  toBoolean,
  toInteger,
  toLong,
  VbaRuntimeError,
  isEmpty,
  isNothing,
  isArray,
  isDate,
  isHostObject,
  oleAutomationToDate,
} from "../value";
import type { VbaBuiltinFn } from "./index";
import { args, checkArgs } from "./common";

/**
 * Register type functions.
 */
export function registerTypeFunctions(register: (name: string, fn: VbaBuiltinFn) => void): void {
  // Conversion functions
  register("CBool", vbaCBool);
  register("CByte", vbaCByte);
  register("CInt", vbaCInt);
  register("CLng", vbaCLng);
  register("CSng", vbaCSng);
  register("CDbl", vbaCDbl);
  register("CStr", vbaCStr);
  register("CDate", vbaCDate);
  register("CVar", vbaCVar);

  // Type checking functions
  register("IsNull", vbaIsNull);
  register("IsEmpty", vbaIsEmpty);
  register("IsNothing", vbaIsNothing);
  register("IsArray", vbaIsArray);
  register("IsDate", vbaIsDate);
  register("IsNumeric", vbaIsNumeric);
  register("IsObject", vbaIsObject);
  register("TypeName", vbaTypeName);
  register("VarType", vbaVarType);
}

// =============================================================================
// Conversion Functions
// =============================================================================

function vbaCBool(a: readonly VbaRuntimeValue[]): boolean {
  checkArgs("CBool", a, args(1));
  return toBoolean(a[0]);
}

function vbaCByte(a: readonly VbaRuntimeValue[]): number {
  checkArgs("CByte", a, args(1));
  const n = toNumber(a[0]);
  if (n < 0 || n > 255) {
    throw new VbaRuntimeError("Overflow", "overflow");
  }
  return Math.round(n);
}

function vbaCInt(a: readonly VbaRuntimeValue[]): number {
  checkArgs("CInt", a, args(1));
  return toInteger(a[0]);
}

function vbaCLng(a: readonly VbaRuntimeValue[]): number {
  checkArgs("CLng", a, args(1));
  return toLong(a[0]);
}

function vbaCSng(a: readonly VbaRuntimeValue[]): number {
  checkArgs("CSng", a, args(1));
  return toNumber(a[0]);
}

function vbaCDbl(a: readonly VbaRuntimeValue[]): number {
  checkArgs("CDbl", a, args(1));
  return toNumber(a[0]);
}

function vbaCStr(a: readonly VbaRuntimeValue[]): string {
  checkArgs("CStr", a, args(1));
  return toString(a[0]);
}

function vbaCDate(a: readonly VbaRuntimeValue[]): Date {
  checkArgs("CDate", a, args(1));
  const value = a[0];
  if (isDate(value)) {return value;}
  if (typeof value === "number") {
    return oleAutomationToDate(value);
  }
  if (typeof value === "string") {
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      throw new VbaRuntimeError("Type mismatch", "typeMismatch");
    }
    return d;
  }
  throw new VbaRuntimeError("Type mismatch", "typeMismatch");
}

function vbaCVar(a: readonly VbaRuntimeValue[]): VbaRuntimeValue {
  checkArgs("CVar", a, args(1));
  return a[0];
}

// =============================================================================
// Type Checking Functions
// =============================================================================

function vbaIsNull(a: readonly VbaRuntimeValue[]): boolean {
  checkArgs("IsNull", a, args(1));
  // VBA Null is different from Nothing
  // We don't have a distinct Null type, so always return false
  return false;
}

function vbaIsEmpty(a: readonly VbaRuntimeValue[]): boolean {
  checkArgs("IsEmpty", a, args(1));
  return isEmpty(a[0]);
}

function vbaIsNothing(a: readonly VbaRuntimeValue[]): boolean {
  checkArgs("IsNothing", a, args(1));
  return isNothing(a[0]);
}

function vbaIsArray(a: readonly VbaRuntimeValue[]): boolean {
  checkArgs("IsArray", a, args(1));
  return isArray(a[0]);
}

function vbaIsDate(a: readonly VbaRuntimeValue[]): boolean {
  checkArgs("IsDate", a, args(1));
  if (isDate(a[0])) {return true;}
  if (typeof a[0] === "string") {
    const d = new Date(a[0]);
    return !isNaN(d.getTime());
  }
  return false;
}

function vbaIsNumeric(a: readonly VbaRuntimeValue[]): boolean {
  checkArgs("IsNumeric", a, args(1));
  if (typeof a[0] === "number") {return true;}
  if (typeof a[0] === "boolean") {return true;}
  if (typeof a[0] === "string") {
    return !isNaN(parseFloat(a[0]));
  }
  return false;
}

function vbaIsObject(a: readonly VbaRuntimeValue[]): boolean {
  checkArgs("IsObject", a, args(1));
  return isHostObject(a[0]);
}

function vbaTypeName(a: readonly VbaRuntimeValue[]): string {
  checkArgs("TypeName", a, args(1));
  const value = a[0];
  if (value === null) {return "Nothing";}
  if (value === undefined) {return "Empty";}
  if (typeof value === "boolean") {return "Boolean";}
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      if (value >= -32768 && value <= 32767) {return "Integer";}
      return "Long";
    }
    return "Double";
  }
  if (typeof value === "string") {return "String";}
  if (isDate(value)) {return "Date";}
  if (isArray(value)) {return "Variant()";}
  if (isHostObject(value)) {return value.hostType;}
  return "Variant";
}

function vbaVarType(a: readonly VbaRuntimeValue[]): number {
  checkArgs("VarType", a, args(1));
  const value = a[0];
  if (value === undefined) {return 0;} // vbEmpty
  if (value === null) {return 1;} // vbNull
  if (typeof value === "number") {
    if (Number.isInteger(value)) {return 3;} // vbLong
    return 5; // vbDouble
  }
  if (typeof value === "string") {return 8;} // vbString
  if (typeof value === "boolean") {return 11;} // vbBoolean
  if (isDate(value)) {return 7;} // vbDate
  if (isHostObject(value)) {return 9;} // vbObject
  if (isArray(value)) {return 8192;} // vbArray
  return 12; // vbVariant
}
