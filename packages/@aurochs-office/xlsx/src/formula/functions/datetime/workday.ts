/**
 * @file WORKDAY function implementation.
 *
 * Returns a date serial a given number of workdays before/after a start date.
 * Weekends are Saturday/Sunday; optional holidays are excluded as well.
 *
 * Note: This implementation uses the project's date serial epoch (1899-12-30 UTC).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import type { EvalResult, FormulaFunctionHelpers } from "../helpers";
import { coerceDateSerial } from "./coerceDateSerial";
import { serialToDate } from "./serialDate";

function isWeekend(dateSerial: number): boolean {
  const date = serialToDate(dateSerial);
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

function collectHolidaySerials(value: EvalResult | undefined, helpers: FormulaFunctionHelpers): ReadonlySet<number> {
  if (value === undefined) {
    return new Set();
  }
  const flattened = helpers.flattenResult(value);
  const holidaySerials: number[] = [];
  for (const entry of flattened) {
    if (entry === null || entry === "") {
      continue;
    }
    holidaySerials.push(coerceDateSerial(entry, helpers, "WORKDAY holidays"));
  }
  return new Set(holidaySerials);
}

function advanceToWorkday(startSerial: number, direction: 1 | -1, holidays: ReadonlySet<number>): number {
  for (let current = startSerial; ; current += direction) {
    if (isWeekend(current)) {
      continue;
    }
    if (holidays.has(current)) {
      continue;
    }
    return current;
  }
}

function shiftWorkdays(params: {
  readonly startSerial: number;
  readonly workdays: number;
  readonly direction: 1 | -1;
  readonly holidays: ReadonlySet<number>;
}): number {
  const { startSerial, workdays, direction, holidays } = params;
  if (workdays === 0) {
    return startSerial;
  }
  for (let moved = 0, current = startSerial; moved < workdays; moved += 1) {
    const next = advanceToWorkday(current + direction, direction, holidays);
    if (moved + 1 === workdays) {
      return next;
    }
    current = next;
  }
  throw new Error("Unexpected WORKDAY shift state");
}

export const workdayFunction: FormulaFunctionEagerDefinition = {
  name: "WORKDAY",
  category: "datetime",
  description: {
    en: "Returns a date serial offset by the specified number of workdays.",
    ja: "指定した営業日数だけ前後した日付シリアル値を返します。",
  },
  examples: ["WORKDAY(A1,5)", "WORKDAY(A1,-5)", "WORKDAY(A1,5,holidays)"],
  evaluate: (args, helpers) => {
    if (args.length < 2 || args.length > 3) {
      throw new Error("WORKDAY expects 2 or 3 arguments");
    }

    const startSerial = coerceDateSerial(args[0], helpers, "WORKDAY start_date");
    const days = helpers.requireNumber(args[1], "WORKDAY days");
    const dayCount = Math.trunc(days);
    const holidays = collectHolidaySerials(args[2], helpers);

    const direction: 1 | -1 = dayCount >= 0 ? 1 : -1;
    const remaining = Math.abs(dayCount);
    const alignedStart = advanceToWorkday(startSerial, direction, holidays);
    return shiftWorkdays({ startSerial: alignedStart, workdays: remaining, direction, holidays });
  },
};
