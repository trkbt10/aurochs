/**
 * @file Convert PPTX TextBody to Fig TextData
 *
 * PPTX text is deeply structured: TextBody → Paragraph[] → TextRun[].
 * Fig's high-level TextData has a single characters string and
 * dominant font properties.
 *
 * We concatenate all runs/paragraphs into one string (newline-separated)
 * and extract the font properties from the first non-empty run.
 *
 * Font resolution: RunProperties.fontFamily may be a theme font
 * reference (e.g., "+mn-lt" for minor Latin). We resolve these
 * via FontScheme when available.
 */

import type { TextBody, RunProperties } from "@aurochs-office/pptx/domain/text";
import type { TextData } from "@aurochs/fig/domain";
import type { KiwiEnumValue } from "@aurochs/fig/types";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import { resolveThemeFont } from "@aurochs-office/ooxml/domain/font-scheme";

/**
 * Convert a PPTX TextBody to Fig TextData.
 *
 * @param textBody - The PPTX text body to convert
 * @param fontScheme - Theme font scheme for resolving "+mj-lt" / "+mn-lt" references
 *
 * Returns undefined if the text body has no text content.
 */
export function convertText(textBody: TextBody, fontScheme?: FontScheme): TextData | undefined {
  const lines: string[] = [];
  let dominantRun: RunProperties | undefined;

  for (const paragraph of textBody.paragraphs) {
    const lineTexts: string[] = [];
    for (const run of paragraph.runs) {
      if (run.type === "text" || run.type === "field") {
        lineTexts.push(run.text);
        if (!dominantRun && run.properties) {
          dominantRun = run.properties;
        }
      }
    }
    lines.push(lineTexts.join(""));
  }

  const characters = lines.join("\n");
  if (characters.length === 0) return undefined;

  // ECMA-376 §21.1.2.3.12: default font size is 1800 hundredths of a point = 18pt
  const fontSize = dominantRun?.fontSize
    ? (dominantRun.fontSize as number)
    : 18;

  const fontFamily = resolveFontFamily(dominantRun?.fontFamily, fontScheme);
  const style = buildFontStyle(dominantRun);

  return {
    characters,
    fontSize,
    fontName: {
      family: fontFamily,
      style,
      postscript: `${fontFamily}-${style}`.replace(/\s+/g, ""),
    },
    textAlignHorizontal: convertTextAlign(textBody),
    textAlignVertical: convertTextAnchor(textBody),
    textAutoResize: convertAutoFit(textBody),
  };
}

/**
 * Resolve a font family string, handling theme font references.
 *
 * Theme font references start with "+" (e.g., "+mn-lt" for minor Latin).
 * These are resolved via the FontScheme from the presentation theme.
 *
 * If resolution fails (no FontScheme, or the FontScheme has no font for
 * that slot), we return the raw reference string as-is rather than
 * substituting an arbitrary font. The consumer (editor, renderer) can
 * then decide how to handle the unresolved reference in its context.
 */
function resolveFontFamily(raw: string | undefined, fontScheme?: FontScheme): string {
  if (raw === undefined) {
    // No font specified at all. ECMA-376 does not mandate a default
    // typeface — it depends on the rendering application.
    // We return the minor Latin theme font if available, since body
    // text is the most common context for omitted fonts.
    const themeBody = fontScheme?.minorFont.latin;
    if (themeBody) return themeBody;
    // No theme available. Return a descriptive placeholder rather than
    // silently substituting an unrelated font.
    return "sans-serif";
  }

  // Theme font reference: resolve via FontScheme
  if (raw.startsWith("+")) {
    const resolved = resolveThemeFont(raw, fontScheme);
    // If resolution fails, preserve the raw reference so it's debuggable
    return resolved ?? raw;
  }

  // Direct typeface name — use as-is
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
