/**
 * @file Fig text formatting adapter
 *
 * Converts between FigDesignNode.textData and the generic TextFormatting /
 * ParagraphFormatting types used by the shared editor controls
 * (TextFormattingEditor, ParagraphFormattingEditor).
 *
 * This follows the same adapter pattern as pptx-text-adapter.ts:
 * domain type → generic type for UI, generic update → domain updater.
 */

import type { TextData } from "@aurochs/fig/domain";
import type { KiwiEnumValue } from "@aurochs/fig/types";
import type { TextFormatting, ParagraphFormatting, HorizontalAlignment } from "@aurochs-ui/editor-controls/text";

// =============================================================================
// KiwiEnumValue helpers
// =============================================================================

function kiwiName(value: KiwiEnumValue | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : value.name ?? "";
}

function makeKiwiEnum(name: string, value: number): KiwiEnumValue {
  return { value, name } as KiwiEnumValue;
}

// =============================================================================
// TextData → TextFormatting
// =============================================================================

/**
 * Extract generic TextFormatting from fig's TextData.
 */
export function figTextToFormatting(td: TextData): TextFormatting {
  const style = td.fontName.style.toLowerCase();
  return {
    fontFamily: td.fontName.family,
    fontSize: td.fontSize,
    bold: style.includes("bold"),
    italic: style.includes("italic"),
    underline: kiwiName(td.textDecoration) === "UNDERLINE",
    strikethrough: kiwiName(td.textDecoration) === "STRIKETHROUGH",
    letterSpacing: td.letterSpacing?.value,
  };
}

/**
 * Apply a TextFormatting update to TextData, returning the updated TextData.
 */
export function applyFormattingUpdate(td: TextData, update: Partial<TextFormatting>): TextData {
  let result = td;

  if (update.fontFamily !== undefined) {
    result = {
      ...result,
      fontName: { ...result.fontName, family: update.fontFamily },
    };
  }

  if (update.fontSize !== undefined) {
    result = { ...result, fontSize: update.fontSize };
  }

  // Bold/italic: reconstruct fontName.style from toggles.
  // Fig stores font style as a string like "Regular", "Bold", "Bold Italic".
  if (update.bold !== undefined || update.italic !== undefined) {
    const currentStyle = result.fontName.style.toLowerCase();
    const isBold = update.bold ?? currentStyle.includes("bold");
    const isItalic = update.italic ?? currentStyle.includes("italic");
    const parts: string[] = [];
    if (isBold) parts.push("Bold");
    if (isItalic) parts.push("Italic");
    const newStyle = parts.length > 0 ? parts.join(" ") : "Regular";
    result = {
      ...result,
      fontName: { ...result.fontName, style: newStyle },
    };
  }

  if (update.underline !== undefined || update.strikethrough !== undefined) {
    const decoration = update.strikethrough
      ? "STRIKETHROUGH"
      : update.underline
        ? "UNDERLINE"
        : "NONE";
    result = {
      ...result,
      textDecoration: makeKiwiEnum(decoration, decoration === "NONE" ? 0 : decoration === "UNDERLINE" ? 1 : 2),
    };
  }

  if (update.letterSpacing !== undefined) {
    result = {
      ...result,
      letterSpacing: result.letterSpacing
        ? { ...result.letterSpacing, value: update.letterSpacing }
        : { value: update.letterSpacing, units: { value: 0, name: "PIXELS" } },
    };
  }

  return result;
}

// =============================================================================
// TextData → ParagraphFormatting
// =============================================================================

const H_ALIGN_MAP: Record<string, HorizontalAlignment> = {
  LEFT: "left",
  CENTER: "center",
  RIGHT: "right",
  JUSTIFIED: "justify",
};

const H_ALIGN_REVERSE: Record<string, { name: string; value: number }> = {
  left: { name: "LEFT", value: 0 },
  center: { name: "CENTER", value: 1 },
  right: { name: "RIGHT", value: 2 },
  justify: { name: "JUSTIFIED", value: 3 },
};

/**
 * Extract generic ParagraphFormatting from fig's TextData.
 */
export function figTextToParagraphFormatting(td: TextData): ParagraphFormatting {
  const hAlign = kiwiName(td.textAlignHorizontal);
  const lineHeight = td.lineHeight;

  return {
    alignment: H_ALIGN_MAP[hAlign] ?? "left",
    lineSpacing: lineHeight ? lineHeight.value / td.fontSize : undefined,
  };
}

/**
 * Apply a ParagraphFormatting update to TextData.
 */
export function applyParagraphUpdate(td: TextData, update: Partial<ParagraphFormatting>): TextData {
  let result = td;

  if (update.alignment !== undefined) {
    const mapped = H_ALIGN_REVERSE[update.alignment];
    if (mapped) {
      result = {
        ...result,
        textAlignHorizontal: makeKiwiEnum(mapped.name, mapped.value),
      };
    }
  }

  if (update.lineSpacing !== undefined) {
    const lineHeightValue = update.lineSpacing * result.fontSize;
    result = {
      ...result,
      lineHeight: result.lineHeight
        ? { ...result.lineHeight, value: lineHeightValue }
        : { value: lineHeightValue, units: { value: 0, name: "PIXELS" } },
    };
  }

  return result;
}

// =============================================================================
// textAutoResize helpers
// =============================================================================

export type FigTextAutoResize = "WIDTH_AND_HEIGHT" | "HEIGHT" | "NONE";

const AUTO_RESIZE_VALUES: Record<FigTextAutoResize, number> = {
  WIDTH_AND_HEIGHT: 0,
  HEIGHT: 1,
  NONE: 2,
};

export function getAutoResize(td: TextData): FigTextAutoResize {
  const name = kiwiName(td.textAutoResize);
  if (name === "HEIGHT" || name === "NONE") return name;
  return "WIDTH_AND_HEIGHT";
}

export function makeAutoResizeEnum(mode: FigTextAutoResize): KiwiEnumValue {
  return makeKiwiEnum(mode, AUTO_RESIZE_VALUES[mode]);
}
