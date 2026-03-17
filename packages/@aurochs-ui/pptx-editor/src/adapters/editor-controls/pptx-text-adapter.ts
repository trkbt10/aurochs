/**
 * @file PPTX text formatting adapter
 *
 * Converts between PPTX RunProperties/MixedRunProperties and
 * the generic TextFormatting type used by shared editor controls.
 */

import type { RunProperties, UnderlineStyle, StrikeStyle, TextCaps } from "@aurochs-office/pptx/domain/text";
import type { Color } from "@aurochs-office/drawing-ml/domain/color";
import type { Points, Pixels } from "@aurochs-office/drawing-ml/domain/units";
import { pt, px } from "@aurochs-office/drawing-ml/domain/units";
import type { FormattingAdapter } from "@aurochs-ui/editor-controls/formatting-adapter";
import type { MixedContext } from "@aurochs-ui/editor-controls/mixed-state";
import type { TextFormatting, StyleOption } from "@aurochs-ui/editor-controls/text";
import type { MixedRunProperties } from "../../editors/text/mixed-properties";
import { isMixed, getExtractionValue } from "../../editors/text/mixed-properties";

// =============================================================================
// PPTX-specific style options
// =============================================================================

export const PPTX_UNDERLINE_OPTIONS: readonly StyleOption[] = [
  { value: "none", label: "None" },
  { value: "sng", label: "Single" },
  { value: "dbl", label: "Double" },
  { value: "heavy", label: "Heavy" },
  { value: "words", label: "Words" },
  { value: "dotted", label: "Dotted" },
  { value: "dash", label: "Dash" },
  { value: "wavy", label: "Wavy" },
];

export const PPTX_STRIKE_OPTIONS: readonly StyleOption[] = [
  { value: "noStrike", label: "None" },
  { value: "sngStrike", label: "Single" },
  { value: "dblStrike", label: "Double" },
];

// =============================================================================
// Helpers
// =============================================================================

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

// =============================================================================
// FormattingAdapter (single RunProperties ↔ TextFormatting)
// =============================================================================

/**
 * Adapter: PPTX RunProperties <-> TextFormatting
 */
export const pptxTextAdapter: FormattingAdapter<RunProperties, TextFormatting> = {
  toGeneric(value: RunProperties): TextFormatting {
    const underlineRaw = value.underline;
    const strikeRaw = value.strike;
    return {
      fontFamily: value.fontFamily ?? undefined,
      fontSize: value.fontSize !== undefined ? (value.fontSize as number) : undefined,
      bold: value.bold ?? undefined,
      italic: value.italic ?? undefined,
      underline: underlineRaw !== undefined && underlineRaw !== "none" ? true : undefined,
      underlineStyle: underlineRaw ?? undefined,
      strikethrough: strikeRaw !== undefined && strikeRaw !== "noStrike" ? true : undefined,
      strikethroughStyle: strikeRaw ?? undefined,
      textColor: colorToHex(value.color),
      highlightColor: colorToHex(value.highlightColor),
      superscript: value.baseline !== undefined && value.baseline > 0 ? true : undefined,
      subscript: value.baseline !== undefined && value.baseline < 0 ? true : undefined,
      caps: value.caps as TextFormatting["caps"] ?? undefined,
      letterSpacing: value.spacing !== undefined ? (value.spacing as number) : undefined,
      baseline: value.baseline ?? undefined,
      kerning: value.kerning !== undefined ? (value.kerning as number) : undefined,
    };
  },

  applyUpdate(current: RunProperties, update: Partial<TextFormatting>): RunProperties {
    return { ...current, ...textFormattingToRunUpdate(update) };
  },
};

