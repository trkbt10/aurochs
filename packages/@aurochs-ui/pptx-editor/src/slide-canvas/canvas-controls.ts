/**
 * @file Canvas controls helpers
 *
 * Snapping utilities for the editor.
 * Zoom utilities are in @aurochs-ui/editor-controls/zoom.
 */

import type { SelectOption } from "@aurochs-ui/ui-components/types";

export const SNAP_STEPS = [1, 2, 5, 10, 20, 25, 50] as const;

/**
 * Build snap step selector options.
 */
export function getSnapOptions(): readonly SelectOption<string>[] {
  return SNAP_STEPS.map((step) => ({
    value: `${step}`,
    label: `${step}px`,
  }));
}

/**
 * Snap a value to the nearest grid step.
 */
export function snapValue(value: number, step: number): number {
  if (step <= 0) {
    return value;
  }
  return Math.round(value / step) * step;
}
