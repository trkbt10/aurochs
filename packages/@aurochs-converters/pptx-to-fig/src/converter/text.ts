/**
 * @file Convert PPTX TextBody to Fig TextData
 *
 * PPTX text is deeply structured: TextBody → Paragraph[] → TextRun[].
 * Figma's text model stores per-character styling via:
 * - characterStyleIDs: array mapping each character to a style override ID
 * - styleOverrideTable: array of style overrides (subset of NodeChange fields)
 * - Base style fields (fontSize, fontName, fillPaints) on the node itself
 *
 * We flatten PPTX runs into a single character string, identify distinct
 * visual styles, assign style IDs, and build the override table.
 * The base (dominant) style uses ID 0 (no override entry needed).
 */

import type { TextBody, RunProperties } from "@aurochs-office/pptx/domain/text";
import type { TextData, TextStyleOverride } from "@aurochs/fig/domain";
import type { KiwiEnumValue, FigColor, FigPaint, FigSolidPaint } from "@aurochs/fig/types";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import { resolveThemeFont } from "@aurochs-office/ooxml/domain/font-scheme";
import { dmlColorToFig } from "@aurochs-converters/interop-drawing-ml/dml-to-fig";

/**
 * A flattened run with its text and character offset in the concatenated string.
 */
type FlatRun = {
  readonly text: string;
  readonly offset: number;
  readonly properties?: RunProperties;
};

/**
 * A resolved visual style for comparison and deduplication.
 * This is the Fig-side representation of a PPTX run's visual properties.
 */
type ResolvedStyle = {
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly fontStyle: string;
  readonly fillPaints: readonly FigPaint[] | undefined;
  readonly textDecoration: KiwiEnumValue | undefined;
};

/**
 * Convert a PPTX TextBody to Fig TextData.
 *
 * @param textBody - The PPTX text body to convert
 * @param fontScheme - Theme font scheme for resolving "+mj-lt" / "+mn-lt" references
 * @param colorContext - Color context for resolving theme colors in runs
 *
 * Returns undefined if the text body has no text content.
 */
export function convertText(
  textBody: TextBody,
  fontScheme?: FontScheme,
  colorContext?: ColorContext,
): TextData | undefined {
  // Phase 1: Flatten paragraphs/runs into a single string, tracking each run's position
  const flatRuns: FlatRun[] = [];
  const lines: string[] = [];
  let charOffset = 0;

  for (let pi = 0; pi < textBody.paragraphs.length; pi++) {
    const paragraph = textBody.paragraphs[pi];
    const lineTexts: string[] = [];

    for (const run of paragraph.runs) {
      if (run.type === "text" || run.type === "field") {
        flatRuns.push({
          text: run.text,
          offset: charOffset,
          properties: run.properties,
        });
        lineTexts.push(run.text);
        charOffset += run.text.length;
      }
    }
    lines.push(lineTexts.join(""));

    // Account for the newline between paragraphs (except after the last)
    if (pi < textBody.paragraphs.length - 1) {
      charOffset += 1; // the "\n" separator
    }
  }

  const characters = lines.join("\n");
  if (characters.length === 0) return undefined;

  // Phase 2: Resolve each run's visual style in Fig terms
  const runStyles: { run: FlatRun; style: ResolvedStyle }[] = flatRuns
    .filter((r) => r.text.length > 0)
    .map((run) => ({
      run,
      style: resolveRunStyle(run.properties, fontScheme, colorContext),
    }));

  // Phase 3: Determine dominant (base) style — the style covering the most characters
  const dominantStyle = findDominantStyle(runStyles);

  // Phase 4: Build characterStyleIDs and styleOverrideTable
  const { characterStyleIDs, styleOverrideTable } = buildStyleMapping(
    characters,
    runStyles,
    dominantStyle,
  );

  const result: TextData = {
    characters,
    fontSize: dominantStyle.fontSize,
    fontName: {
      family: dominantStyle.fontFamily,
      style: dominantStyle.fontStyle,
      // PPTX has no PostScript name concept; use family as-is.
      postscript: dominantStyle.fontFamily,
    },
    textAlignHorizontal: convertTextAlign(textBody),
    textAlignVertical: convertTextAnchor(textBody),
    textAutoResize: convertAutoFit(textBody),
  };

  // Only include style arrays if there are actual overrides
  const hasOverrides = characterStyleIDs.some((id) => id !== 0);
  if (hasOverrides) {
    return { ...result, characterStyleIDs, styleOverrideTable };
  }

  return result;
}

