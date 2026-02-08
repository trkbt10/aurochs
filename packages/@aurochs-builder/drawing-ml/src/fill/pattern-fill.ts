/**
 * @file Pattern fill builder for DrawingML
 */

import type { PatternFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { PatternFillSpec } from "../types";
import { buildColor } from "./solid-fill";

/**
 * Build a pattern fill object
 */
export function buildPatternFill(spec: PatternFillSpec): PatternFill {
  return {
    type: "patternFill",
    preset: spec.preset,
    foregroundColor: buildColor(spec.fgColor),
    backgroundColor: buildColor(spec.bgColor),
  };
}
