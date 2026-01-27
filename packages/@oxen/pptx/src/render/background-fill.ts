/**
 * @file Background fill conversion utilities
 *
 * Converts BackgroundFill (from domain/drawing-ml) to ResolvedBackgroundFill
 * (used by render layer).
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
 * @see ECMA-376 Part 1, Section 20.1.8.46 (a:path) for radial/path gradients
 */

import type { BackgroundFill, GradientData } from "../domain/drawing-ml/background";

// =============================================================================
// Types
// =============================================================================

/**
 * Resolved background fill (after inheritance resolution).
 *
 * This is separate from domain types because:
 * 1. Domain types represent ECMA-376 structure (resourceId references)
 * 2. This represents the resolved result (data URLs, computed values)
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
 * @see ECMA-376 Part 1, Section 20.1.8.46 (a:path) for radial/path gradients
 */
export type ResolvedBackgroundFill =
  | { readonly type: "solid"; readonly color: string }
  | {
      readonly type: "gradient";
      readonly angle: number;
      readonly stops: readonly { readonly position: number; readonly color: string }[];
      /**
       * True if this is a radial (path) gradient.
       * Per ECMA-376 Part 1, Section 20.1.8.46 (a:path):
       * - path="circle" creates a circular radial gradient
       * - path="rect" creates a rectangular gradient
       * - path="shape" follows the shape boundary
       */
      readonly isRadial?: boolean;
      /**
       * Center position for radial gradients (percentages 0-100).
       * Derived from a:fillToRect element.
       * Default is center (50%, 50%) when not specified.
       */
      readonly radialCenter?: { readonly cx: number; readonly cy: number };
    }
  | { readonly type: "image"; readonly dataUrl: string; readonly mode: "stretch" | "tile" };

// =============================================================================
// Conversion
// =============================================================================

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

