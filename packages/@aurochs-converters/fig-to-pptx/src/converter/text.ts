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
import type { FigPaint, FigColor, KiwiEnumValue } from "@aurochs/fig/types";
import type { TextBody, RegularRun, Paragraph, RunProperties, LineSpacing, TextCaps } from "@aurochs-office/pptx/domain/text";
import type { Color } from "@aurochs-office/drawing-ml/domain/color";
import { pt, pct, px } from "@aurochs-office/drawing-ml/domain/units";
import type { TextAlign, TextAnchor, ParagraphProperties } from "@aurochs-office/pptx/domain/text";
import { figColorToColor } from "@aurochs-converters/interop-drawing-ml/fig-to-dml";

/**
 * Convert Fig TextData to a PPTX TextBody.
 *
 * If characterStyleIDs are present, the per-run structure is faithfully
 * reconstructed from style overrides. Otherwise, each line gets a single run.
 *
 * @param textData - The Fig text data
 * @param nodeFills - The TEXT node's `fills` array.  In Figma, a TEXT node's
 *   fills represent the **text color** (not the shape background).  We extract
 *   the first visible SOLID paint and apply it as the base run color.
 */
export function convertText(textData: TextData, nodeFills?: readonly FigPaint[]): TextBody {
  const align = convertTextAlign(textData.textAlignHorizontal);
  const anchor = convertTextAnchor(textData.textAlignVertical);
  const lineSpacing = convertLineHeight(textData.lineHeight);
  const baseTextColor = resolveTextColor(nodeFills);

  const hasStyleIDs = textData.characterStyleIDs && textData.characterStyleIDs.length > 0;
  const paragraphs = hasStyleIDs
    ? buildParagraphsFromStyleIDs(textData, align, lineSpacing, baseTextColor)
    : buildSimpleParagraphs(textData, align, lineSpacing, baseTextColor);

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
function buildSimpleParagraphs(
  textData: TextData,
  align: TextAlign | undefined,
  lineSpacing: LineSpacing | undefined,
  baseTextColor: Color | undefined,
): Paragraph[] {
  const lines = textData.characters.split("\n");
  return lines.map((line) => ({
    properties: { alignment: align, lineSpacing } satisfies ParagraphProperties,
    runs: [{
      type: "text" as const,
      text: line,
      properties: baseRunProperties(textData, baseTextColor),
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
  lineSpacing: LineSpacing | undefined,
  baseTextColor: Color | undefined,
): Paragraph[] {
  const chars = textData.characters;
  const styleIDs = textData.characterStyleIDs!;
  const overrideMap = buildOverrideMap(textData.styleOverrideTable);

  const paragraphs: Paragraph[] = [];
  // eslint-disable-next-line no-restricted-syntax -- mutable index tracking paragraph start within loop
  let paraStart = 0;

  for (let i = 0; i <= chars.length; i++) {
    // Paragraph boundary at "\n" or end of string
    if (i === chars.length || chars[i] === "\n") {
      const runs = buildRunsForRange({ chars, styleIDs, start: paraStart, end: i, textData, overrideMap, baseTextColor });
      paragraphs.push({
        properties: { alignment: align, lineSpacing } satisfies ParagraphProperties,
        runs,
      });
      paraStart = i + 1; // skip the "\n"
    }
  }

  return paragraphs;
}

type BuildRunsForRangeOptions = {
  readonly chars: string;
  readonly styleIDs: readonly number[];
  readonly start: number;
  readonly end: number;
  readonly textData: TextData;
  readonly overrideMap: ReadonlyMap<number, TextStyleOverride>;
  readonly baseTextColor: Color | undefined;
};

/**
 * Build runs for a character range [start, end) by grouping consecutive
 * characters with the same style ID.
 */
function buildRunsForRange(
  { chars, styleIDs, start, end, textData, overrideMap, baseTextColor }: BuildRunsForRangeOptions,
): RegularRun[] {
  if (start >= end) {
    // Empty line — still needs a run (PPTX requires at least one run per paragraph)
    return [{
      type: "text",
      text: "",
      properties: baseRunProperties(textData, baseTextColor),
    }];
  }

  const runs: RegularRun[] = [];
  // eslint-disable-next-line no-restricted-syntax -- mutable index tracking run start within loop
  let runStart = start;
  // eslint-disable-next-line no-restricted-syntax -- mutable cursor tracking current style across characters
  let currentStyleID = styleIDs[start] ?? 0;

  for (let i = start + 1; i <= end; i++) {
    const sid = i < end ? (styleIDs[i] ?? 0) : -1; // sentinel to flush last run
    if (sid !== currentStyleID) {
      runs.push({
        type: "text",
        text: chars.slice(runStart, i),
        properties: resolveRunProperties(currentStyleID, textData, overrideMap, baseTextColor),
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
  baseTextColor: Color | undefined,
): RunProperties {
  if (styleID === 0) {
    return baseRunProperties(textData, baseTextColor);
  }

  const override = overrideMap.get(styleID);
  if (!override) {
    // Unknown style ID — fall back to base
    return baseRunProperties(textData, baseTextColor);
  }

  const fontName = override.fontName ?? textData.fontName;
  const fontSize = override.fontSize ?? textData.fontSize;

  // Text color resolution: override fillPaints → base text color (node fills).
  // Both are FigPaint[] arrays resolved through the same SoT (resolveTextColor).
  const color = resolveTextColor(override.fillPaints) ?? baseTextColor;

  const props: RunProperties = {
    fontSize: pt(fontSize),
    fontFamily: fontName.family,
    bold: isBoldStyle(fontName.style),
    italic: isItalicStyle(fontName.style),
    color,
    spacing: convertLetterSpacing(override.letterSpacing ?? textData.letterSpacing, fontSize),
    caps: convertTextCase(override.textCase ?? textData.textCase),
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
function baseRunProperties(textData: TextData, baseTextColor?: Color): RunProperties {
  return {
    fontSize: pt(textData.fontSize),
    fontFamily: textData.fontName.family,
    bold: isBoldStyle(textData.fontName.style),
    italic: isItalicStyle(textData.fontName.style),
    color: baseTextColor,
    spacing: convertLetterSpacing(textData.letterSpacing, textData.fontSize),
    caps: convertTextCase(textData.textCase),
  };
}

/**
 * Resolve text color from a FigPaint[] array.
 *
 * In Figma, text color is determined by the topmost visible SOLID paint
 * in a fills/fillPaints array.  This is the single source of truth for
 * text color resolution — used for both:
 *   - TEXT node's `fills` (base text color)
 *   - TextStyleOverride's `fillPaints` (per-character override color)
 *
 * Returns `undefined` when no visible solid paint exists (the caller
 * should fall back to the next layer in the cascade, or to the PPTX
 * theme default).
 */
function resolveTextColor(paints: readonly FigPaint[] | undefined): Color | undefined {
  if (!paints || paints.length === 0) {return undefined;}

  for (let i = paints.length - 1; i >= 0; i--) {
    const paint = paints[i];
    if (paint.visible === false) {continue;}
    const typeName = typeof paint.type === "string" ? paint.type : (paint.type as { name: string }).name;
    if (typeName === "SOLID" && paint.color) {
      const figColor: FigColor = {
        r: paint.color.r,
        g: paint.color.g,
        b: paint.color.b,
        a: (paint.opacity ?? 1) * paint.color.a,
      };
      return figColorToColor(figColor);
    }
  }

  return undefined;
}

function convertTextAlign(align?: { name: string }): TextAlign | undefined {
  if (!align) {return undefined;}
  switch (align.name) {
    case "LEFT": return "left";
    case "CENTER": return "center";
    case "RIGHT": return "right";
    case "JUSTIFIED": return "justify";
    default: return undefined;
  }
}

function convertTextAnchor(align?: { name: string }): TextAnchor | undefined {
  if (!align) {return undefined;}
  switch (align.name) {
    case "TOP": return "top";
    case "CENTER": return "center";
    case "BOTTOM": return "bottom";
    default: return undefined;
  }
}

/**
 * Convert Figma textAutoResize to PPTX autoFit.
 *
 * Figma's textAutoResize controls how the text box resizes in the editor:
 *   - WIDTH_AND_HEIGHT: box resizes to fit text in both dimensions
 *   - HEIGHT: width is fixed, height resizes to fit text
 *   - NONE: box size is fixed, text may overflow
 *
 * The .fig file already stores the **computed** box size after auto-resize,
 * so the PPTX text box should preserve that size exactly.  Using PPTX's
 * `normAutofit` (shrink font to fit) or `spAutoFit` (resize shape) would
 * fight the intended size — especially inside a grpSp where the group's
 * childExtent/extent ratio already handles visual scaling.
 *
 * Therefore all modes map to `noAutofit` ("none"): the box stays at the
 * size computed by Figma, and grpSp scaling handles the visual fit.
 */
function convertAutoFit(_autoResize?: { name: string }): { type: "none" } {
  return { type: "none" };
}

// =============================================================================
// Line height / letter spacing conversion
// =============================================================================

/**
 * Convert Figma lineHeight to PPTX LineSpacing.
 *
 * Figma lineHeight is `{ value, units }` where:
 *   - units.name === "PERCENT": percentage of font size (e.g., 100 = 100%)
 *   - units.name === "PIXELS": absolute pixel value
 *   - units.name === "AUTO" or missing: Figma's default (~120%), omitted in PPTX
 *
 * PPTX lineSpacing is:
 *   - `{ type: "percent", value: Percent }`: value in 1/1000 of a percent (100% = 100000)
 *     (ECMA-376 §21.1.2.2.10: lnSpc spcPct, value is in 1000ths of a percent)
 *   - `{ type: "points", value: Points }`: absolute value in points
 *     (ECMA-376 §21.1.2.2.10: lnSpc spcPts, value is in 100ths of a point)
 */
function convertLineHeight(
  lineHeight: TextData["lineHeight"],
): LineSpacing | undefined {
  if (!lineHeight) {return undefined;}

  const unitsName = lineHeight.units?.name;
  if (!unitsName || unitsName === "AUTO") {return undefined;}

  if (unitsName === "PERCENT") {
    // Figma: 100 = 100%.  PPTX Percent branded type uses raw percentage (100 = 100%).
    return { type: "percent", value: pct(lineHeight.value) };
  }

  if (unitsName === "PIXELS") {
    // Figma: absolute pixels.  PPTX: points (1pt ≈ 1.333px at 96 DPI).
    return { type: "points", value: pt(lineHeight.value * 0.75) };
  }

  return undefined;
}

/**
 * Convert Figma letterSpacing to PPTX RunProperties.spacing.
 *
 * Figma letterSpacing is `{ value, units }` where:
 *   - units.name === "PERCENT": percentage of font size
 *   - units.name === "PIXELS": absolute pixel value
 *
 * PPTX spacing is in Pixels (branded), representing hundredths of a point
 * in the OOXML spec (a:spc), but our domain uses Pixels.
 *
 * Returns `undefined` when letterSpacing is zero or absent (use PPTX default).
 */
function convertLetterSpacing(
  letterSpacing: TextData["letterSpacing"],
  fontSize: number,
): ReturnType<typeof px> | undefined {
  if (!letterSpacing) {return undefined;}

  const unitsName = letterSpacing.units?.name;
  if (!unitsName) {return undefined;}

  if (unitsName === "PERCENT") {
    // Percentage of font size.  0% means no extra spacing → omit.
    if (letterSpacing.value === 0) {return undefined;}
    const spacingPx = (letterSpacing.value / 100) * fontSize;
    return px(spacingPx);
  }

  if (unitsName === "PIXELS") {
    if (letterSpacing.value === 0) {return undefined;}
    return px(letterSpacing.value);
  }

  return undefined;
}

/**
 * Convert Figma textCase to PPTX TextCaps.
 *
 * Figma: ORIGINAL, UPPER, LOWER, TITLE, SMALL_CAPS, SMALL_CAPS_FORCED
 * PPTX:  "none", "all", "small"
 *
 * LOWER and TITLE have no PPTX equivalent — they would require transforming
 * the actual character data, which we leave unchanged.
 */
function convertTextCase(textCase?: KiwiEnumValue): TextCaps | undefined {
  if (!textCase) {return undefined;}
  switch (textCase.name) {
    case "UPPER": return "all";
    case "SMALL_CAPS":
    case "SMALL_CAPS_FORCED": return "small";
    default: return undefined;
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
