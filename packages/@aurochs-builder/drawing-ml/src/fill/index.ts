/**
 * @file Fill builder exports
 */

import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { FillInput, SolidFillInput, GradientFillInput, PatternFillInput, ThemeFillInput, BlipFillInput } from "@aurochs-office/drawing-ml/domain/spec";
import { isThemeColorInput } from "@aurochs-office/drawing-ml/domain/spec";
import { buildSolidFill, buildSolidFillFromSpec, buildThemeFill } from "./solid-fill";
import { buildGradientFill } from "./gradient-fill";
import { buildPatternFill } from "./pattern-fill";
import { buildBlipFill } from "./blip-fill";

// Re-export individual builders
export { buildColor, buildSolidFill, buildSolidFillFromSpec, buildThemeFill } from "./solid-fill";
export { buildGradientFill } from "./gradient-fill";
export { buildPatternFill } from "./pattern-fill";
export { buildBlipFill, buildSimpleBlipFill, buildCroppedBlipFill, buildTiledBlipFill } from "./blip-fill";

// Domain → Input conversions: import from @aurochs-office/drawing-ml/domain (colorToInput, fillToInput)

/**
 * Check if a fill spec is a blip fill
 */
function isBlipFillInput(spec: FillInput): spec is BlipFillInput {
  return typeof spec === "object" && "resourceId" in spec;
}

/**
 * Build a fill object from FillInput
 */
export function buildFill(fillSpec: FillInput): BaseFill | undefined {
  if (typeof fillSpec === "string") {
    if (fillSpec === "none") {
      return undefined;
    }
    return buildSolidFill(fillSpec);
  }

  // Handle blip fill (which has resourceId but no type property)
  if (isBlipFillInput(fillSpec)) {
    return buildBlipFill(fillSpec);
  }

  switch (fillSpec.type) {
    case "solid": {
      const solidSpec = fillSpec as SolidFillInput;
      if (isThemeColorInput(solidSpec.color)) {
        return buildSolidFillFromSpec(solidSpec.color);
      }
      return buildSolidFill(solidSpec.color);
    }
    case "gradient":
      return buildGradientFill(fillSpec as GradientFillInput);
    case "pattern":
      return buildPatternFill(fillSpec as PatternFillInput);
    case "theme":
      return buildThemeFill(fillSpec as ThemeFillInput);
    default:
      return undefined;
  }
}
