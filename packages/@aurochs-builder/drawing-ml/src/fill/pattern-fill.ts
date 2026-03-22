/**
 * @file Pattern fill builder for DrawingML
 */

import type { PatternFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { PatternFillInput } from "@aurochs-office/drawing-ml/domain/spec";
import { buildColor } from "./solid-fill";

/**
 * Build a pattern fill object
 */
export function buildPatternFill(spec: PatternFillInput): PatternFill {
  return {
    type: "patternFill",
    preset: spec.preset,
    foregroundColor: buildColor(spec.fgColor),
    backgroundColor: buildColor(spec.bgColor),
  };
}
