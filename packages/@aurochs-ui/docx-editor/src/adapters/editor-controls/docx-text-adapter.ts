/**
 * @file DOCX text formatting adapter
 *
 * Converts between DOCX DocxRunProperties and the generic TextFormatting type.
 */

import type { DocxRunProperties } from "@aurochs-office/docx/domain/run";
import type { HalfPoints } from "@aurochs-office/docx/domain/types";
import type { FormattingAdapter } from "@aurochs-ui/editor-controls/formatting-adapter";
import type { TextFormatting } from "@aurochs-ui/editor-controls/text";

/**
 * Adapter: DOCX DocxRunProperties <-> TextFormatting
 */
export const docxTextAdapter: FormattingAdapter<DocxRunProperties, TextFormatting> = {
  toGeneric(value: DocxRunProperties): TextFormatting {
    return {
      fontFamily: value.rFonts?.ascii ?? value.rFonts?.hAnsi ?? undefined,
      fontSize: value.sz ? value.sz / 2 : undefined,
      bold: value.b ?? undefined,
      italic: value.i ?? undefined,
      underline: value.u !== undefined ? true : undefined,
      strikethrough: value.strike ?? undefined,
      textColor: value.color?.val ? `#${value.color.val}` : undefined,
      superscript: value.vertAlign === "superscript" ? true : undefined,
      subscript: value.vertAlign === "subscript" ? true : undefined,
    };
  },

  applyUpdate(current: DocxRunProperties, update: Partial<TextFormatting>): DocxRunProperties {
    const parts: Partial<DocxRunProperties>[] = [current];

    if ("bold" in update) {
      parts.push({ b: update.bold ?? undefined });
    }
    if ("italic" in update) {
      parts.push({ i: update.italic ?? undefined });
    }
    if ("underline" in update) {
      parts.push({ u: update.underline ? { val: "single" as const } : undefined });
    }
    if ("strikethrough" in update) {
      parts.push({ strike: update.strikethrough ?? undefined });
    }
    if ("fontSize" in update && update.fontSize !== undefined) {
      const hp = (update.fontSize * 2) as HalfPoints;
      parts.push({ sz: hp, szCs: hp });
    }
    if ("fontFamily" in update && update.fontFamily) {
      parts.push({
        rFonts: {
          ...current.rFonts,
          ascii: update.fontFamily,
          hAnsi: update.fontFamily,
          eastAsia: update.fontFamily,
          cs: update.fontFamily,
        },
      });
    }
    if ("textColor" in update && update.textColor) {
      const hex = update.textColor.replace(/^#/, "");
      parts.push({ color: { val: hex } });
    }
    if ("superscript" in update) {
      parts.push({ vertAlign: update.superscript ? "superscript" : "baseline" });
    }
    if ("subscript" in update) {
      parts.push({ vertAlign: update.subscript ? "subscript" : "baseline" });
    }

    return Object.assign({}, ...parts) as DocxRunProperties;
  },
};
