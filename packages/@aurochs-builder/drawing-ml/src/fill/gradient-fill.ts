/**
 * @file Gradient fill builder for DrawingML
 */

import type { GradientFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { Degrees, Percent } from "@aurochs-office/drawing-ml/domain/units";
import type { GradientFillSpec } from "../types";
import { buildColor } from "./solid-fill";

/**
 * Build a gradient fill object
 */
export function buildGradientFill(spec: GradientFillSpec): GradientFill {
  const stops = spec.stops.map((stop) => ({
    position: (stop.position * 1000) as Percent, // Convert 0-100 to 0-100000
    color: buildColor(stop.color),
  }));

  if (spec.gradientType === "linear") {
    return {
      type: "gradientFill",
      stops,
      linear: {
        angle: (spec.angle ?? 0) as Degrees,
        scaled: false,
      },
      rotWithShape: true,
    };
  }
  if (spec.gradientType === "radial") {
    return {
      type: "gradientFill",
      stops,
      path: {
        path: "circle",
      },
      rotWithShape: true,
    };
  }
  // path type
  return {
    type: "gradientFill",
    stops,
    path: {
      path: "rect",
    },
    rotWithShape: true,
  };
}
