/**
 * @file Autofill series detection
 *
 * Detects numeric/date sequences in the base range and computes fill values.
 * When the base includes formulas or mixed types, autofill falls back to pattern repeat.
 */

import type { CellValue } from "@oxen/xlsx/domain/cell/types";
import type { PatternCell, PatternSeries } from "./types";

export type RepeatDirection = "forward" | "backward";

/**
 * Get the index into a repeating pattern for a given step, supporting reverse (up/left) fill.
 */
export function getRepeatIndex(stepIndex: number, length: number, direction: RepeatDirection): number {
  if (length <= 0) {
    return 0;
  }
  const cycle = stepIndex % length;
  if (direction === "forward") {
    return cycle;
  }
  return (length - 1 - cycle + length) % length;
}

/**
 * Infer a numeric or date series from a base pattern, if possible.
 *
 * - Returns `numeric` only when all values are numbers and there are no formulas.
 * - Returns `date` only when all values are dates and there are no formulas.
 * - Otherwise returns `repeat`.
 */
export function computeNumericSeries(values: readonly PatternCell[]): PatternSeries {
  if (values.length === 0) {
    return { type: "repeat" };
  }
  if (values.some((v) => v.formula)) {
    return { type: "repeat" };
  }
  if (values.every((v) => v.value.type === "number")) {
    const nums = values.map((v) => (v.value as Extract<CellValue, { type: "number" }>).value);
    const stepForward = nums.length >= 2 ? nums[nums.length - 1] - nums[nums.length - 2] : 1;
    const stepBackward = nums.length >= 2 ? nums[1] - nums[0] : 1;
    return { type: "numeric", stepForward, stepBackward, first: nums[0]!, last: nums[nums.length - 1]! };
  }
  if (values.every((v) => v.value.type === "date")) {
    const dates = values.map((v) => (v.value as Extract<CellValue, { type: "date" }>).value);
    const toDays = (d: Date): number => Math.floor(d.getTime() / (24 * 60 * 60 * 1000));
    const stepForwardDays = dates.length >= 2 ? toDays(dates[dates.length - 1]!) - toDays(dates[dates.length - 2]!) : 1;
    const stepBackwardDays = dates.length >= 2 ? toDays(dates[1]!) - toDays(dates[0]!) : 1;
    return { type: "date", stepForwardDays, stepBackwardDays, first: dates[0]!, last: dates[dates.length - 1]! };
  }
  return { type: "repeat" };
}

/**
 * Add whole days to a Date (UTC-millisecond arithmetic).
 */
export function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Compute the next numeric value for a series fill.
 */
export function computeNumericFillValue(series: Extract<PatternSeries, { type: "numeric" }>, stepAmount: number, isForward: boolean): number {
  if (isForward) {
    return series.last + series.stepForward * stepAmount;
  }
  return series.first - series.stepBackward * stepAmount;
}

/**
 * Compute the next date value for a series fill.
 */
export function computeDateFillValue(series: Extract<PatternSeries, { type: "date" }>, stepAmount: number, isForward: boolean): Date {
  if (isForward) {
    return addDays(series.last, series.stepForwardDays * stepAmount);
  }
  return addDays(series.first, -series.stepBackwardDays * stepAmount);
}
