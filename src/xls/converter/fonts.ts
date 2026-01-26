/**
 * @file XLS FONT → XLSX font mapping
 */

import type { XlsxFont } from "../../xlsx/domain/style/font";
import type { XlsFont } from "../domain/types";
import { convertXlsColorIndexToXlsxColor } from "./colors";

function mapUnderline(uls: number): XlsxFont["underline"] | undefined {
  switch (uls) {
    case 0:
      return undefined;
    case 1:
      return "single";
    case 2:
      return "double";
    case 33:
      return "singleAccounting";
    case 34:
      return "doubleAccounting";
    default:
      return undefined;
  }
}

function mapScript(sss: number): XlsxFont["vertAlign"] | undefined {
  switch (sss) {
    case 0:
      return undefined;
    case 1:
      return "superscript";
    case 2:
      return "subscript";
    default:
      return undefined;
  }
}

/** Convert XLS font records into XLSX font entries. */
export function convertXlsFontsToXlsxFonts(fonts: readonly XlsFont[]): readonly XlsxFont[] {
  if (!Array.isArray(fonts)) {
    throw new Error("convertXlsFontsToXlsxFonts: fonts must be an array");
  }

  if (fonts.length === 0) {
    // Fallback to conventional default font.
    return [{ name: "Calibri", size: 11, scheme: "minor" }];
  }

  return fonts.map((f) => ({
    name: f.name || "Calibri",
    size: f.heightTwips / 20,
    ...(f.weight >= 700 ? { bold: true } : {}),
    ...(f.isItalic ? { italic: true } : {}),
    ...(f.isStrikeout ? { strikethrough: true } : {}),
    ...(f.isOutline ? { outline: true } : {}),
    ...(f.isShadow ? { shadow: true } : {}),
    ...(mapUnderline(f.underline) ? { underline: mapUnderline(f.underline) } : {}),
    ...(mapScript(f.script) ? { vertAlign: mapScript(f.script) } : {}),
    ...(f.family !== 0 ? { family: f.family } : {}),
    ...(f.colorIndex !== 0 ? { color: convertXlsColorIndexToXlsxColor(f.colorIndex) } : {}),
  }));
}
