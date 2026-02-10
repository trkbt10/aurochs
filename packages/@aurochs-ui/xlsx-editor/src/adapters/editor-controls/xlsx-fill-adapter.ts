/**
 * @file XLSX fill formatting adapter
 *
 * Converts between XLSX XlsxFill and the generic FillFormatting type.
 * Only solid pattern fills with RGB colors are fully round-trippable.
 */

import type { XlsxFill } from "@aurochs-office/xlsx/domain/style/fill";
import type { FormattingAdapter } from "@aurochs-ui/editor-controls/formatting-adapter";
import type { FillFormatting } from "@aurochs-ui/editor-controls/surface";
import { rgbHexFromXlsxColor, makeXlsxRgbColor } from "../../components/format-panel/color-utils";

/**
 * Adapter: XLSX XlsxFill <-> FillFormatting
 */
export const xlsxFillAdapter: FormattingAdapter<XlsxFill, FillFormatting> = {
  toGeneric(value: XlsxFill): FillFormatting {
    if (value.type === "none") {
      return { type: "none" };
    }
    if (value.type === "gradient") {
      return { type: "other", label: "Gradient" };
    }
    // Pattern fill
    const { pattern } = value;
    if (pattern.patternType === "none") {
      return { type: "none" };
    }
    if (pattern.patternType === "solid" && pattern.fgColor) {
      const hex = rgbHexFromXlsxColor(pattern.fgColor);
      if (hex) {
        return { type: "solid", color: `#${hex}` };
      }
      // Non-RGB solid (theme/indexed) - show as "other"
      return { type: "other", label: "Solid" };
    }
    // Non-solid pattern (gray125, darkGrid, etc.)
    return { type: "other", label: pattern.patternType };
  },

  applyUpdate(current: XlsxFill, update: Partial<FillFormatting>): XlsxFill {
    if (!update.type) {
      return current;
    }

    if (update.type === "none") {
      return { type: "none" };
    }
    if (update.type === "solid" && "color" in update && update.color) {
      const hex = (update.color as string).replace(/^#/, "").toUpperCase();
      return {
        type: "pattern",
        pattern: {
          patternType: "solid",
          fgColor: makeXlsxRgbColor(hex),
        },
      };
    }
    // "other" updates are not supported - keep current
    return current;
  },
};
