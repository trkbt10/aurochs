/**
 * @file Convert Fig text data to PPTX TextBody
 *
 * Figma's text model is relatively flat: a single TextData with
 * characters, fontSize, fontName, and alignment.
 *
 * PPTX text is deeply structured: TextBody → Paragraph[] → TextRun[].
 * We split the text on newlines into paragraphs, each containing a
 * single run with the node's font properties.
 */

import type { TextData } from "@aurochs/fig/domain";
import type { TextBody } from "@aurochs-office/pptx/domain/text";
import type { Points } from "@aurochs-office/drawing-ml/domain/units";
import { pt } from "@aurochs-office/drawing-ml/domain/units";
import type { TextAlign, TextAnchor, ParagraphProperties } from "@aurochs-office/pptx/domain/text";

/**
 * Convert Fig TextData to a PPTX TextBody.
 *
 * The text is split into paragraphs at newline characters.
 * Each paragraph gets a single run with the font properties
 * from the Fig TextData.
 */
export function convertText(textData: TextData): TextBody {
  const lines = textData.characters.split("\n");
  const align = convertTextAlign(textData.textAlignHorizontal);
  const anchor = convertTextAnchor(textData.textAlignVertical);

  return {
    bodyProperties: {
      anchor,
      wrapping: "square",
      autoFit: convertAutoFit(textData.textAutoResize),
    },
    paragraphs: lines.map((line) => ({
      properties: {
        alignment: align,
      } satisfies ParagraphProperties,
      runs: [
        {
          type: "text" as const,
          text: line,
          properties: {
            fontSize: pt(textData.fontSize) as Points,
            fontFamily: textData.fontName.family,
            bold: isBoldStyle(textData.fontName.style),
            italic: isItalicStyle(textData.fontName.style),
          },
        },
      ],
    })),
  };
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
  if (!autoResize) return { type: "none" };
  switch (autoResize.name) {
    case "WIDTH_AND_HEIGHT": return { type: "shape" };
    case "HEIGHT": return { type: "normal" };
    case "NONE":
    default: return { type: "none" };
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
