/**
 * @file Effective color mapping for `ColorMapEditor` on a presentation slide
 *
 * Merges master/document `colorMap` with optional slide `colorMapOverride` so the editor
 * shows the same logical map the user would expect from inheritance (ECMA-376 §19.3.1.6).
 */

import type { ColorMap } from "@aurochs-office/drawing-ml/domain/color-context";
import type { Slide } from "@aurochs-office/pptx/domain";
import { DEFAULT_COLOR_MAPPING, type ColorMapping } from "@aurochs-office/pptx/domain/color/types";

/**
 * Build a full `ColorMapping` for editing the active slide’s effective clrMap (including override).
 */
export function slideColorMappingForEditor(slide: Slide | undefined, documentColorMap: ColorMap): ColorMapping {
  const base: ColorMapping = { ...DEFAULT_COLOR_MAPPING, ...documentColorMap };
  const o = slide?.colorMapOverride;
  if (o?.type === "override") {
    return { ...base, ...o.mappings };
  }
  return base;
}
