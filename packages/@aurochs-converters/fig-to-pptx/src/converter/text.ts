/**
 * @file Convert Fig text data to PPTX TextBody
 *
 * Figma's text model is relatively flat: a single TextData with
 * characters, fontSize, fontName, and alignment. The binary .fig format
 * does have per-character style runs, but the high-level FigDesignNode
 * exposes only the dominant style via TextData.
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

/**
 * Convert Figma's text horizontal alignment to DrawingML TextAlign.
 *
 * Figma uses KiwiEnumValue with names like "LEFT", "CENTER", "RIGHT", "JUSTIFIED".
 * DrawingML uses lowercase strings.
 */
function convertTextAlign(align?: { name: string }): TextAlign | undefined {
  if (!align) return undefined;
  switch (align.name) {
    case "LEFT":
      return "left";
    case "CENTER":
      return "center";
    case "RIGHT":
      return "right";
    case "JUSTIFIED":
      return "justify";
    default:
      return undefined;
  }
}

/**
 * Convert Figma's text vertical alignment to DrawingML TextAnchor.
 *
 * Figma: TOP, CENTER, BOTTOM
 * DrawingML: top, center, bottom
 */
function convertTextAnchor(align?: { name: string }): TextAnchor | undefined {
  if (!align) return undefined;
  switch (align.name) {
    case "TOP":
      return "top";
    case "CENTER":
      return "center";
    case "BOTTOM":
      return "bottom";
    default:
      return undefined;
  }
}

/**
 * Convert Figma's textAutoResize to DrawingML AutoFit.
 *
 * Figma: NONE, WIDTH_AND_HEIGHT, HEIGHT
 * DrawingML:
 *   - "none": no auto-fit (fixed size)
 *   - "normal": shrink text to fit (closest to HEIGHT)
 *   - "shape": resize shape to fit text (closest to WIDTH_AND_HEIGHT)
 */
function convertAutoFit(autoResize?: { name: string }): { type: "none" } | { type: "normal" } | { type: "shape" } {
  if (!autoResize) return { type: "none" };
  switch (autoResize.name) {
    case "WIDTH_AND_HEIGHT":
      return { type: "shape" };
    case "HEIGHT":
      return { type: "normal" };
    case "NONE":
    default:
      return { type: "none" };
  }
}

/**
 * Detect bold from Figma font style string.
 * Figma style strings are like "Bold", "Bold Italic", "SemiBold", etc.
 */
function isBoldStyle(style: string): boolean {
  const lower = style.toLowerCase();
  return lower.includes("bold") || lower.includes("black") || lower.includes("heavy");
}

/**
 * Detect italic from Figma font style string.
 */
function isItalicStyle(style: string): boolean {
  const lower = style.toLowerCase();
  return lower.includes("italic") || lower.includes("oblique");
}
