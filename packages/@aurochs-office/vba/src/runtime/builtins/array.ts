/**
 * @file VBA Array Built-in Functions
 */

import type { VbaRuntimeValue } from "../../host/api";
import { VbaRuntimeError, isArray } from "../value";
import type { VbaBuiltinFn } from "./index";
import { args, checkArgs } from "./common";

/**
 * Register array functions.
 */
export function registerArrayFunctions(register: (name: string, fn: VbaBuiltinFn) => void): void {
  register("Array", vbaArray);
  register("LBound", vbaLBound);
  register("UBound", vbaUBound);
}

function vbaArray(a: readonly VbaRuntimeValue[]): VbaRuntimeValue[] {
  return [...a];
}

function vbaLBound(a: readonly VbaRuntimeValue[]): number {
  checkArgs("LBound", a, args(1, 2));
  if (!isArray(a[0])) {
    throw new VbaRuntimeError("Type mismatch: array expected", "typeMismatch");
  }
  // JavaScript arrays are 0-based
  return 0;
}

function vbaUBound(a: readonly VbaRuntimeValue[]): number {
  checkArgs("UBound", a, args(1, 2));
  if (!isArray(a[0])) {
    throw new VbaRuntimeError("Type mismatch: array expected", "typeMismatch");
  }
  return a[0].length - 1;
}
