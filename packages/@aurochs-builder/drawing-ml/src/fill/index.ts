/**
 * @file Fill builder exports
 */

import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { FillSpec, SolidFillSpec, GradientFillSpec, PatternFillSpec, ThemeFillSpec } from "../types";
import { isThemeColor } from "../types";
import { buildSolidFill, buildSolidFillFromSpec, buildThemeFill } from "./solid-fill";
import { buildGradientFill } from "./gradient-fill";
import { buildPatternFill } from "./pattern-fill";

// Re-export individual builders
export { buildColor, buildSolidFill, buildSolidFillFromSpec, buildThemeFill } from "./solid-fill";
export { buildGradientFill } from "./gradient-fill";
export { buildPatternFill } from "./pattern-fill";

/**
 * Build a fill object from FillSpec
 */
export function buildFill(fillSpec: FillSpec): BaseFill | undefined {
  if (typeof fillSpec === "string") {
    if (fillSpec === "none") {
      return undefined;
    }
    return buildSolidFill(fillSpec);
  }
  switch (fillSpec.type) {
    case "solid": {
      const solidSpec = fillSpec as SolidFillSpec;
      if (isThemeColor(solidSpec.color)) {
        return buildSolidFillFromSpec(solidSpec.color);
      }
      return buildSolidFill(solidSpec.color);
    }
    case "gradient":
      return buildGradientFill(fillSpec as GradientFillSpec);
    case "pattern":
      return buildPatternFill(fillSpec as PatternFillSpec);
    case "theme":
      return buildThemeFill(fillSpec as ThemeFillSpec);
    default:
      return undefined;
  }
}
