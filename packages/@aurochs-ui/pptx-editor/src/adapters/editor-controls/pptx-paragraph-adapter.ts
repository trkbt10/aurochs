/**
 * @file PPTX paragraph formatting adapter
 *
 * Converts between PPTX ParagraphProperties/MixedParagraphProperties
 * and the generic ParagraphFormatting type.
 */

import type { ParagraphProperties, LineSpacing } from "@aurochs-office/pptx/domain/text";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type {
  FormattingAdapter,
  ParagraphFormatting,
  HorizontalAlignment,
  MixedContext,
} from "@aurochs-ui/editor-controls/types";
import type { MixedParagraphProperties } from "../../editors/text/mixed-properties";
import { isMixed, getExtractionValue } from "../../editors/text/mixed-properties";

/** Map PPTX TextAlign to generic HorizontalAlignment. */
function toGenericAlign(align: string | undefined): HorizontalAlignment | undefined {
  switch (align) {
    case "l":
      return "left";
    case "ctr":
      return "center";
    case "r":
      return "right";
    case "just":
    case "justLow":
    case "dist":
      return "justify";
    default:
      return undefined;
  }
}

/** Map generic HorizontalAlignment to PPTX TextAlign. */
function toPptxAlign(align: HorizontalAlignment | undefined): string | undefined {
  switch (align) {
    case "left":
      return "l";
    case "center":
      return "ctr";
    case "right":
      return "r";
    case "justify":
      return "just";
    default:
      return undefined;
  }
}

/** Extract line spacing as multiplier from PPTX LineSpacing. */
function lineSpacingToMultiplier(ls: LineSpacing | undefined): number | undefined {
  if (!ls) {
    return undefined;
  }
  if (ls.type === "percent") {
    return (ls.value as number) / 100;
  }
  return undefined; // points-based spacing not representable as multiplier
}

export const pptxParagraphAdapter: FormattingAdapter<ParagraphProperties, ParagraphFormatting> = {
  toGeneric(value: ParagraphProperties): ParagraphFormatting {
    return {
      alignment: toGenericAlign(value.alignment),
      indentLeft: value.marginLeft !== undefined ? (value.marginLeft as number) : undefined,
      indentRight: value.marginRight !== undefined ? (value.marginRight as number) : undefined,
      firstLineIndent: value.indent !== undefined ? (value.indent as number) : undefined,
      spaceBefore: value.spaceBefore ? lineSpacingToMultiplier(value.spaceBefore) : undefined,
      spaceAfter: value.spaceAfter ? lineSpacingToMultiplier(value.spaceAfter) : undefined,
      lineSpacing: lineSpacingToMultiplier(value.lineSpacing),
    };
  },

  applyUpdate(current: ParagraphProperties, update: Partial<ParagraphFormatting>): ParagraphProperties {
    const result = { ...current };

    if ("alignment" in update) {
      result.alignment = toPptxAlign(update.alignment) as ParagraphProperties["alignment"];
    }
    if ("indentLeft" in update) {
      result.marginLeft = update.indentLeft !== undefined ? (px(update.indentLeft) as Pixels) : undefined;
    }
    if ("indentRight" in update) {
      result.marginRight = update.indentRight !== undefined ? (px(update.indentRight) as Pixels) : undefined;
    }
    if ("firstLineIndent" in update) {
      result.indent = update.firstLineIndent !== undefined ? (px(update.firstLineIndent) as Pixels) : undefined;
    }
    if ("lineSpacing" in update && update.lineSpacing !== undefined) {
      result.lineSpacing = { type: "percent", value: update.lineSpacing * 100 } as LineSpacing;
    }

    return result;
  },
};

/**
 * Convert PPTX MixedParagraphProperties to generic MixedContext.
 */
export function pptxMixedParagraphToContext(mixed: MixedParagraphProperties | undefined): MixedContext | undefined {
  if (!mixed) {
    return undefined;
  }

  const fields = new Set<string>();

  if (isMixed(mixed.alignment)) {
    fields.add("alignment");
  }
  if (isMixed(mixed.marginLeft)) {
    fields.add("indentLeft");
  }
  if (isMixed(mixed.marginRight)) {
    fields.add("indentRight");
  }
  if (isMixed(mixed.indent)) {
    fields.add("firstLineIndent");
  }
  if (isMixed(mixed.spaceBefore)) {
    fields.add("spaceBefore");
  }
  if (isMixed(mixed.spaceAfter)) {
    fields.add("spaceAfter");
  }
  if (isMixed(mixed.lineSpacing)) {
    fields.add("lineSpacing");
  }

  return fields.size > 0 ? { mixedFields: fields } : undefined;
}

/**
 * Convert MixedParagraphProperties to ParagraphFormatting.
 */
export function pptxMixedParagraphToGeneric(mixed: MixedParagraphProperties): ParagraphFormatting {
  return {
    alignment: toGenericAlign(getExtractionValue(mixed.alignment) as string | undefined),
    indentLeft: getExtractionValue(mixed.marginLeft) as number | undefined,
    indentRight: getExtractionValue(mixed.marginRight) as number | undefined,
    firstLineIndent: getExtractionValue(mixed.indent) as number | undefined,
    lineSpacing: lineSpacingToMultiplier(getExtractionValue(mixed.lineSpacing)),
  };
}
