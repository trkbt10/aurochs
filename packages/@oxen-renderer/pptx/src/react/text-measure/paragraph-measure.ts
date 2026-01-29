/**
 * @file Browser paragraph measurement for layout
 *
 * Measures text using actual SVG rendering for ECMA-376 text runs.
 */

import { PT_TO_PX } from "@oxen-office/pptx/domain/unit-conversion";
import { px } from "@oxen-office/ooxml/domain/units";
import { DEFAULT_FONT_SIZE_PT } from "@oxen-office/pptx/domain/defaults";
import { applyTextTransform } from "../primitives/text/text-utils";
import { ensureSvgTextNode, normalizeSpaces, setTextAttributes } from "./svg-text-measure";
import type {
  ParagraphMeasurer,
  TextMeasureParagraph,
  TextMeasureRun,
  TextMeasureRunResult,
  TextMeasureParagraphResult,
} from "./types";

function buildTextAttributes(run: TextMeasureRun): Record<string, string> {
  const fontSize = run.properties.fontSize ?? DEFAULT_FONT_SIZE_PT;
  const fontSizePx = (fontSize as number) * PT_TO_PX;
  const fontStyle = run.properties.italic ? "italic" : "normal";
  const fontWeight = run.properties.bold ? "700" : "400";
  const fontFamily = buildFontFamily(run.properties.fontFamily, run.properties);
  const letterSpacing = `${(run.properties.spacing ?? 0) as number}px`;

  return {
    "font-size": `${fontSizePx}px`,
    "font-style": fontStyle,
    "font-weight": fontWeight,
    "font-family": fontFamily,
    "letter-spacing": letterSpacing,
    "xml:space": "preserve",
  };
}

function buildFontFamily(primary: string | undefined, run: TextMeasureRun["properties"]): string {
  const families = [primary ?? "sans-serif"];

  if (run.fontFamilyEastAsian !== undefined) {
    families.push(run.fontFamilyEastAsian);
  }

  if (run.fontFamilyComplexScript !== undefined && run.fontFamilyComplexScript !== primary) {
    families.push(run.fontFamilyComplexScript);
  }

  if (run.fontFamilySymbol !== undefined && run.fontFamilySymbol !== primary) {
    families.push(run.fontFamilySymbol);
  }

  return families.join(", ");
}

function resolveTextTransform(run: TextMeasureRun["properties"]): "none" | "uppercase" | "lowercase" | undefined {
  const caps = run.caps;
  if (caps === "all") {
    return "uppercase";
  }
  if (caps === "small") {
    return "lowercase";
  }
  return "none";
}

function measureTextSegment(textNode: SVGTextElement, text: string): number {
  textNode.textContent = normalizeSpaces(text);
  return textNode.getComputedTextLength();
}

function getDefaultTabSizePx(paragraph: TextMeasureParagraph): number {
  const defaultTab = paragraph.defaultTabSize;
  return defaultTab !== undefined ? (defaultTab as number) : 0;
}

function getNextTabStop(
  currentX: number,
  paragraph: TextMeasureParagraph,
): number {
  if (paragraph.tabStops && paragraph.tabStops.length > 0) {
    const sortedStops = [...paragraph.tabStops].sort((a, b) => (a.position as number) - (b.position as number));
    const next = sortedStops.find((stop) => (stop.position as number) > currentX);
    if (next) {
      return next.position as number;
    }
  }

  const defaultTabPx = getDefaultTabSizePx(paragraph);
  if (defaultTabPx <= 0) {
    return currentX;
  }

  return Math.ceil(currentX / defaultTabPx) * defaultTabPx;
}

function measureTextWithTabs(
  ...args: [
    textNode: SVGTextElement,
    text: string,
    paragraph: TextMeasureParagraph,
    startX: number,
  ]
): { width: number; endX: number } {
  const [textNode, text, paragraph, startX] = args;
  if (!text.includes("\t")) {
    const width = measureTextSegment(textNode, text);
    return { width, endX: startX + width };
  }

  const segments = text.split("\t");
  let currentX = startX;
  let totalWidth = 0;

  segments.forEach((segment, index) => {
    const segmentWidth = measureTextSegment(textNode, segment);
    currentX += segmentWidth;
    totalWidth += segmentWidth;

    if (index < segments.length - 1) {
      const nextStop = getNextTabStop(currentX, paragraph);
      const tabAdvance = Math.max(0, nextStop - currentX);
      currentX += tabAdvance;
      totalWidth += tabAdvance;
    }
  });

  return { width: totalWidth, endX: currentX };
}

function measureRunWithSvg(
  ...args: [
    run: TextMeasureRun,
    textNode: SVGTextElement,
    paragraph: TextMeasureParagraph,
    startX: number,
  ]
): { result: TextMeasureRunResult; endX: number } {
  const [run, textNode, paragraph, startX] = args;
  if (run.isBreak || run.text.length === 0) {
    return { result: { ...run, width: px(0) }, endX: startX };
  }

  const attributes = buildTextAttributes(run);
  setTextAttributes(textNode, attributes);

  const transform = resolveTextTransform(run.properties);
  const measuredText = applyTextTransform(run.text, transform);
  const { width, endX } = measureTextWithTabs(textNode, measuredText, paragraph, startX);

  return { result: { ...run, width: px(width) }, endX };
}

function measureBulletWidth(
  textNode: SVGTextElement,
  paragraph: TextMeasureParagraph,
): number | undefined {
  const bulletStyle = paragraph.bulletStyle;
  if (!bulletStyle || bulletStyle.bullet.type !== "char") {
    return undefined;
  }

  const bulletChar = bulletStyle.bullet.char;
  if (!bulletChar) {
    return undefined;
  }

  const fontSize = bulletStyle.sizePoints ?? DEFAULT_FONT_SIZE_PT;
  const fontFamily = bulletStyle.font ?? "sans-serif";

  textNode.setAttribute("font-size", `${(fontSize as number) * PT_TO_PX}px`);
  textNode.setAttribute("font-family", fontFamily);
  textNode.setAttribute("font-weight", "400");
  textNode.setAttribute("font-style", "normal");
  textNode.setAttribute("letter-spacing", "0px");
  textNode.setAttribute("xml:space", "preserve");
  textNode.textContent = bulletChar;

  return textNode.getComputedTextLength();
}
















export function createParagraphMeasurer(): ParagraphMeasurer | null {
  const textNode = ensureSvgTextNode();
  if (!textNode) {
    return null;
  }

  return (paragraph: TextMeasureParagraph): TextMeasureParagraphResult => {
    const results: TextMeasureRunResult[] = [];
    let currentX = 0;

    for (const run of paragraph.runs) {
      const { result, endX } = measureRunWithSvg(run, textNode, paragraph, currentX);
      results.push(result);
      currentX = run.isBreak ? 0 : endX;
    }

    const bulletWidth = measureBulletWidth(textNode, paragraph);
    return { runs: results, bulletWidth: bulletWidth !== undefined ? px(bulletWidth) : undefined };
  };
}
