/**
 * @file Convert Fig text data to PPTX TextBody
 *
 * Figma's text model stores per-character styling via:
 * - characterStyleIDs: each character maps to a style override ID (0 = base)
 * - styleOverrideTable: array of style overrides indexed by styleID
 *
 * PPTX text is deeply structured: TextBody → Paragraph[] → TextRun[].
 *
 * When characterStyleIDs are present, we reconstruct the per-run structure
 * by grouping consecutive characters with the same style ID into runs.
 * Otherwise, we split the text on newlines into paragraphs, each
 * containing a single run with the node's base font properties.
 */

import type { TextData, TextStyleOverride } from "@aurochs/fig/domain";
import type { FigPaint, FigColor } from "@aurochs/fig/types";
import type { TextBody, RegularRun, Paragraph, RunProperties } from "@aurochs-office/pptx/domain/text";
import { pt } from "@aurochs-office/drawing-ml/domain/units";
import type { TextAlign, TextAnchor, ParagraphProperties } from "@aurochs-office/pptx/domain/text";
import { figColorToColor } from "@aurochs-converters/interop-drawing-ml/fig-to-dml";

/**
 * Convert Fig TextData to a PPTX TextBody.
 *
 * If characterStyleIDs are present, the per-run structure is faithfully
 * reconstructed from style overrides. Otherwise, each line gets a single run.
 */
export function convertText(textData: TextData): TextBody {
  const align = convertTextAlign(textData.textAlignHorizontal);
  const anchor = convertTextAnchor(textData.textAlignVertical);

  const paragraphs = textData.characterStyleIDs && textData.characterStyleIDs.length > 0
    ? buildParagraphsFromStyleIDs(textData, align)
    : buildSimpleParagraphs(textData, align);

  return {
    bodyProperties: {
      anchor,
      wrapping: "square",
      autoFit: convertAutoFit(textData.textAutoResize),
    },
    paragraphs,
  };
}

/**
 * Build paragraphs from flat text with no per-character variation.
 * Each line gets a single run with the base style.
 */
function buildSimpleParagraphs(textData: TextData, align: TextAlign | undefined): Paragraph[] {
  const lines = textData.characters.split("\n");
  return lines.map((line) => ({
    properties: { alignment: align } satisfies ParagraphProperties,
    runs: [{
      type: "text" as const,
      text: line,
      properties: baseRunProperties(textData),
    }],
  }));
}

/**
 * Build paragraphs from characterStyleIDs, grouping consecutive characters
 * with the same style ID into runs. Paragraph boundaries are at "\n".
 */
function buildParagraphsFromStyleIDs(
  textData: TextData,
  align: TextAlign | undefined,
): Paragraph[] {
  const chars = textData.characters;
  const styleIDs = textData.characterStyleIDs!;
  const overrideMap = buildOverrideMap(textData.styleOverrideTable);

  const paragraphs: Paragraph[] = [];
  let paraStart = 0;

  for (let i = 0; i <= chars.length; i++) {
    // Paragraph boundary at "\n" or end of string
    if (i === chars.length || chars[i] === "\n") {
      const runs = buildRunsForRange(chars, styleIDs, paraStart, i, textData, overrideMap);
      paragraphs.push({
        properties: { alignment: align } satisfies ParagraphProperties,
        runs,
      });
      paraStart = i + 1; // skip the "\n"
    }
  }

  return paragraphs;
}

/**
 * Build runs for a character range [start, end) by grouping consecutive
 * characters with the same style ID.
 */
function buildRunsForRange(
  chars: string,
  styleIDs: readonly number[],
  start: number,
  end: number,
  textData: TextData,
  overrideMap: ReadonlyMap<number, TextStyleOverride>,
): RegularRun[] {
  if (start >= end) {
    // Empty line — still needs a run (PPTX requires at least one run per paragraph)
    return [{
      type: "text",
      text: "",
      properties: baseRunProperties(textData),
    }];
  }

  const runs: RegularRun[] = [];
  let runStart = start;
  let currentStyleID = styleIDs[start] ?? 0;

  for (let i = start + 1; i <= end; i++) {
    const sid = i < end ? (styleIDs[i] ?? 0) : -1; // sentinel to flush last run
    if (sid !== currentStyleID) {
      runs.push({
        type: "text",
        text: chars.slice(runStart, i),
        properties: resolveRunProperties(currentStyleID, textData, overrideMap),
      });
      runStart = i;
      currentStyleID = sid;
    }
  }

  return runs;
}

