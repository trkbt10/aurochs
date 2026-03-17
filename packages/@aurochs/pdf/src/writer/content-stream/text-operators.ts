/**
 * @file PDF Text Operators
 *
 * Serializes PdfText to PDF content stream operators.
 * @see ISO 32000-1:2008 Section 9 (Text)
 */

import type { PdfText } from "../../domain/text";
import type { PdfEmbeddedFont } from "../../domain/document";

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
  // eslint-disable-next-line no-restricted-syntax -- string builder pattern
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
 * Convert bytes to hex string for CID font text output.
 */
function bytesToHex(bytes: Uint8Array): string {
  // eslint-disable-next-line no-restricted-syntax -- string builder pattern
  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    result += bytes[i].toString(16).padStart(2, "0").toUpperCase();
  }
  return result;
}

/**
 * Check if text should use hex string output (CID font).
 */
function shouldUseHexOutput(
  text: PdfText,
  embeddedFonts?: readonly PdfEmbeddedFont[]
): boolean {
  if (!text.rawBytes) {
    return false;
  }

  // Find matching embedded font
  const font = findEmbeddedFont(text, embeddedFonts);
  if (!font) {
    return false;
  }

  // CID fonts use 2-byte encoding or have CID ordering
  return font.codeByteWidth === 2 || font.ordering !== undefined;
}

/**
 * Normalize font name for matching.
 * Removes leading slash and optionally subset prefix.
 */
function normalizeFontNameForMatch(name: string, removeSubsetPrefix: boolean): string {
  // eslint-disable-next-line no-restricted-syntax -- conditionally reassigned
  let clean = name.startsWith("/") ? name.slice(1) : name;
  if (removeSubsetPrefix) {
    const plusIndex = clean.indexOf("+");
    if (plusIndex > 0) {
      clean = clean.slice(plusIndex + 1);
    }
  }
  return clean;
}

/**
 * Find the embedded font matching a text element.
 */
function findEmbeddedFont(
  text: PdfText,
  embeddedFonts?: readonly PdfEmbeddedFont[]
): PdfEmbeddedFont | undefined {
  if (!embeddedFonts) {
    return undefined;
  }

  const rawTargetName = text.baseFont ?? text.fontName;
  // Normalize target name (remove leading slash)
  const targetName = normalizeFontNameForMatch(rawTargetName, false);
  // Also get target without subset prefix for fallback matching
  const targetNameNoSubset = normalizeFontNameForMatch(rawTargetName, true);

  return embeddedFonts.find(f => {
    // Direct match on fontFamily (already normalized)
    if (f.fontFamily === targetName || f.fontFamily === targetNameNoSubset) {
      return true;
    }

    // Match on baseFontName (remove leading slash)
    const baseFontClean = f.baseFontName?.replace(/^\//, "");
    if (baseFontClean === targetName) {
      return true;
    }

    // Subset prefix match (e.g., "ABCDEF+FontName" matches "FontName")
    if (baseFontClean?.includes("+")) {
      const afterPlus = baseFontClean.split("+")[1];
      if (afterPlus === targetName || afterPlus === targetNameNoSubset) {
        return true;
      }
    }

    return false;
  });
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
  /**
   * Embedded fonts for CID font detection.
   * When present, CID fonts will use hex string output.
   */
  readonly embeddedFonts?: readonly PdfEmbeddedFont[];
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
  // eslint-disable-next-line no-restricted-syntax -- branched assignment
  let posX: number;
  // eslint-disable-next-line no-restricted-syntax -- branched assignment
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
  // Use hex string for CID fonts to preserve original byte sequence
  if (shouldUseHexOutput(text, ctx.embeddedFonts) && text.rawBytes) {
    const hexString = bytesToHex(text.rawBytes);
    lines.push(`<${hexString}> Tj`);
  } else {
    lines.push(`(${escapeTextString(text.text)}) Tj`);
  }

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
  // eslint-disable-next-line no-restricted-syntax -- accumulator updated in loop
  let currentFont: string | null = null;
  // eslint-disable-next-line no-restricted-syntax -- accumulator updated in loop
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
    // eslint-disable-next-line no-restricted-syntax -- branched assignment
    let posX: number;
    // eslint-disable-next-line no-restricted-syntax -- branched assignment
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

    // Use hex string for CID fonts to preserve original byte sequence
    if (shouldUseHexOutput(text, ctx.embeddedFonts) && text.rawBytes) {
      const hexString = bytesToHex(text.rawBytes);
      lines.push(`<${hexString}> Tj`);
    } else {
      lines.push(`(${escapeTextString(text.text)}) Tj`);
    }
  }

  lines.push("ET");

  return lines.join("\n");
}
