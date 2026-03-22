/**
 * @file Adapters for react-editor-ui paragraph sections
 *
 * Converts between PPTX MixedParagraphProperties and react-editor-ui data types.
 * Types are defined locally to match react-editor-ui's structural expectations.
 */

import type { ParagraphProperties, LineSpacing, BulletStyle } from "@aurochs-office/pptx/domain/text";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { Pixels, Percent, Points } from "@aurochs-office/drawing-ml/domain/units";
import type { TextJustifyData, ParagraphSpacingData, IndentData, ListData } from "@aurochs-ui/editor-core/adapter-types";
import type { MixedParagraphProperties } from "../../text/mixed-properties";
import { getExtractionValue } from "../../text/mixed-properties";

// =============================================================================
// TextJustify adapter
// =============================================================================

/** Convert MixedParagraphProperties to TextJustifyData for react-editor-ui TextJustify section. */
export function mixedParagraphToTextJustify(mixed: MixedParagraphProperties): TextJustifyData {
  const alignment = getExtractionValue(mixed.alignment);

  const alignMap: Record<string, TextJustifyData["align"]> = {
    l: "left",
    ctr: "center",
    r: "right",
    just: "justify",
    justLow: "justify",
    dist: "justify",
    thaiDist: "justify",
  };

  return {
    align: alignment ? (alignMap[alignment] ?? "left") : "left",
  };
}

/** Convert TextJustifyData back to a partial ParagraphProperties update for applying alignment changes. */
export function textJustifyToParagraphUpdate(data: TextJustifyData): Partial<ParagraphProperties> {
  const alignMap: Record<string, string> = {
    left: "l",
    center: "ctr",
    right: "r",
    justify: "just",
    "justify-left": "just",
    "justify-center": "just",
    "justify-all": "just",
  };

  return { alignment: alignMap[data.align] } as Partial<ParagraphProperties>;
}

// =============================================================================
// ParagraphSpacing adapter
// =============================================================================

function lineSpacingToString(ls: LineSpacing | undefined): string {
  if (!ls) { return "0 pt"; }
  if (ls.type === "percent") { return `${(ls.value as number) / 1000}%`; }
  if (ls.type === "points") { return `${(ls.value as number) / 100} pt`; }
  return "0 pt";
}

function parseSpacingValue(str: string): LineSpacing | undefined {
  const trimmed = str.trim();
  if (trimmed.endsWith("%")) {
    const val = parseFloat(trimmed);
    if (!Number.isNaN(val)) {
      return { type: "percent", value: (val * 1000) as Percent };
    }
  }
  const ptMatch = trimmed.match(/^([\d.]+)\s*pt$/i);
  if (ptMatch) {
    const val = parseFloat(ptMatch[1]);
    if (!Number.isNaN(val)) {
      return { type: "points", value: (val * 100) as Points };
    }
  }
  return undefined;
}

/** Convert MixedParagraphProperties to ParagraphSpacingData for react-editor-ui ParagraphSpacing section. */
export function mixedParagraphToSpacing(mixed: MixedParagraphProperties): ParagraphSpacingData {
  const spaceBefore = getExtractionValue(mixed.spaceBefore);
  const spaceAfter = getExtractionValue(mixed.spaceAfter);

  return {
    before: lineSpacingToString(spaceBefore),
    after: lineSpacingToString(spaceAfter),
    hyphenate: false,
  };
}

/** Convert ParagraphSpacingData back to a partial ParagraphProperties update for applying spacing changes. */
export function spacingToParagraphUpdate(data: ParagraphSpacingData): Partial<ParagraphProperties> {
  const update: Record<string, unknown> = {};

  const before = parseSpacingValue(data.before);
  if (before) { update.spaceBefore = before; }

  const after = parseSpacingValue(data.after);
  if (after) { update.spaceAfter = after; }

  return update as Partial<ParagraphProperties>;
}

// =============================================================================
// Indent adapter
// =============================================================================

function pixelsToString(value: Pixels | undefined): string {
  if (value === undefined) { return "0 pt"; }
  return `${value as number} pt`;
}

function parsePixels(str: string): Pixels | undefined {
  const match = str.trim().match(/^([\d.-]+)\s*pt$/i);
  if (match) {
    const val = parseFloat(match[1]);
    if (!Number.isNaN(val)) { return px(val); }
  }
  return undefined;
}

/** Convert MixedParagraphProperties to IndentData for react-editor-ui Indent section. */
export function mixedParagraphToIndent(mixed: MixedParagraphProperties): IndentData {
  const marginLeft = getExtractionValue(mixed.marginLeft);
  const marginRight = getExtractionValue(mixed.marginRight);
  const indent = getExtractionValue(mixed.indent);

  return {
    left: pixelsToString(marginLeft),
    right: pixelsToString(marginRight),
    firstLine: pixelsToString(indent),
  };
}

/** Convert IndentData back to a partial ParagraphProperties update for applying indent changes. */
export function indentToParagraphUpdate(data: IndentData): Partial<ParagraphProperties> {
  const update: Record<string, unknown> = {};

  const left = parsePixels(data.left);
  if (left !== undefined) { update.marginLeft = left; }

  const right = parsePixels(data.right);
  if (right !== undefined) { update.marginRight = right; }

  const firstLine = parsePixels(data.firstLine);
  if (firstLine !== undefined) { update.indent = firstLine; }

  return update as Partial<ParagraphProperties>;
}

// =============================================================================
// List adapter
// =============================================================================

/** Convert MixedParagraphProperties to ListData for react-editor-ui List section. */
export function mixedParagraphToList(mixed: MixedParagraphProperties): ListData {
  const bulletStyle = getExtractionValue(mixed.bulletStyle);

  if (!bulletStyle) {
    return { type: "none", style: "" };
  }

  const bulletType = bulletStyle.bullet.type;

  if (bulletType === "none") {
    return { type: "none", style: "" };
  }

  if (bulletType === "auto") {
    return { type: "numbered", style: "decimal" };
  }

  return { type: "bulleted", style: "disc" };
}

/** Convert ListData back to a partial ParagraphProperties update for applying list style changes. */
export function listToParagraphUpdate(data: ListData): Partial<ParagraphProperties> {
  const makeBulletStyle = (bullet: BulletStyle["bullet"]): BulletStyle => ({
    bullet,
    colorFollowText: true,
    sizeFollowText: true,
    fontFollowText: true,
  });

  if (data.type === "none") {
    return { bulletStyle: makeBulletStyle({ type: "none" }) };
  }

  if (data.type === "numbered") {
    return { bulletStyle: makeBulletStyle({ type: "auto", scheme: "arabicPeriod" }) };
  }

  return { bulletStyle: makeBulletStyle({ type: "char", char: "\u2022" }) };
}