/**
 * Resolve a PPTX RunProperties into a Fig-side visual style.
 */
function resolveRunStyle(
  props: RunProperties | undefined,
  fontScheme?: FontScheme,
  colorContext?: ColorContext,
): ResolvedStyle {
  // ECMA-376 §21.1.2.3.12: default font size = 1800 hundredths of a point = 18pt
  const fontSize = props?.fontSize ? (props.fontSize as number) : 18;
  const fontFamily = resolveFontFamily(props?.fontFamily, fontScheme);
  const fontStyle = buildFontStyle(props);
  const fillPaints = resolveRunFillPaints(props, colorContext);
  const textDecoration = resolveTextDecoration(props);

  return { fontSize, fontFamily, fontStyle, fillPaints, textDecoration };
}

/**
 * Find the dominant style — the one covering the most characters.
 * Falls back to the first style if all are equally common.
 */
function findDominantStyle(
  runStyles: readonly { run: FlatRun; style: ResolvedStyle }[],
): ResolvedStyle {
  if (runStyles.length === 0) {
    return { fontSize: 18, fontFamily: "sans-serif", fontStyle: "Regular", fillPaints: undefined, textDecoration: undefined };
  }

  // Count characters per unique style
  const styleCharCounts = new Map<string, { style: ResolvedStyle; count: number }>();
  for (const { run, style } of runStyles) {
    const key = styleKey(style);
    const existing = styleCharCounts.get(key);
    if (existing) {
      existing.count += run.text.length;
    } else {
      styleCharCounts.set(key, { style, count: run.text.length });
    }
  }

  let dominant: { style: ResolvedStyle; count: number } | undefined;
  for (const entry of styleCharCounts.values()) {
    if (!dominant || entry.count > dominant.count) {
      dominant = entry;
    }
  }

  return dominant!.style;
}

/**
 * Build characterStyleIDs and styleOverrideTable from resolved run styles.
 *
 * Style ID 0 = base (dominant) style, no entry in the override table.
 * Style IDs >= 1 are assigned to each distinct non-dominant style.
 */
function buildStyleMapping(
  characters: string,
  runStyles: readonly { run: FlatRun; style: ResolvedStyle }[],
  dominantStyle: ResolvedStyle,
): { characterStyleIDs: number[]; styleOverrideTable: TextStyleOverride[] } {
  const characterStyleIDs = new Array<number>(characters.length).fill(0);
  const dominantKey = styleKey(dominantStyle);

  // Map: style key → assigned ID + override entry
  const overrideMap = new Map<string, { id: number; style: ResolvedStyle }>();
  let nextId = 1;

  for (const { run, style } of runStyles) {
    const key = styleKey(style);
    if (key === dominantKey) continue; // Base style — ID 0

    let entry = overrideMap.get(key);
    if (!entry) {
      entry = { id: nextId++, style };
      overrideMap.set(key, entry);
    }

    // Fill characterStyleIDs for this run's character range
    for (let i = 0; i < run.text.length; i++) {
      characterStyleIDs[run.offset + i] = entry.id;
    }
  }

  // Build styleOverrideTable from the override map
  const styleOverrideTable: TextStyleOverride[] = [];
  for (const { id, style } of overrideMap.values()) {
    const override: TextStyleOverride = {
      styleID: id,
      fontSize: style.fontSize !== dominantStyle.fontSize ? style.fontSize : undefined,
      fontName: style.fontFamily !== dominantStyle.fontFamily || style.fontStyle !== dominantStyle.fontStyle
        ? { family: style.fontFamily, style: style.fontStyle, postscript: style.fontFamily }
        : undefined,
      fillPaints: !fillPaintsEqual(style.fillPaints, dominantStyle.fillPaints) ? style.fillPaints : undefined,
      textDecoration: !kiwiEnumEqual(style.textDecoration, dominantStyle.textDecoration) ? style.textDecoration : undefined,
    };
    styleOverrideTable.push(override);
  }

  return { characterStyleIDs, styleOverrideTable };
}

/**
 * Produce a stable key for style deduplication.
 */
function styleKey(style: ResolvedStyle): string {
  const parts = [
    style.fontSize,
    style.fontFamily,
    style.fontStyle,
    style.textDecoration?.name ?? "none",
  ];
  // Include fill paint color in key
  if (style.fillPaints && style.fillPaints.length > 0) {
    const paint = style.fillPaints[0];
    if (isSolidPaint(paint)) {
      const c = paint.color;
      parts.push(`${c.r.toFixed(4)},${c.g.toFixed(4)},${c.b.toFixed(4)},${c.a.toFixed(4)}`);
    }
  }
  return parts.join("|");
}