// =============================================================================
// MixedRunProperties → TextFormatting + MixedContext
// =============================================================================

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
  const caps = getExtractionValue(mixed.caps);
  const spacing = getExtractionValue(mixed.spacing);
  const kerning = getExtractionValue(mixed.kerning);

  return {
    fontFamily: fontFamily ?? undefined,
    fontSize: fontSize !== undefined ? (fontSize as number) : undefined,
    bold: bold ?? undefined,
    italic: italic ?? undefined,
    underline: underline !== undefined && underline !== "none" ? true : undefined,
    underlineStyle: underline ?? undefined,
    strikethrough: strike !== undefined && strike !== "noStrike" ? true : undefined,
    strikethroughStyle: strike ?? undefined,
    textColor: colorToHex(color),
    highlightColor: colorToHex(highlight),
    superscript: baseline !== undefined && baseline > 0 ? true : undefined,
    subscript: baseline !== undefined && baseline < 0 ? true : undefined,
    caps: caps as TextFormatting["caps"] ?? undefined,
    letterSpacing: spacing !== undefined ? (spacing as number) : undefined,
    baseline: baseline ?? undefined,
    kerning: kerning !== undefined ? (kerning as number) : undefined,
  };
}

/**
 * Convert PPTX MixedRunProperties to generic MixedContext.
 */
export function pptxMixedRunToContext(mixed: MixedRunProperties | undefined): MixedContext | undefined {
  if (!mixed) {
    return undefined;
  }

  const fields = new Set<string>();

  if (isMixed(mixed.fontFamily)) { fields.add("fontFamily"); }
  if (isMixed(mixed.fontSize)) { fields.add("fontSize"); }
  if (isMixed(mixed.bold)) { fields.add("bold"); }
  if (isMixed(mixed.italic)) { fields.add("italic"); }
  if (isMixed(mixed.underline)) { fields.add("underline"); fields.add("underlineStyle"); }
  if (isMixed(mixed.strike)) { fields.add("strikethrough"); fields.add("strikethroughStyle"); }
  if (isMixed(mixed.color)) { fields.add("textColor"); }
  if (isMixed(mixed.highlightColor)) { fields.add("highlightColor"); }
  if (isMixed(mixed.baseline)) { fields.add("superscript"); fields.add("subscript"); fields.add("baseline"); }
  if (isMixed(mixed.caps)) { fields.add("caps"); }
  if (isMixed(mixed.spacing)) { fields.add("letterSpacing"); }
  if (isMixed(mixed.kerning)) { fields.add("kerning"); }

  return fields.size > 0 ? { mixedFields: fields } : undefined;
}

/**
 * Convert a TextFormatting partial update to PPTX RunProperties partial update.
 * Used by MixedRunPropertiesEditor's onChange to bridge generic → PPTX domain.
 */
export function textFormattingToRunUpdate(update: Partial<TextFormatting>): Partial<RunProperties> {
  // Build as mutable record, then return as Partial<RunProperties>.
  // RunProperties fields are readonly, so direct assignment is not allowed.
  const r: Record<string, unknown> = {};

  if ("bold" in update) { r.bold = update.bold || undefined; }
  if ("italic" in update) { r.italic = update.italic || undefined; }

  if ("underlineStyle" in update) {
    r.underline = update.underlineStyle === "none" ? undefined : update.underlineStyle;
  } else if ("underline" in update) {
    r.underline = update.underline ? "sng" : undefined;
  }

  if ("strikethroughStyle" in update) {
    r.strike = update.strikethroughStyle === "none" || update.strikethroughStyle === "noStrike" ? undefined : update.strikethroughStyle;
  } else if ("strikethrough" in update) {
    r.strike = update.strikethrough ? "sngStrike" : undefined;
  }

  if ("fontSize" in update && update.fontSize !== undefined) { r.fontSize = pt(update.fontSize); }
  if ("fontFamily" in update) { r.fontFamily = update.fontFamily; }
  if ("caps" in update) { r.caps = update.caps === "none" ? undefined : update.caps; }

  if ("letterSpacing" in update) {
    r.spacing = update.letterSpacing !== undefined && update.letterSpacing !== 0 ? px(update.letterSpacing) : undefined;
  }
  if ("baseline" in update) {
    r.baseline = update.baseline !== undefined && update.baseline !== 0 ? update.baseline : undefined;
  }
  if ("kerning" in update) {
    r.kerning = update.kerning !== undefined && update.kerning !== 0 ? pt(update.kerning) : undefined;
  }
  if ("superscript" in update) { r.baseline = update.superscript ? 30 : undefined; }
  if ("subscript" in update) { r.baseline = update.subscript ? -25 : undefined; }

  return r as Partial<RunProperties>;
}
