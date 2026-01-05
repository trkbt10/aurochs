/**
 * @file Background fill conversion utilities
 *
 * Converts BackgroundFill (from domain/drawing-ml) to ResolvedBackgroundFill
 * (used by render layer).
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
 * @see ECMA-376 Part 1, Section 20.1.8.46 (a:path) for radial/path gradients
 */

import type { ResolvedBackgroundFill } from "./types";
import type { BackgroundFill, GradientData } from "../../domain/drawing-ml";

/**
 * Calculate radial center from fillToRect.
 * fillToRect values are in 1/100000 percentages (per ECMA-376).
 * Convert to 0-100 percentage for SVG.
 */
function calculateRadialCenter(
  gradientData: GradientData,
): { cx: number; cy: number } | undefined {
  if (gradientData.type !== "path" || gradientData.fillToRect === undefined) {
    return undefined;
  }
  const { l, r, t, b } = gradientData.fillToRect;
  return {
    cx: (l + r) / 2000,
    cy: (t + b) / 2000,
  };
}

/**
 * Convert BackgroundFill to ResolvedBackgroundFill.
 *
 * This converts the background resolution result (from getBackgroundFillData)
 * to the render-layer ResolvedBackgroundFill type.
 *
 * @param bgFillData - Background fill data from getBackgroundFillData()
 * @returns Resolved background fill for rendering, or undefined if no fill
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
 * @see ECMA-376 Part 1, Section 20.1.8.46 (a:path) for radial/path gradients
 */
export function toResolvedBackgroundFill(bgFillData: BackgroundFill): ResolvedBackgroundFill | undefined {
  if (bgFillData.image !== undefined) {
    return {
      type: "image",
      dataUrl: bgFillData.image,
      mode: bgFillData.imageFillMode === "stretch" ? "stretch" : "tile",
    };
  }

  if (bgFillData.gradientData !== undefined) {
    const isRadial = bgFillData.gradientData.type === "path";
    const radialCenter = calculateRadialCenter(bgFillData.gradientData);

    return {
      type: "gradient",
      angle: bgFillData.gradientData.angle,
      stops: bgFillData.gradientData.stops.map((stop) => ({
        position: stop.position,
        color: stop.color.startsWith("#") ? stop.color : `#${stop.color}`,
      })),
      isRadial,
      radialCenter,
    };
  }

  if (bgFillData.color !== undefined) {
    return {
      type: "solid",
      color: bgFillData.color.startsWith("#") ? bgFillData.color : `#${bgFillData.color}`,
    };
  }

  return undefined;
}
