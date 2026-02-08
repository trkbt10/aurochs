/**
 * @file PPTX outline formatting adapter
 *
 * Converts between PPTX Line and the generic OutlineFormatting type.
 */

import type { Line } from "@aurochs-office/pptx/domain/color/types";
import type { FormattingAdapter, OutlineFormatting } from "@aurochs-ui/editor-controls/types";

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

export const pptxOutlineAdapter: FormattingAdapter<Line, OutlineFormatting> = {
  toGeneric(value: Line): OutlineFormatting {
    let color: string | undefined;
    if (value.fill?.type === "solidFill") {
      const c = value.fill.color;
      color = c.spec.type === "srgb" ? `#${c.spec.value}` : "#000000";
    }

    return {
      width: value.width !== undefined ? (value.width as number) : undefined,
      color,
      style: value.dash ? (typeof value.dash === "string" ? (DASH_MAP[value.dash] ?? "solid") : "solid") : "solid",
    };
  },

  applyUpdate(current: Line, update: Partial<OutlineFormatting>): Line {
    const result = { ...current };

    if ("width" in update && update.width !== undefined) {
      result.width = update.width as Line["width"];
    }

    return result;
  },
};
