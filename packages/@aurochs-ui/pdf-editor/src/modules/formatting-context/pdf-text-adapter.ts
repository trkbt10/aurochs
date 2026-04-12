/**
 * @file PDF text formatting adapter
 *
 * Converts between PdfText element properties and the
 * generic TextFormatting type used by shared editor controls.
 */

import type { PdfText } from "@aurochs/pdf";
import { withFontFamily, withFontSize, withCharSpacing } from "@aurochs/pdf";
import type { FormattingAdapter } from "@aurochs-ui/editor-controls/formatting-adapter";
import type { TextFormatting } from "@aurochs-ui/editor-controls/text";

/**
 * Extract hex color string from PdfColor (colorSpace + components).
 */
function pdfFillColorToHex(gs: PdfText["graphicsState"]): string | undefined {
  const { colorSpace, components } = gs.fillColor;
  if (colorSpace === "DeviceRGB" && components.length >= 3) {
    const r = Math.round(components[0] * 255).toString(16).padStart(2, "0");
    const g = Math.round(components[1] * 255).toString(16).padStart(2, "0");
    const b = Math.round(components[2] * 255).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  }
  if (colorSpace === "DeviceGray" && components.length >= 1) {
    const v = Math.round(components[0] * 255).toString(16).padStart(2, "0");
    return `#${v}${v}${v}`;
  }
  return undefined;
}

/**
 * Adapter: PdfText <-> TextFormatting
 *
 * PDF text elements have limited formatting — font name, size, bold/italic,
 * color, and character spacing. No underline/strikethrough/caps in PDF domain.
 */
export const pdfTextAdapter: FormattingAdapter<PdfText, TextFormatting> = {
  toGeneric(value: PdfText): TextFormatting {
    return {
      fontFamily: value.baseFont ?? value.fontName,
      fontSize: value.fontSize,
      bold: value.isBold,
      italic: value.isItalic,
      textColor: pdfFillColorToHex(value.graphicsState),
      letterSpacing: value.charSpacing,
    };
  },

  applyUpdate(current: PdfText, update: Partial<TextFormatting>): PdfText {
    const operations: ReadonlyArray<(el: PdfText) => PdfText> = [
      (el) => "fontSize" in update && update.fontSize !== undefined ? withFontSize(el, update.fontSize) : el,
      (el) => "letterSpacing" in update ? withCharSpacing(el, update.letterSpacing) : el,
      (el) => "fontFamily" in update && update.fontFamily !== undefined ? withFontFamily(el, update.fontFamily) : el,
    ];
    return operations.reduce((el, op) => op(el), current);
  },
};