/**
 * Build a lookup map from styleID to TextStyleOverride.
 */
function buildOverrideMap(
  table: readonly TextStyleOverride[] | undefined,
): ReadonlyMap<number, TextStyleOverride> {
  const map = new Map<number, TextStyleOverride>();
  if (table) {
    for (const entry of table) {
      map.set(entry.styleID, entry);
    }
  }
  return map;
}

/**
 * Resolve RunProperties for a given style ID.
 *
 * ID 0 = base style (from TextData's top-level fields).
 * ID > 0 = look up in styleOverrideTable, using TextData as fallback.
 */
function resolveRunProperties(
  styleID: number,
  textData: TextData,
  overrideMap: ReadonlyMap<number, TextStyleOverride>,
): RunProperties {
  if (styleID === 0) {
    return baseRunProperties(textData);
  }

  const override = overrideMap.get(styleID);
  if (!override) {
    // Unknown style ID — fall back to base
    return baseRunProperties(textData);
  }

  const fontName = override.fontName ?? textData.fontName;
  const fontSize = override.fontSize ?? textData.fontSize;

  const props: RunProperties = {
    fontSize: pt(fontSize),
    fontFamily: fontName.family,
    bold: isBoldStyle(fontName.style),
    italic: isItalicStyle(fontName.style),
    color: resolveOverrideColor(override, textData),
  };

  if (override.textDecoration) {
    const dec = override.textDecoration;
    if (dec.name === "UNDERLINE") {
      return { ...props, underline: "sng" };
    }
    if (dec.name === "STRIKETHROUGH") {
      return { ...props, strike: "sngStrike" };
    }
  }

  return props;
}

/**
 * Build RunProperties from the base TextData style.
 */
function baseRunProperties(textData: TextData): RunProperties {
  return {
    fontSize: pt(textData.fontSize),
    fontFamily: textData.fontName.family,
    bold: isBoldStyle(textData.fontName.style),
    italic: isItalicStyle(textData.fontName.style),
  };
}

/**
 * Resolve the color from a style override's fillPaints.
 *
 * In Figma, text color is the first visible SOLID fillPaint.
 * We convert it back to a DrawingML Color for PPTX.
 */
function resolveOverrideColor(
  override: TextStyleOverride,
  textData: TextData,
): ReturnType<typeof figColorToColor> | undefined {
  const paints = override.fillPaints;
  if (!paints || paints.length === 0) return undefined;

  const solidPaint = paints.find((p): p is Extract<FigPaint, { type: "SOLID" }> =>
    p.type === "SOLID" && p.visible !== false,
  );
  if (!solidPaint?.color) return undefined;

  const figColor: FigColor = {
    r: solidPaint.color.r,
    g: solidPaint.color.g,
    b: solidPaint.color.b,
    a: solidPaint.opacity ?? solidPaint.color.a,
  };

  return figColorToColor(figColor);
}

function convertTextAlign(align?: { name: string }): TextAlign | undefined {
  if (!align) return undefined;
  switch (align.name) {
    case "LEFT": return "left";
    case "CENTER": return "center";
    case "RIGHT": return "right";
    case "JUSTIFIED": return "justify";
    default: return undefined;
  }
}

function convertTextAnchor(align?: { name: string }): TextAnchor | undefined {
  if (!align) return undefined;
  switch (align.name) {
    case "TOP": return "top";
    case "CENTER": return "center";
    case "BOTTOM": return "bottom";
    default: return undefined;
  }
}

function convertAutoFit(autoResize?: { name: string }): { type: "none" } | { type: "normal" } | { type: "shape" } {
  if (!autoResize) {
    // Figma's default TextAutoResize is WIDTH_AND_HEIGHT (enum value 1),
    // which means the text box resizes to fit the text content.
    // In PPTX, spAutoFit is the closest equivalent.
    return { type: "shape" };
  }
  switch (autoResize.name) {
    case "WIDTH_AND_HEIGHT": return { type: "shape" };
    case "HEIGHT": return { type: "normal" };
    case "NONE": return { type: "none" };
    default: return { type: "shape" };
  }
}

function isBoldStyle(style: string): boolean {
  const lower = style.toLowerCase();
  return lower.includes("bold") || lower.includes("black") || lower.includes("heavy");
}

function isItalicStyle(style: string): boolean {
  const lower = style.toLowerCase();
  return lower.includes("italic") || lower.includes("oblique");
}
