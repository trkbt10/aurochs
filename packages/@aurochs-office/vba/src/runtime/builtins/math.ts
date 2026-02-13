/**
 * @file VBA Math Built-in Functions
 */

import type { VbaRuntimeValue } from "../../host/api";
import { toNumber, VbaRuntimeError } from "../value";
import type { VbaBuiltinFn } from "./index";
import { args, checkArgs } from "./common";

/**
 * Register math functions.
 */
export function registerMathFunctions(register: (name: string, fn: VbaBuiltinFn) => void): void {
  register("Abs", vbaAbs);
  register("Int", vbaInt);
  register("Fix", vbaFix);
  register("Sgn", vbaSgn);
  register("Sqr", vbaSqr);
  register("Exp", vbaExp);
  register("Log", vbaLog);
  register("Sin", vbaSin);
  register("Cos", vbaCos);
  register("Tan", vbaTan);
  register("Atn", vbaAtn);
  register("Rnd", vbaRnd);
  register("Round", vbaRound);
}

function vbaAbs(a: readonly VbaRuntimeValue[]): number {
  checkArgs("Abs", a, args(1));
  return Math.abs(toNumber(a[0]));
}

function vbaInt(a: readonly VbaRuntimeValue[]): number {
  checkArgs("Int", a, args(1));
  return Math.floor(toNumber(a[0]));
}

function vbaFix(a: readonly VbaRuntimeValue[]): number {
  checkArgs("Fix", a, args(1));
  return Math.trunc(toNumber(a[0]));
}

function vbaSgn(a: readonly VbaRuntimeValue[]): number {
  checkArgs("Sgn", a, args(1));
  const n = toNumber(a[0]);
  if (n > 0) {return 1;}
  if (n < 0) {return -1;}
  return 0;
}

function vbaSqr(a: readonly VbaRuntimeValue[]): number {
  checkArgs("Sqr", a, args(1));
  const n = toNumber(a[0]);
  if (n < 0) {
    throw new VbaRuntimeError("Invalid procedure call: Sqr of negative number", "invalidProcedureCall");
  }
  return Math.sqrt(n);
}

function vbaExp(a: readonly VbaRuntimeValue[]): number {
  checkArgs("Exp", a, args(1));
  return Math.exp(toNumber(a[0]));
}

function vbaLog(a: readonly VbaRuntimeValue[]): number {
  checkArgs("Log", a, args(1));
  const n = toNumber(a[0]);
  if (n <= 0) {
    throw new VbaRuntimeError("Invalid procedure call: Log of non-positive number", "invalidProcedureCall");
  }
  return Math.log(n);
}

function vbaSin(a: readonly VbaRuntimeValue[]): number {
  checkArgs("Sin", a, args(1));
  return Math.sin(toNumber(a[0]));
}

function vbaCos(a: readonly VbaRuntimeValue[]): number {
  checkArgs("Cos", a, args(1));
  return Math.cos(toNumber(a[0]));
}

function vbaTan(a: readonly VbaRuntimeValue[]): number {
  checkArgs("Tan", a, args(1));
  return Math.tan(toNumber(a[0]));
}

function vbaAtn(a: readonly VbaRuntimeValue[]): number {
  checkArgs("Atn", a, args(1));
  return Math.atan(toNumber(a[0]));
}

function vbaRnd(_a: readonly VbaRuntimeValue[]): number {
  // VBA Rnd behavior:
  // Rnd() or Rnd(positive) - next random number
  // Rnd(0) - most recently generated number (we ignore this)
  // Rnd(negative) - same sequence from seed (we ignore this)
  return Math.random();
}

function vbaRound(a: readonly VbaRuntimeValue[]): number {
  checkArgs("Round", a, args(1, 2));
  const num = toNumber(a[0]);
  const decimals = a.length > 1 ? Math.floor(toNumber(a[1])) : 0;
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}
