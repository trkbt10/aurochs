/**
 * @file Bridge text measurement to text-layout types
 */

import type { LayoutParagraphInput, MeasuredSpan } from "../../text-layout/types";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type {
  Paragraph,
  ParagraphProperties,
  RunProperties,
  TextRun,
  BulletStyle,
  Bullet,
} from "@aurochs-office/pptx/domain/text";
import { createParagraphMeasurer } from "./paragraph-measure";
import type { TextMeasureParagraph, TextMeasureParagraphResult } from "./types";

function resolveCaps(textTransform: LayoutParagraphInput["spans"][number]["textTransform"]): RunProperties["caps"] {
  if (textTransform === "uppercase") {
    return "all";
  }
  if (textTransform === "lowercase") {
    return "small";
  }
  return undefined;
}

function toRunProperties(span: LayoutParagraphInput["spans"][number]): RunProperties {
  return {
    fontSize: span.fontSize,
    fontFamily: span.fontFamily,
    fontFamilyEastAsian: span.fontFamilyEastAsian,
    fontFamilyComplexScript: span.fontFamilyComplexScript,
    fontFamilySymbol: span.fontFamilySymbol,
    bold: span.fontWeight > 400,
    italic: span.fontStyle === "italic",
    spacing: span.letterSpacing,
    caps: resolveCaps(span.textTransform),
    kerning: span.kerning,
    wpOpticalKerning: span.opticalKerning,
  };
}

function toTextRun(span: LayoutParagraphInput["spans"][number]): TextRun {
  if (span.isBreak) {
    return { type: "break", properties: toRunProperties(span) };
  }
  return { type: "text", text: span.text, properties: toRunProperties(span) };
}

function toParagraphProperties(paragraph: LayoutParagraphInput): ParagraphProperties {
  return {
    alignment: paragraph.alignment,
    marginLeft: paragraph.marginLeft,
    marginRight: paragraph.marginRight,
    indent: paragraph.indent,
    lineSpacing: paragraph.lineSpacing,
    spaceBefore: { type: "points", value: paragraph.spaceBefore },
    spaceAfter: { type: "points", value: paragraph.spaceAfter },
    defaultTabSize: paragraph.defaultTabSize,
    tabStops: paragraph.tabStops,
    fontAlignment: paragraph.fontAlignment,
  };
}

function toBulletStyle(paragraph: LayoutParagraphInput): BulletStyle | undefined {
  const bullet = paragraph.bullet;
  if (!bullet || bullet.imageUrl !== undefined) {
    return undefined;
  }

  const bulletConfig: Bullet = { type: "char", char: bullet.char };

  return {
    bullet: bulletConfig,
    colorFollowText: false,
    sizeFollowText: false,
    fontFollowText: false,
    color: undefined,
    sizePoints: bullet.fontSize,
    font: bullet.fontFamily,
  };
}

function toTextMeasureParagraph(paragraph: LayoutParagraphInput): TextMeasureParagraph {
  const runs = paragraph.spans.map((span) => {
    const run = toTextRun(span);
    return {
      run,
      properties: run.properties ?? {},
      text: span.text,
      isBreak: span.isBreak,
    };
  });

  const properties = toParagraphProperties(paragraph);
  const paragraphDomain: Paragraph = {
    properties,
    runs: runs.map((entry) => entry.run),
  };

  return {
    paragraph: paragraphDomain,
    runs,
    bulletStyle: toBulletStyle(paragraph),
    defaultTabSize: paragraph.defaultTabSize,
    tabStops: paragraph.tabStops,
  };
}

function applyMeasuredWidths(
  paragraph: LayoutParagraphInput,
  measured: TextMeasureParagraphResult,
): { spans: MeasuredSpan[]; bulletWidth?: MeasuredSpan["width"] } {
  const spans = paragraph.spans.map((span, index) => ({
    ...span,
    width: measured.runs[index]?.width ?? px(0),
  }));

  return {
    spans,
    bulletWidth: measured.bulletWidth,
  };
}

/**
 * Create a paragraph measurer for text layout that bridges to SVG measurement.
 */
export function createLayoutParagraphMeasurer():
  | ((paragraph: LayoutParagraphInput) => { spans: MeasuredSpan[]; bulletWidth?: MeasuredSpan["width"] })
  | null {
  const measureParagraph = createParagraphMeasurer();
  if (!measureParagraph) {
    return null;
  }

  return (paragraph) => {
    const textParagraph = toTextMeasureParagraph(paragraph);
    const measured = measureParagraph(textParagraph);
    return applyMeasuredWidths(paragraph, measured);
  };
}
