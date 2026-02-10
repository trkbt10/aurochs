/**
 * @file PPTX text formatting adapter
 *
 * Converts between PPTX RunProperties/MixedRunProperties and
 * the generic TextFormatting type used by shared editor controls.
 */

import type { RunProperties } from "@aurochs-office/pptx/domain/text";
import type { Color } from "@aurochs-office/drawing-ml/domain/color";
import type { Points } from "@aurochs-office/drawing-ml/domain/units";
import { pt } from "@aurochs-office/drawing-ml/domain/units";
import type { FormattingAdapter } from "@aurochs-ui/editor-controls/formatting-adapter";
import type { MixedContext } from "@aurochs-ui/editor-controls/mixed-state";
import type { TextFormatting } from "@aurochs-ui/editor-controls/text";
import type { MixedRunProperties } from "../../editors/text/mixed-properties";
import { isMixed, getExtractionValue } from "../../editors/text/mixed-properties";

/**
 * Extract hex string from DrawingML Color.
 * Falls back to "000000" for non-sRGB colors.
 */
function colorToHex(color: Color | undefined): string | undefined {
  if (!color) {
    return undefined;
  }
  return color.spec.type === "srgb" ? `#${color.spec.value}` : "#000000";
}

/** Resolve underline style based on toggle and current value */
function resolveUnderlineStyle(
  enabled: boolean | undefined,
  current: RunProperties["underline"],
): RunProperties["underline"] {
  if (!enabled) {
    return undefined;
  }
  return current && current !== "none" ? current : "sng";
}

/** Resolve strike style based on toggle and current value */
function resolveStrikeStyle(
  enabled: boolean | undefined,
  current: RunProperties["strike"],
): RunProperties["strike"] {
  if (!enabled) {
    return undefined;
  }
  return current && current !== "noStrike" ? current : "sngStrike";
}

/**
 * Adapter: PPTX RunProperties <-> TextFormatting
 */
export const pptxTextAdapter: FormattingAdapter<RunProperties, TextFormatting> = {
  toGeneric(value: RunProperties): TextFormatting {
    return {
      fontFamily: value.fontFamily ?? undefined,
      fontSize: value.fontSize !== undefined ? (value.fontSize as number) : undefined,
      bold: value.bold ?? undefined,
      italic: value.italic ?? undefined,
      underline: value.underline !== undefined && value.underline !== "none" ? true : undefined,
      strikethrough: value.strike !== undefined && value.strike !== "noStrike" ? true : undefined,
      textColor: colorToHex(value.color),
      highlightColor: colorToHex(value.highlightColor),
      superscript: value.baseline !== undefined && value.baseline > 0 ? true : undefined,
      subscript: value.baseline !== undefined && value.baseline < 0 ? true : undefined,
    };
  },

  applyUpdate(current: RunProperties, update: Partial<TextFormatting>): RunProperties {
    const result = { ...current };

    if ("bold" in update) {
      result.bold = update.bold || undefined;
    }
    if ("italic" in update) {
      result.italic = update.italic || undefined;
    }
    if ("underline" in update) {
      result.underline = resolveUnderlineStyle(update.underline, current.underline);
    }
    if ("strikethrough" in update) {
      result.strike = resolveStrikeStyle(update.strikethrough, current.strike);
    }
    if ("fontSize" in update && update.fontSize !== undefined) {
      result.fontSize = pt(update.fontSize) as Points;
    }
    if ("fontFamily" in update) {
      result.fontFamily = update.fontFamily as RunProperties["fontFamily"];
    }
    if ("superscript" in update) {
      result.baseline = update.superscript ? 30 : update.subscript ? -25 : undefined;
    }
    if ("subscript" in update) {
      result.baseline = update.subscript ? -25 : update.superscript ? 30 : undefined;
    }

    return result;
  },
};

/**
 * Convert PPTX MixedRunProperties to generic MixedContext.
 */
export function pptxMixedRunToContext(mixed: MixedRunProperties | undefined): MixedContext | undefined {
  if (!mixed) {
    return undefined;
  }

  const fields = new Set<string>();

  if (isMixed(mixed.fontFamily)) {
    fields.add("fontFamily");
  }
  if (isMixed(mixed.fontSize)) {
    fields.add("fontSize");
  }
  if (isMixed(mixed.bold)) {
    fields.add("bold");
  }
  if (isMixed(mixed.italic)) {
    fields.add("italic");
  }
  if (isMixed(mixed.underline)) {
    fields.add("underline");
  }
  if (isMixed(mixed.strike)) {
    fields.add("strikethrough");
  }
  if (isMixed(mixed.color)) {
    fields.add("textColor");
  }
  if (isMixed(mixed.highlightColor)) {
    fields.add("highlightColor");
  }
  if (isMixed(mixed.baseline)) {
    fields.add("superscript");
    fields.add("subscript");
  }

  return fields.size > 0 ? { mixedFields: fields } : undefined;
}

/**
 * Convert MixedRunProperties to TextFormatting (using same values).
 */
export function pptxMixedRunToGeneric(mixed: MixedRunProperties): TextFormatting {
  const fontSize = getExtractionValue(mixed.fontSize);
  const fontFamily = getExtractionValue(mixed.fontFamily);
  const bold = getExtractionValue(mixed.bold);
  const italic = getExtractionValue(mixed.italic);
  const underline = getExtractionValue(mixed.underline);
  const strike = getExtractionValue(mixed.strike);
  const color = getExtractionValue(mixed.color);
  const highlight = getExtractionValue(mixed.highlightColor);
  const baseline = getExtractionValue(mixed.baseline);

  return {
    fontFamily: fontFamily ?? undefined,
    fontSize: fontSize !== undefined ? (fontSize as number) : undefined,
    bold: bold ?? undefined,
    italic: italic ?? undefined,
    underline: underline !== undefined && underline !== "none" ? true : undefined,
    strikethrough: strike !== undefined && strike !== "noStrike" ? true : undefined,
    textColor: colorToHex(color),
    highlightColor: colorToHex(highlight),
    superscript: baseline !== undefined && baseline > 0 ? true : undefined,
    subscript: baseline !== undefined && baseline < 0 ? true : undefined,
  };
}
