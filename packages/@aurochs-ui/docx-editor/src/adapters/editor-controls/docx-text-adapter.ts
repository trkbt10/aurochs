/**
 * @file DOCX text formatting adapter
 *
 * Converts between DOCX DocxRunProperties and the generic TextFormatting type.
 */

import type { DocxRunProperties } from "@aurochs-office/docx/domain/run";
import type { FormattingAdapter } from "@aurochs-ui/editor-controls/formatting-adapter";
import type { TextFormatting } from "@aurochs-ui/editor-controls/text";
import { halfPoints } from "@aurochs-office/docx/domain/types";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Convert DOCX sz (half-points) to points.
 */
function szToPoints(sz: number | undefined): number | undefined {
  if (sz === undefined) {
    return undefined;
  }
  return (sz as number) / 2;
}

/**
 * Convert points to DOCX sz (half-points).
 */
function pointsToSz(pt: number | undefined): number | undefined {
  if (pt === undefined) {
    return undefined;
  }
  return pt * 2;
}

/**
 * Extract hex color from DocxRunProperties.color.
 * Returns #RRGGBB format or undefined.
 */
function extractTextColor(rPr: DocxRunProperties): string | undefined {
  const color = rPr.color;
  if (!color) {
    return undefined;
  }
  const val = color.val;
  if (!val || val === "auto") {
    return undefined;
  }
  return `#${val.toUpperCase()}`;
}

/**
 * Extract highlight color as hex.
 */
function extractHighlightColor(rPr: DocxRunProperties): string | undefined {
  const hl = rPr.highlight;
  if (!hl) {
    return undefined;
  }
  const colorMap: Record<string, string> = {
    yellow: "#FFFF00",
    cyan: "#00FFFF",
    magenta: "#FF00FF",
    green: "#00FF00",
    red: "#FF0000",
    blue: "#0000FF",
    darkBlue: "#00008B",
    darkCyan: "#008B8B",
    darkGreen: "#006400",
    darkMagenta: "#8B008B",
    darkRed: "#8B0000",
    darkYellow: "#FFD700",
    darkGray: "#A9A9A9",
    lightGray: "#D3D3D3",
    black: "#000000",
    white: "#FFFFFF",
  };
  return colorMap[hl] ?? undefined;
}

// =============================================================================
// Adapter
// =============================================================================

/**
 * Adapter: DOCX DocxRunProperties <-> TextFormatting
 */
export const docxTextAdapter: FormattingAdapter<DocxRunProperties, TextFormatting> = {
  toGeneric(value: DocxRunProperties): TextFormatting {
    return {
      fontFamily: value.rFonts?.ascii ?? value.rFonts?.eastAsia ?? undefined,
      fontSize: szToPoints(value.sz as number | undefined),
      bold: value.b ?? undefined,
      italic: value.i ?? undefined,
      underline: value.u !== undefined ? true : undefined,
      strikethrough: value.strike ?? undefined,
      textColor: extractTextColor(value),
      highlightColor: extractHighlightColor(value),
      superscript: value.vertAlign === "superscript" ? true : undefined,
      subscript: value.vertAlign === "subscript" ? true : undefined,
    };
  },

  applyUpdate(current: DocxRunProperties, update: Partial<TextFormatting>): DocxRunProperties {
    const result = { ...current };

    if ("fontFamily" in update) {
      if (update.fontFamily) {
        result.rFonts = {
          ...result.rFonts,
          ascii: update.fontFamily,
          hAnsi: update.fontFamily,
        };
      }
    }

    if ("fontSize" in update) {
      const sz = pointsToSz(update.fontSize);
      if (sz !== undefined) {
        result.sz = halfPoints(sz);
        result.szCs = halfPoints(sz);
      }
    }

    if ("bold" in update) {
      result.b = update.bold || undefined;
      result.bCs = update.bold || undefined;
    }

    if ("italic" in update) {
      result.i = update.italic || undefined;
      result.iCs = update.italic || undefined;
    }

    if ("underline" in update) {
      result.u = update.underline ? { val: "single" } : undefined;
    }

    if ("strikethrough" in update) {
      result.strike = update.strikethrough || undefined;
    }

    if ("textColor" in update) {
      if (update.textColor) {
        const hex = update.textColor.replace(/^#/, "").toUpperCase();
        result.color = { val: hex };
      }
    }

    if ("superscript" in update) {
      result.vertAlign = update.superscript ? "superscript" : undefined;
    }

    if ("subscript" in update) {
      result.vertAlign = update.subscript ? "subscript" : undefined;
    }

    return result;
  },
};
