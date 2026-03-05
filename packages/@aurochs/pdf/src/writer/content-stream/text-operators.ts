/**
 * @file PDF Text Operators
 *
 * Serializes PdfText to PDF content stream operators.
 * @see ISO 32000-1:2008 Section 9 (Text)
 */

import type { PdfText } from "../../domain/text";

/**
 * Format a number for PDF content stream.
 */
function formatNum(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  const fixed = value.toFixed(4);
  return fixed.replace(/\.?0+$/, "");
}

/**
 * Escape a string for PDF text operator (Tj, TJ).
 * Escapes parentheses and backslashes.
 */
function escapeTextString(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === "\\") {
      result += "\\\\";
    } else if (char === "(") {
      result += "\\(";
    } else if (char === ")") {
      result += "\\)";
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Context for text serialization.
 */
export type TextSerializationContext = {
  /**
   * Map of font name to font resource identifier.
   * e.g., "Helvetica" -> "F1"
   */
  readonly fontNameToResource: ReadonlyMap<string, string>;
};

/**
 * Serialize a PdfText element to PDF content stream operators.
 *
 * Output format:
 * ```
 * BT
 *   /F1 12 Tf        % Set font and size
 *   100 700 Td       % Move to position
 *   (Hello World) Tj % Show text
 * ET
 * ```
 *
 * @param text - The PdfText element to serialize
 * @param ctx - Context with font mappings
 * @returns PDF operators as string
 */
export function serializeText(
  text: PdfText,
  ctx: TextSerializationContext
): string {
  const lines: string[] = [];

  // Begin text object
  lines.push("BT");

  // Set font (Tf operator)
  const fontResource = ctx.fontNameToResource.get(text.fontName) ?? text.fontName;
  lines.push(`/${fontResource} ${formatNum(text.fontSize)} Tf`);

  // Set text spacing if non-default
  if (text.charSpacing && text.charSpacing !== 0) {
    lines.push(`${formatNum(text.charSpacing)} Tc`);
  }
  if (text.wordSpacing && text.wordSpacing !== 0) {
    lines.push(`${formatNum(text.wordSpacing)} Tw`);
  }
  if (text.horizontalScaling && text.horizontalScaling !== 100) {
    lines.push(`${formatNum(text.horizontalScaling)} Tz`);
  }

  // Set text position
  // Use baseline if available, otherwise use bounding box position
  let posX: number;
  let posY: number;

  if (text.baselineStartX !== undefined && text.baselineStartY !== undefined) {
    posX = text.baselineStartX;
    posY = text.baselineStartY;
  } else {
    // Approximate baseline from bounding box
    // y is bottom edge, baseline is typically at y + descender_offset
    posX = text.x;
    const descender = text.fontMetrics?.descender ?? -200;
    posY = text.y - (descender * text.fontSize / 1000);
  }

  // Use text matrix for positioning (Tm operator)
  // Simple case: identity matrix with translation
  lines.push(`1 0 0 1 ${formatNum(posX)} ${formatNum(posY)} Tm`);

  // Show text (Tj operator)
  lines.push(`(${escapeTextString(text.text)}) Tj`);

  // End text object
  lines.push("ET");

  return lines.join("\n");
}

/**
 * Serialize multiple text elements that share the same font.
 * More efficient than serializing each separately.
 */
export function serializeTextBatch(
  texts: readonly PdfText[],
  ctx: TextSerializationContext
): string {
  if (texts.length === 0) {
    return "";
  }

  const lines: string[] = [];
  let currentFont: string | null = null;
  let currentFontSize: number | null = null;

  lines.push("BT");

  for (const text of texts) {
    // Set font if changed
    const fontResource = ctx.fontNameToResource.get(text.fontName) ?? text.fontName;
    if (fontResource !== currentFont || text.fontSize !== currentFontSize) {
      lines.push(`/${fontResource} ${formatNum(text.fontSize)} Tf`);
      currentFont = fontResource;
      currentFontSize = text.fontSize;
    }

    // Set position
    let posX: number;
    let posY: number;

    if (text.baselineStartX !== undefined && text.baselineStartY !== undefined) {
      posX = text.baselineStartX;
      posY = text.baselineStartY;
    } else {
      posX = text.x;
      const descender = text.fontMetrics?.descender ?? -200;
      posY = text.y - (descender * text.fontSize / 1000);
    }

    lines.push(`1 0 0 1 ${formatNum(posX)} ${formatNum(posY)} Tm`);
    lines.push(`(${escapeTextString(text.text)}) Tj`);
  }

  lines.push("ET");

  return lines.join("\n");
}
