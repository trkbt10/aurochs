/**
 * @file DOCX paragraph formatting adapter
 *
 * Converts between DOCX DocxParagraphProperties and the generic ParagraphFormatting type.
 */

import type { DocxParagraphProperties } from "@aurochs-office/docx/domain/paragraph";
import { twips, type Twips } from "@aurochs-office/docx/domain/types";
import type { FormattingAdapter } from "@aurochs-ui/editor-controls/formatting-adapter";
import type { ParagraphFormatting, HorizontalAlignment } from "@aurochs-ui/editor-controls/text";

// =============================================================================
// Helpers
// =============================================================================

function twipsToPointsNum(val: Twips | undefined): number | undefined {
  if (val === undefined) {
    return undefined;
  }
  return (val as number) / 20;
}

function pointsToTwips(pt: number | undefined): Twips | undefined {
  if (pt === undefined) {
    return undefined;
  }
  return twips(Math.round(pt * 20));
}

function jcToAlignment(jc: string | undefined): HorizontalAlignment | undefined {
  switch (jc) {
    case "left":
      return "left";
    case "center":
      return "center";
    case "right":
      return "right";
    case "both":
      return "justify";
    default:
      return undefined;
  }
}

function alignmentToJc(alignment: HorizontalAlignment | undefined): "left" | "center" | "right" | "both" | undefined {
  switch (alignment) {
    case "left":
      return "left";
    case "center":
      return "center";
    case "right":
      return "right";
    case "justify":
      return "both";
    default:
      return undefined;
  }
}

// =============================================================================
// Adapter
// =============================================================================

export const docxParagraphAdapter: FormattingAdapter<DocxParagraphProperties, ParagraphFormatting> = {
  toGeneric(value: DocxParagraphProperties): ParagraphFormatting {
    const ind = value.ind;
    const spacing = value.spacing;

    return {
      alignment: jcToAlignment(value.jc),
      indentLeft: twipsToPointsNum(ind?.left),
      indentRight: twipsToPointsNum(ind?.right),
      firstLineIndent: twipsToPointsNum(ind?.firstLine as Twips | undefined),
      spaceBefore: twipsToPointsNum(spacing?.before),
      spaceAfter: twipsToPointsNum(spacing?.after),
      lineSpacing: spacing?.line !== undefined ? (spacing.line as number) / 240 : undefined,
    };
  },

  applyUpdate(current: DocxParagraphProperties, update: Partial<ParagraphFormatting>): DocxParagraphProperties {
    const result = { ...current };

    if ("alignment" in update) {
      result.jc = alignmentToJc(update.alignment);
    }

    if ("indentLeft" in update || "indentRight" in update || "firstLineIndent" in update) {
      const currentInd = result.ind ?? {};
      result.ind = {
        ...currentInd,
        ...("indentLeft" in update ? { left: pointsToTwips(update.indentLeft) } : {}),
        ...("indentRight" in update ? { right: pointsToTwips(update.indentRight) } : {}),
        ...("firstLineIndent" in update ? { firstLine: pointsToTwips(update.firstLineIndent) } : {}),
      };
    }

    if ("spaceBefore" in update || "spaceAfter" in update || "lineSpacing" in update) {
      const currentSpacing = result.spacing ?? {};
      const spacingUpdate: Record<string, unknown> = { ...currentSpacing };

      if ("spaceBefore" in update) {
        spacingUpdate.before = pointsToTwips(update.spaceBefore);
      }
      if ("spaceAfter" in update) {
        spacingUpdate.after = pointsToTwips(update.spaceAfter);
      }
      if ("lineSpacing" in update && update.lineSpacing !== undefined) {
        spacingUpdate.line = Math.round(update.lineSpacing * 240);
        spacingUpdate.lineRule = "auto";
      }

      result.spacing = spacingUpdate as typeof result.spacing;
    }

    return result;
  },
};
