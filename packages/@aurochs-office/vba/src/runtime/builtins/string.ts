/**
 * @file VBA String Built-in Functions
 */

import type { VbaRuntimeValue } from "../../host/api";
import { toString, toNumber, VbaRuntimeError, isNothing, isArray } from "../value";
import type { VbaBuiltinFn } from "./index";
import { args, checkArgs } from "./common";

/**
 * Register string functions.
 */
export function registerStringFunctions(register: (name: string, fn: VbaBuiltinFn) => void): void {
  register("Len", vbaLen);
  register("Left", vbaLeft);
  register("Right", vbaRight);
  register("Mid", vbaMid);
  register("InStr", vbaInStr);
  register("InStrRev", vbaInStrRev);
  register("LCase", vbaLCase);
  register("UCase", vbaUCase);
  register("Trim", vbaTrim);
  register("LTrim", vbaLTrim);
  register("RTrim", vbaRTrim);
  register("Replace", vbaReplace);
  register("Space", vbaSpace);
  register("String", vbaString);
  register("Chr", vbaChr);
  register("Asc", vbaAsc);
  register("StrReverse", vbaStrReverse);
  register("Split", vbaSplit);
  register("Join", vbaJoin);
}

function vbaLen(a: readonly VbaRuntimeValue[]): number {
  checkArgs("Len", a, args(1));
  if (isNothing(a[0])) {return 0;}
  return toString(a[0]).length;
}

function vbaLeft(a: readonly VbaRuntimeValue[]): string {
  checkArgs("Left", a, args(2));
  const str = toString(a[0]);
  const length = Math.floor(toNumber(a[1]));
  if (length < 0) {
    throw new VbaRuntimeError("Invalid procedure call: negative length", "invalidProcedureCall");
  }
  return str.substring(0, length);
}

function vbaRight(a: readonly VbaRuntimeValue[]): string {
  checkArgs("Right", a, args(2));
  const str = toString(a[0]);
  const length = Math.floor(toNumber(a[1]));
  if (length < 0) {
    throw new VbaRuntimeError("Invalid procedure call: negative length", "invalidProcedureCall");
  }
  return str.substring(str.length - length);
}

function vbaMid(a: readonly VbaRuntimeValue[]): string {
  checkArgs("Mid", a, args(2, 3));
  const str = toString(a[0]);
  const start = Math.floor(toNumber(a[1]));
  if (start < 1) {
    throw new VbaRuntimeError("Invalid procedure call: start < 1", "invalidProcedureCall");
  }
  const length = a.length > 2 ? Math.floor(toNumber(a[2])) : str.length;
  if (length < 0) {
    throw new VbaRuntimeError("Invalid procedure call: negative length", "invalidProcedureCall");
  }
  return str.substring(start - 1, start - 1 + length);
}

function vbaInStr(a: readonly VbaRuntimeValue[]): number {
  checkArgs("InStr", a, args(2, 4));
  const parsed = parseInStrArgs(a);

  if (parsed.start < 1) {
    throw new VbaRuntimeError("Invalid procedure call: start < 1", "invalidProcedureCall");
  }

  const idx = parsed.str1.indexOf(parsed.str2, parsed.start - 1);
  return idx === -1 ? 0 : idx + 1;
}

function parseInStrArgs(a: readonly VbaRuntimeValue[]): { start: number; str1: string; str2: string } {
  if (a.length >= 3 && typeof a[0] === "number") {
    return {
      start: Math.floor(toNumber(a[0])),
      str1: toString(a[1]),
      str2: toString(a[2]),
    };
  }
  return {
    start: 1,
    str1: toString(a[0]),
    str2: toString(a[1]),
  };
}

function vbaInStrRev(a: readonly VbaRuntimeValue[]): number {
  checkArgs("InStrRev", a, args(2, 4));
  const str1 = toString(a[0]);
  const str2 = toString(a[1]);
  const start = a.length > 2 ? Math.floor(toNumber(a[2])) : -1;

  const idx = start === -1 ? str1.lastIndexOf(str2) : str1.lastIndexOf(str2, start - 1);
  return idx === -1 ? 0 : idx + 1;
}

function vbaLCase(a: readonly VbaRuntimeValue[]): string {
  checkArgs("LCase", a, args(1));
  return toString(a[0]).toLowerCase();
}

