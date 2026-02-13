/**
 * @file VBA Utility Built-in Functions
 */

import type { VbaRuntimeValue } from "../../host/api";
import { toBoolean, toNumber, toString, isDate } from "../value";
import type { VbaBuiltinFn } from "./index";
import { args, checkArgs } from "./common";

/**
 * Register utility functions.
 */
export function registerUtilityFunctions(register: (name: string, fn: VbaBuiltinFn) => void): void {
  register("IIf", vbaIIf);
  register("Choose", vbaChoose);
  register("Switch", vbaSwitch);
  register("Format", vbaFormat);
}

function vbaIIf(a: readonly VbaRuntimeValue[]): VbaRuntimeValue {
  checkArgs("IIf", a, args(3));
  return toBoolean(a[0]) ? a[1] : a[2];
}

function vbaChoose(a: readonly VbaRuntimeValue[]): VbaRuntimeValue {
  checkArgs("Choose", a, args(2, 100));
  const index = Math.floor(toNumber(a[0]));
  if (index < 1 || index >= a.length) {
    return null;
  }
  return a[index];
}

function vbaSwitch(a: readonly VbaRuntimeValue[]): VbaRuntimeValue {
  // Switch(expr1, val1, expr2, val2, ...)
  if (a.length < 2 || a.length % 2 !== 0) {
    return null;
  }
  for (let i = 0; i < a.length; i += 2) {
    if (toBoolean(a[i])) {
      return a[i + 1];
    }
  }
  return null;
}

function vbaFormat(a: readonly VbaRuntimeValue[]): string {
  checkArgs("Format", a, args(1, 2));
  const value = a[0];
  const format = a.length > 1 ? toString(a[1]) : "";

  if (typeof value === "number") {
    if (format === "") {return String(value);}
    if (format.toLowerCase() === "0.00") {
      return value.toFixed(2);
    }
    if (format.toLowerCase() === "#,##0") {
      return Math.round(value).toLocaleString();
    }
    if (format.toLowerCase() === "percent") {
      return (value * 100).toFixed(2) + "%";
    }
    return String(value);
  }

  if (isDate(value)) {
    const d = value;
    if (format.toLowerCase() === "short date") {
      return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    }
    if (format.toLowerCase() === "long date") {
      return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    }
    return d.toLocaleString();
  }

  return toString(value);
}
