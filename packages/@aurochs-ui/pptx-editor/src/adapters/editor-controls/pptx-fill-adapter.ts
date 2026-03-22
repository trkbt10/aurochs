/**
 * @file PPTX fill formatting adapter
 *
 * Converts between PPTX BaseFill and the generic FillFormatting type.
 * Only none/solid are first-class in the generic type;
 * gradient/pattern/image are represented as "other".
 */

import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { SolidFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { FormattingAdapter } from "@aurochs-ui/editor-controls/formatting-adapter";
import type { FillFormatting } from "@aurochs-ui/editor-controls/surface";
import { createDefaultColor } from "@aurochs-ui/editor-controls/editors";

const FILL_LABELS: Record<string, string> = {
  gradientFill: "Gradient",
  patternFill: "Pattern",
  blipFill: "Image",
};

export const pptxFillAdapter: FormattingAdapter<BaseFill, FillFormatting> = {
  toGeneric(value: BaseFill): FillFormatting {
    if (value.type === "noFill") {
      return { type: "none" };
    }
    if (value.type === "solidFill") {
      const solid = value as SolidFill;
      const hex = solid.color.spec.type === "srgb" ? `#${solid.color.spec.value}` : "#000000";
      return { type: "solid", color: hex };
    }
    return { type: "other", label: FILL_LABELS[value.type] ?? value.type };
  },

  applyUpdate(current: BaseFill, update: Partial<FillFormatting>): BaseFill {
    if (!update.type) {
      return current;
    }
    if (update.type === "none") {
      return { type: "noFill" };
    }
    if (update.type === "solid" && "color" in update && update.color) {
      const hex = (update.color as string).replace(/^#/, "");
      return { type: "solidFill", color: createDefaultColor(hex) };
    }
    // "other" type: return current unchanged (advanced fill handled by slot)
    return current;
  },
};
