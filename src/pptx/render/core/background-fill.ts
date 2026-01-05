/**
 * @file Background fill conversion utilities
 *
 * Converts legacy BackgroundFill (from core/dml/render) to ResolvedBackgroundFill
 * (used by render layer).
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
 * @see ECMA-376 Part 1, Section 20.1.8.46 (a:path) for radial/path gradients
 */

import type { ResolvedBackgroundFill } from "./types";
import type { BackgroundFill } from "../../core/dml/render/types";

/**
 * Convert BackgroundFill from core/dml to ResolvedBackgroundFill.
 *
 * This converts the legacy background resolution result (from getBackgroundFillData)
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
    const fillToRect = bgFillData.gradientData.fillToRect;

    // Calculate radial center from fillToRect
    // fillToRect values are in 1/100000 percentages (per ECMA-376)
    // Convert to 0-100 percentage for SVG
    let radialCenter: { cx: number; cy: number } | undefined;
    if (isRadial && fillToRect !== undefined) {
      radialCenter = {
        cx: (fillToRect.l + fillToRect.r) / 2000,
        cy: (fillToRect.t + fillToRect.b) / 2000,
      };
    }

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