/**
 * Convert a PPTX run's color to Fig fillPaints (SOLID paint array).
 *
 * In Figma, text color is represented as fillPaints on the node
 * (or on a style override), not as a separate "color" field.
 */
function resolveRunFillPaints(
  props: RunProperties | undefined,
  colorContext?: ColorContext,
): FigPaint[] | undefined {
  if (!props?.color) return undefined;
  const figColor = dmlColorToFig(props.color, colorContext);
  return [{
    type: "SOLID" as const,
    color: { r: figColor.r, g: figColor.g, b: figColor.b, a: 1 },
    opacity: figColor.a,
    visible: true,
  }];
}

/**
 * Compare two fillPaints arrays for visual equivalence.
 */
function fillPaintsEqual(
  a: readonly FigPaint[] | undefined,
  b: readonly FigPaint[] | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return a === b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const pa = a[i];
    const pb = b[i];
    if (pa.type !== pb.type) return false;
    if (isSolidPaint(pa) && isSolidPaint(pb)) {
      if (!colorEqual(pa.color, pb.color)) return false;
      if ((pa.opacity ?? 1) !== (pb.opacity ?? 1)) return false;
    }
  }
  return true;
}

function colorEqual(a: FigColor | undefined, b: FigColor | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return Math.abs(a.r - b.r) < 0.001
    && Math.abs(a.g - b.g) < 0.001
    && Math.abs(a.b - b.b) < 0.001
    && Math.abs(a.a - b.a) < 0.001;
}

function kiwiEnumEqual(a: KiwiEnumValue | undefined, b: KiwiEnumValue | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.value === b.value;
}

/**
 * Resolve underline/strikethrough from RunProperties to a KiwiEnumValue.
 */
function resolveTextDecoration(props: RunProperties | undefined): KiwiEnumValue | undefined {
  if (!props) return undefined;
  if (props.underline && props.underline !== "none") {
    return { value: 1, name: "UNDERLINE" };
  }
  if (props.strike && props.strike !== "noStrike") {
    return { value: 2, name: "STRIKETHROUGH" };
  }
  return undefined;
}

/**
 * Resolve a font family string, handling theme font references.
 *
 * Theme font references start with "+" (e.g., "+mn-lt" for minor Latin).
 * These are resolved via the FontScheme from the presentation theme.
 */
function resolveFontFamily(raw: string | undefined, fontScheme?: FontScheme): string {
  if (raw === undefined) {
    const themeBody = fontScheme?.minorFont.latin;
    if (themeBody) return themeBody;
    return "sans-serif";
  }

  if (raw.startsWith("+")) {
    const resolved = resolveThemeFont(raw, fontScheme);
    return resolved ?? raw;
  }

  return raw;
}

function buildFontStyle(props?: RunProperties): string {
  if (!props) return "Regular";
  if (props.bold && props.italic) return "Bold Italic";
  if (props.bold) return "Bold";
  if (props.italic) return "Italic";
  return "Regular";
}

function convertTextAlign(textBody: TextBody): KiwiEnumValue | undefined {
  const align = textBody.paragraphs[0]?.properties?.alignment;
  if (!align) return undefined;

  switch (align) {
    case "left": return { value: 0, name: "LEFT" };
    case "center": return { value: 1, name: "CENTER" };
    case "right": return { value: 2, name: "RIGHT" };
    case "justify":
    case "justifyLow":
    case "distributed":
    case "thaiDistributed":
      return { value: 3, name: "JUSTIFIED" };
    default: return undefined;
  }
}

function convertTextAnchor(textBody: TextBody): KiwiEnumValue | undefined {
  const anchor = textBody.bodyProperties.anchor;
  if (!anchor) return undefined;

  switch (anchor) {
    case "top": return { value: 0, name: "TOP" };
    case "center": return { value: 1, name: "CENTER" };
    case "bottom": return { value: 2, name: "BOTTOM" };
    default: return undefined;
  }
}

function convertAutoFit(textBody: TextBody): KiwiEnumValue | undefined {
  const autoFit = textBody.bodyProperties.autoFit;
  if (!autoFit) return undefined;

  switch (autoFit.type) {
    case "shape": return { value: 2, name: "WIDTH_AND_HEIGHT" };
    case "normal": return { value: 1, name: "HEIGHT" };
    case "none":
    default: return { value: 0, name: "NONE" };
  }
}

function isSolidPaint(paint: FigPaint): paint is FigSolidPaint {
  return paint.type === "SOLID";
}
