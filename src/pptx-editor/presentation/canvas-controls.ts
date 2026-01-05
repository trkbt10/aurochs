/**
 * @file Canvas controls helpers
 *
 * Shared zoom and snapping utilities for the editor.
 */

import type { SelectOption } from "../types";

export const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3] as const;
export const SNAP_STEPS = [1, 2, 5, 10, 20, 25, 50] as const;

export function getClosestZoomIndex(value: number): number {
  return ZOOM_STEPS.reduce((bestIndex, step, index) => {
    const bestDiff = Math.abs(ZOOM_STEPS[bestIndex] - value);
    const diff = Math.abs(step - value);
    return diff < bestDiff ? index : bestIndex;
  }, 0);
}

export function getNextZoomValue(value: number, direction: "in" | "out"): number {
  const currentIndex = getClosestZoomIndex(value);
  const delta = direction === "in" ? 1 : -1;
  const nextIndex = Math.min(Math.max(currentIndex + delta, 0), ZOOM_STEPS.length - 1);
  return ZOOM_STEPS[nextIndex];
}

export function getZoomOptions(): readonly SelectOption<string>[] {
  return ZOOM_STEPS.map((step) => ({
    value: `${Math.round(step * 100)}`,
    label: `${Math.round(step * 100)}%`,
  }));
}

export function getSnapOptions(): readonly SelectOption<string>[] {
  return SNAP_STEPS.map((step) => ({
    value: `${step}`,
    label: `${step}px`,
  }));
}

export function snapValue(value: number, step: number): number {
  if (step <= 0) {
    return value;
  }
  return Math.round(value / step) * step;
}
