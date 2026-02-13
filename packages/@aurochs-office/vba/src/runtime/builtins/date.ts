/**
 * @file VBA Date Built-in Functions
 */

import type { VbaRuntimeValue } from "../../host/api";
import { toNumber, VbaRuntimeError } from "../value";
import type { VbaBuiltinFn } from "./index";
import { args, checkArgs, toDate } from "./common";

/**
 * Register date functions.
 */
export function registerDateFunctions(register: (name: string, fn: VbaBuiltinFn) => void): void {
  register("Now", vbaNow);
  register("Date", vbaDate);
  register("Time", vbaTime);
  register("Year", vbaYear);
  register("Month", vbaMonth);
  register("Day", vbaDay);
  register("Hour", vbaHour);
  register("Minute", vbaMinute);
  register("Second", vbaSecond);
  register("Weekday", vbaWeekday);
  register("DateSerial", vbaDateSerial);
  register("TimeSerial", vbaTimeSerial);
  register("DateAdd", vbaDateAdd);
  register("DateDiff", vbaDateDiff);
}

function vbaNow(_a: readonly VbaRuntimeValue[]): Date {
  return new Date();
}

function vbaDate(_a: readonly VbaRuntimeValue[]): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function vbaTime(_a: readonly VbaRuntimeValue[]): Date {
  const now = new Date();
  return new Date(1899, 11, 30, now.getHours(), now.getMinutes(), now.getSeconds());
}

function vbaYear(a: readonly VbaRuntimeValue[]): number {
  checkArgs("Year", a, args(1));
  return toDate(a[0]).getFullYear();
}

function vbaMonth(a: readonly VbaRuntimeValue[]): number {
  checkArgs("Month", a, args(1));
  return toDate(a[0]).getMonth() + 1;
}

function vbaDay(a: readonly VbaRuntimeValue[]): number {
  checkArgs("Day", a, args(1));
  return toDate(a[0]).getDate();
}

function vbaHour(a: readonly VbaRuntimeValue[]): number {
  checkArgs("Hour", a, args(1));
  return toDate(a[0]).getHours();
}

function vbaMinute(a: readonly VbaRuntimeValue[]): number {
  checkArgs("Minute", a, args(1));
  return toDate(a[0]).getMinutes();
}

function vbaSecond(a: readonly VbaRuntimeValue[]): number {
  checkArgs("Second", a, args(1));
  return toDate(a[0]).getSeconds();
}

function vbaWeekday(a: readonly VbaRuntimeValue[]): number {
  checkArgs("Weekday", a, args(1, 2));
  const d = toDate(a[0]);
  const firstDayOfWeek = a.length > 1 ? Math.floor(toNumber(a[1])) : 1;
  const rawDay = d.getDay() + 1;
  const day = firstDayOfWeek !== 1 ? ((rawDay - firstDayOfWeek + 7) % 7) + 1 : rawDay;
  return day;
}

function vbaDateSerial(a: readonly VbaRuntimeValue[]): Date {
  checkArgs("DateSerial", a, args(3));
  const year = Math.floor(toNumber(a[0]));
  const month = Math.floor(toNumber(a[1]));
  const day = Math.floor(toNumber(a[2]));
  return new Date(year, month - 1, day);
}

function vbaTimeSerial(a: readonly VbaRuntimeValue[]): Date {
  checkArgs("TimeSerial", a, args(3));
  const hour = Math.floor(toNumber(a[0]));
  const minute = Math.floor(toNumber(a[1]));
  const second = Math.floor(toNumber(a[2]));
  return new Date(1899, 11, 30, hour, minute, second);
}

function vbaDateAdd(a: readonly VbaRuntimeValue[]): Date {
  checkArgs("DateAdd", a, args(3));
  const interval = String(a[0]).toLowerCase();
  const number = Math.floor(toNumber(a[1]));
  const d = new Date(toDate(a[2]));

  switch (interval) {
    case "yyyy":
      d.setFullYear(d.getFullYear() + number);
      break;
    case "q":
      d.setMonth(d.getMonth() + number * 3);
      break;
    case "m":
      d.setMonth(d.getMonth() + number);
      break;
    case "y":
    case "d":
    case "w":
      d.setDate(d.getDate() + number);
      break;
    case "ww":
      d.setDate(d.getDate() + number * 7);
      break;
    case "h":
      d.setHours(d.getHours() + number);
      break;
    case "n":
      d.setMinutes(d.getMinutes() + number);
      break;
    case "s":
      d.setSeconds(d.getSeconds() + number);
      break;
    default:
      throw new VbaRuntimeError(`Invalid interval: ${interval}`, "invalidProcedureCall");
  }
  return d;
}

function vbaDateDiff(a: readonly VbaRuntimeValue[]): number {
  checkArgs("DateDiff", a, args(3));
  const interval = String(a[0]).toLowerCase();
  const d1 = toDate(a[1]);
  const d2 = toDate(a[2]);

  const msPerDay = 86400000;
  const diffMs = d2.getTime() - d1.getTime();
  const diffDays = diffMs / msPerDay;

  switch (interval) {
    case "yyyy":
      return d2.getFullYear() - d1.getFullYear();
    case "q":
      return Math.floor((d2.getFullYear() * 12 + d2.getMonth() - (d1.getFullYear() * 12 + d1.getMonth())) / 3);
    case "m":
      return d2.getFullYear() * 12 + d2.getMonth() - (d1.getFullYear() * 12 + d1.getMonth());
    case "y":
    case "d":
      return Math.floor(diffDays);
    case "w":
    case "ww":
      return Math.floor(diffDays / 7);
    case "h":
      return Math.floor(diffMs / 3600000);
    case "n":
      return Math.floor(diffMs / 60000);
    case "s":
      return Math.floor(diffMs / 1000);
    default:
      throw new VbaRuntimeError(`Invalid interval: ${interval}`, "invalidProcedureCall");
  }
}
