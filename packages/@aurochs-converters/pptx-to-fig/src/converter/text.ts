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
 * Limitation: Per-run styles (individual run colors, mixed bold/italic
 * within a paragraph) are reduced to the dominant run's style.
 * Fig's TextData type does not support per-character formatting.
 * This is a known information loss.
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
  let hasMultipleStyles = false;

  for (const paragraph of textBody.paragraphs) {
    const lineTexts: string[] = [];
    for (const run of paragraph.runs) {
      if (run.type === "text" || run.type === "field") {
        lineTexts.push(run.text);
        if (!dominantRun && run.properties) {
          dominantRun = run.properties;
        } else if (dominantRun && run.properties) {
          // Detect style variation across runs
          if (run.properties.bold !== dominantRun.bold
            || run.properties.italic !== dominantRun.italic
            || run.properties.color !== dominantRun.color) {
            hasMultipleStyles = true;
          }
        }
      }
    }
    lines.push(lineTexts.join(""));
  }

  const characters = lines.join("\n");
  if (characters.length === 0) return undefined;

  if (hasMultipleStyles) {
    console.warn(
      `[pptx-to-fig] Text "${characters.slice(0, 40)}..." has per-run style variations ` +
      `(mixed bold/italic/color). Fig TextData supports only a single dominant style. ` +
      `Per-run formatting is lost.`,
    );
  }

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
