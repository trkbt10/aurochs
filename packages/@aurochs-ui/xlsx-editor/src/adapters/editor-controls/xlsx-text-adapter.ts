/**
 * @file XLSX text formatting adapter
 *
 * Converts between XLSX XlsxFont and the generic TextFormatting type.
 * Only handles RGB colors; theme/indexed colors resolve to undefined.
 */

import type { XlsxFont } from "@aurochs-office/xlsx/domain/style/font";
import type { FormattingAdapter, TextFormatting } from "@aurochs-ui/editor-controls/types";
import { rgbHexFromXlsxColor, makeXlsxRgbColor } from "../../components/format-panel/color-utils";

/**
 * Adapter: XLSX XlsxFont <-> TextFormatting
 */
export const xlsxTextAdapter: FormattingAdapter<XlsxFont, TextFormatting> = {
  toGeneric(value: XlsxFont): TextFormatting {
    const rgbHex = rgbHexFromXlsxColor(value.color);
    return {
      fontFamily: value.name || undefined,
      fontSize: value.size || undefined,
      bold: value.bold ?? undefined,
      italic: value.italic ?? undefined,
      underline: value.underline !== undefined && value.underline !== "none" ? true : undefined,
      strikethrough: value.strikethrough ?? undefined,
      textColor: rgbHex ? `#${rgbHex}` : undefined,
      superscript: value.vertAlign === "superscript" ? true : undefined,
      subscript: value.vertAlign === "subscript" ? true : undefined,
    };
  },

  applyUpdate(current: XlsxFont, update: Partial<TextFormatting>): XlsxFont {
    const parts: Partial<XlsxFont>[] = [current];

    if ("fontFamily" in update && update.fontFamily) {
      parts.push({ name: update.fontFamily });
    }
    if ("fontSize" in update && update.fontSize !== undefined) {
      parts.push({ size: update.fontSize });
    }
    if ("bold" in update) {
      parts.push({ bold: update.bold || undefined });
    }
    if ("italic" in update) {
      parts.push({ italic: update.italic || undefined });
    }
    if ("underline" in update) {
      parts.push({ underline: update.underline ? "single" : "none" });
    }
    if ("strikethrough" in update) {
      parts.push({ strikethrough: update.strikethrough || undefined });
    }
    if ("textColor" in update && update.textColor) {
      const hex = update.textColor.replace(/^#/, "").toUpperCase();
      parts.push({ color: makeXlsxRgbColor(hex) });
    }
    if ("superscript" in update) {
      parts.push({ vertAlign: update.superscript ? "superscript" : "baseline" });
    }
    if ("subscript" in update) {
      parts.push({ vertAlign: update.subscript ? "subscript" : "baseline" });
    }

    return Object.assign({}, ...parts) as XlsxFont;
  },
};