function vbaUCase(a: readonly VbaRuntimeValue[]): string {
  checkArgs("UCase", a, args(1));
  return toString(a[0]).toUpperCase();
}

function vbaTrim(a: readonly VbaRuntimeValue[]): string {
  checkArgs("Trim", a, args(1));
  return toString(a[0]).trim();
}

function vbaLTrim(a: readonly VbaRuntimeValue[]): string {
  checkArgs("LTrim", a, args(1));
  return toString(a[0]).replace(/^\s+/, "");
}

function vbaRTrim(a: readonly VbaRuntimeValue[]): string {
  checkArgs("RTrim", a, args(1));
  return toString(a[0]).replace(/\s+$/, "");
}

function vbaReplace(a: readonly VbaRuntimeValue[]): string {
  checkArgs("Replace", a, args(3, 6));
  const expression = toString(a[0]);
  const find = toString(a[1]);
  const replaceWith = toString(a[2]);
  const start = a.length > 3 ? Math.floor(toNumber(a[3])) : 1;
  const count = a.length > 4 ? Math.floor(toNumber(a[4])) : -1;

  if (start < 1) {
    throw new VbaRuntimeError("Invalid procedure call: start < 1", "invalidProcedureCall");
  }

  const baseStr = expression.substring(start - 1);
  if (count === -1) {
    return baseStr.split(find).join(replaceWith);
  }
  return replaceWithCount({ str: baseStr, find, replaceWith, count });
}

type ReplaceParams = {
  readonly str: string;
  readonly find: string;
  readonly replaceWith: string;
  readonly count: number;
};

function replaceWithCount(params: ReplaceParams): string {
  const { str, find, replaceWith, count } = params;
  const state = { replaced: 0, result: "", pos: 0 };
  while (state.replaced < count) {
    const idx = str.indexOf(find, state.pos);
    if (idx === -1) {break;}
    state.result += str.substring(state.pos, idx) + replaceWith;
    state.pos = idx + find.length;
    state.replaced++;
  }
  state.result += str.substring(state.pos);
  return state.result;
}

function vbaSpace(a: readonly VbaRuntimeValue[]): string {
  checkArgs("Space", a, args(1));
  const count = Math.floor(toNumber(a[0]));
  if (count < 0) {
    throw new VbaRuntimeError("Invalid procedure call: negative count", "invalidProcedureCall");
  }
  return " ".repeat(count);
}

function vbaString(a: readonly VbaRuntimeValue[]): string {
  checkArgs("String", a, args(2));
  const count = Math.floor(toNumber(a[0]));
  if (count < 0) {
    throw new VbaRuntimeError("Invalid procedure call: negative count", "invalidProcedureCall");
  }
  const char = typeof a[1] === "number" ? String.fromCharCode(a[1]) : toString(a[1]).charAt(0);
  return char.repeat(count);
}

function vbaChr(a: readonly VbaRuntimeValue[]): string {
  checkArgs("Chr", a, args(1));
  const code = Math.floor(toNumber(a[0]));
  return String.fromCharCode(code);
}

function vbaAsc(a: readonly VbaRuntimeValue[]): number {
  checkArgs("Asc", a, args(1));
  const str = toString(a[0]);
  if (str.length === 0) {
    throw new VbaRuntimeError("Invalid procedure call: empty string", "invalidProcedureCall");
  }
  return str.charCodeAt(0);
}

function vbaStrReverse(a: readonly VbaRuntimeValue[]): string {
  checkArgs("StrReverse", a, args(1));
  return toString(a[0]).split("").reverse().join("");
}

function vbaSplit(a: readonly VbaRuntimeValue[]): VbaRuntimeValue[] {
  checkArgs("Split", a, args(1, 4));
  const str = toString(a[0]);
  const delimiter = a.length > 1 ? toString(a[1]) : " ";
  const limit = a.length > 2 ? Math.floor(toNumber(a[2])) : -1;

  if (limit === -1) {
    return str.split(delimiter);
  }
  return str.split(delimiter, limit);
}

function vbaJoin(a: readonly VbaRuntimeValue[]): string {
  checkArgs("Join", a, args(1, 2));
  const arr = a[0];
  if (!isArray(arr)) {
    throw new VbaRuntimeError("Type mismatch: array expected", "typeMismatch");
  }
  const delimiter = a.length > 1 ? toString(a[1]) : " ";
  return arr.map((v) => toString(v)).join(delimiter);
}
