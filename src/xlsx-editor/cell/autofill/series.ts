import type { CellValue } from "../../../xlsx/domain/cell/types";
import type { PatternCell, PatternSeries } from "./types";

export type RepeatDirection = "forward" | "backward";

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

export function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

export function computeNumericFillValue(series: Extract<PatternSeries, { type: "numeric" }>, stepAmount: number, isForward: boolean): number {
  if (isForward) {
    return series.last + series.stepForward * stepAmount;
  }
  return series.first - series.stepBackward * stepAmount;
}

export function computeDateFillValue(series: Extract<PatternSeries, { type: "date" }>, stepAmount: number, isForward: boolean): Date {
  if (isForward) {
    return addDays(series.last, series.stepForwardDays * stepAmount);
  }
  return addDays(series.first, -series.stepBackwardDays * stepAmount);
}

