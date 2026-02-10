/**
 * @file Zoom step utilities
 *
 * Shared zoom constants and helper functions for zoom controls.
 */

import type { SelectOption } from "@aurochs-ui/ui-components/types";
import type { ZoomMode } from "./types";

export const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3] as const;

/** Value used to represent the 'fit' mode in the zoom dropdown. */
export const FIT_ZOOM_VALUE = "fit";

/**
 * Find the nearest zoom step index for a value.
 */
export function getClosestZoomIndex(value: number): number {
  return ZOOM_STEPS.reduce((bestIndex, step, index) => {
    const bestDiff = Math.abs(ZOOM_STEPS[bestIndex] - value);
    const diff = Math.abs(step - value);
    return diff < bestDiff ? index : bestIndex;
  }, 0);
}

/**
 * Get the next zoom value for a direction.
 */
export function getNextZoomValue(value: number, direction: "in" | "out"): number {
  const currentIndex = getClosestZoomIndex(value);
  const delta = direction === "in" ? 1 : -1;
  const nextIndex = Math.min(Math.max(currentIndex + delta, 0), ZOOM_STEPS.length - 1);
  return ZOOM_STEPS[nextIndex];
}

/**
 * Build zoom selector options.
 * When includeFit is true, adds a "Fit" option at the beginning.
 */
export function getZoomOptions(includeFit = true): readonly SelectOption<string>[] {
  const fitOption: SelectOption<string> = {
    value: FIT_ZOOM_VALUE,
    label: "Fit",
  };
  const zoomOptions = ZOOM_STEPS.map((step) => ({
    value: `${Math.round(step * 100)}`,
    label: `${Math.round(step * 100)}%`,
  }));
  return includeFit ? [fitOption, ...zoomOptions] : zoomOptions;
}

/**
 * Check if a ZoomMode is the fit mode.
 */
export function isFitMode(mode: ZoomMode): mode is "fit" {
  return mode === "fit";
}
