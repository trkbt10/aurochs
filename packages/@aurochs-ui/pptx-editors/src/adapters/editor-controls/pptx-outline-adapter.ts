/**
 * @file PPTX outline formatting adapter
 *
 * Converts between PPTX Line and the generic OutlineFormatting type.
 */

import type { BaseLine } from "@aurochs-office/drawing-ml/domain/line";
import type { FormattingAdapter } from "@aurochs-ui/editor-controls/formatting-adapter";
import type { OutlineFormatting } from "@aurochs-ui/editor-controls/surface";

const DASH_MAP: Record<string, OutlineFormatting["style"]> = {
  solid: "solid",
  dash: "dashed",
  dot: "dotted",
  sysDash: "dashed",
  sysDot: "dotted",
  dashDot: "dashed",
  lgDash: "dashed",
  lgDashDot: "dashed",
  lgDashDotDot: "dashed",
  sysDashDot: "dashed",
  sysDashDotDot: "dashed",
};

/** Extract color hex string from outline line properties */
function extractOutlineColor(value: BaseLine): string | undefined {
  if (value.fill?.type === "solidFill") {
    const c = value.fill.color;
    return c.spec.type === "srgb" ? `#${c.spec.value}` : "#000000";
  }
  return undefined;
}

export const pptxOutlineAdapter: FormattingAdapter<BaseLine, OutlineFormatting> = {
  toGeneric(value: BaseLine): OutlineFormatting {
    const color = extractOutlineColor(value);

    return {
      width: value.width !== undefined ? (value.width as number) : undefined,
      color,
      style: value.dash ? (typeof value.dash === "string" ? (DASH_MAP[value.dash] ?? "solid") : "solid") : "solid",
    };
  },

  applyUpdate(current: BaseLine, update: Partial<OutlineFormatting>): BaseLine {
    const result = { ...current };

    if ("width" in update && update.width !== undefined) {
      result.width = update.width as BaseLine["width"];
    }

    return result;
  },
};
