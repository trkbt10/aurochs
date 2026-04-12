/**
 * @file PDF Text Operators
 *
 * Serializes PdfText to PDF content stream operators.
 * @see ISO 32000-1:2008 Section 9 (Text)
 */

import type { PdfText } from "../../domain/text";
import type { PdfEmbeddedFont } from "../../domain/document";
import type { FontProvider } from "../../domain/font/font-provider";
import { encodeTextForFont, splitTextByEncodability } from "../../domain/font/text-encoder";

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
  return text.replace(/[\\()]/g, (ch) => `\\${ch}`);
}

/**
 * Convert bytes to hex string for CID font text output.
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0").toUpperCase()).join("");
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
  const withoutSlash = name.startsWith("/") ? name.slice(1) : name;
  if (!removeSubsetPrefix) return withoutSlash;
  const plusIndex = withoutSlash.indexOf("+");
  return plusIndex > 0 ? withoutSlash.slice(plusIndex + 1) : withoutSlash;
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
 * Resolve the baseline position for a text element.
 * Uses explicit baseline coordinates if available, otherwise approximates from bounding box.
 */
function resolveTextPosition(text: PdfText): { readonly x: number; readonly y: number } {
  if (text.baselineStartX !== undefined && text.baselineStartY !== undefined) {
    return { x: text.baselineStartX, y: text.baselineStartY };
  }
  const descender = text.fontMetrics?.descender ?? -200;
  return { x: text.x, y: text.y - (descender * text.fontSize / 1000) };
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
  /**
   * Font provider for font resolution and re-encoding.
   * When present, edited text elements will be re-encoded through this provider.
   */
  readonly fontProvider?: FontProvider;
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

  // Set text position (Tm operator)
  const pos = resolveTextPosition(text);
  lines.push(`1 0 0 1 ${formatNum(pos.x)} ${formatNum(pos.y)} Tm`);

  // Show text (Tj operator)
  // Strategy:
  //   1. Unedited CID text with rawBytes → hex output (round-trip preservation)
  //   2. Edited text with FontProvider → re-encode through provider
  //   3. Edited CID text without FontProvider → try rawBytes if still present
  //   4. Fallback → escaped text string
  const textOutput = resolveTextOutput(text, ctx);
  lines.push(textOutput);

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

  type FontState = { readonly font: string; readonly size: number } | undefined;

  const bodyLines = texts.reduce<{ readonly lines: string[]; readonly fontState: FontState }>(
    (acc, text) => {
      const fontResource = ctx.fontNameToResource.get(text.fontName) ?? text.fontName;
      const needsFontSwitch = !acc.fontState || fontResource !== acc.fontState.font || text.fontSize !== acc.fontState.size;
      if (needsFontSwitch) {
        acc.lines.push(`/${fontResource} ${formatNum(text.fontSize)} Tf`);
      }

      const pos = resolveTextPosition(text);
      acc.lines.push(`1 0 0 1 ${formatNum(pos.x)} ${formatNum(pos.y)} Tm`);
      acc.lines.push(resolveTextOutput(text, ctx));

      return { lines: acc.lines, fontState: { font: fontResource, size: text.fontSize } };
    },
    { lines: [], fontState: undefined },
  );

  return ["BT", ...bodyLines.lines, "ET"].join("\n");
}

// =============================================================================
// Text output resolution
// =============================================================================

/**
 * Resolve the PDF text output operators for a PdfText element.
 *
 * Decision logic:
 *   1. If text was edited and FontProvider is available:
 *      → Try full encoding. If it succeeds, output single Tj.
 *      → If encoding fails (some characters not in font), split into runs
 *        and use font fallback with Tf switching per ISO 32000-1 Section 9.4.3.
 *   2. If text was NOT edited and has rawBytes for a CID font:
 *      → Use original rawBytes verbatim (round-trip preservation).
 *   3. Otherwise:
 *      → Use escaped text string (single-byte font or fallback).
 */
function resolveTextOutput(text: PdfText, ctx: TextSerializationContext): string {
  const isEdited = text.editState?.textChanged === true || text.editState?.fontChanged === true;

  // Case 1: Edited text — re-encode through FontProvider
  if (isEdited && ctx.fontProvider) {
    const resolved = ctx.fontProvider.resolve(text.fontName, text.editState?.resolvedFontFamily ?? text.baseFont);
    const encoded = encodeTextForFont(text.text, resolved);

    if (encoded) {
      // Full text is encodable by the primary font
      if (encoded.codeByteWidth === 2) {
        return `<${bytesToHex(encoded.rawBytes)}> Tj`;
      }
      return `(${escapeTextString(text.text)}) Tj`;
    }

    // Encoding failed for some characters — split into runs and use fallback
    return resolveTextOutputWithFallback(text, resolved, ctx);
  }

  // Case 2: Unedited CID text with rawBytes — round-trip preservation
  if (shouldUseHexOutput(text, ctx.embeddedFonts) && text.rawBytes) {
    return `<${bytesToHex(text.rawBytes)}> Tj`;
  }

  // Case 3: Single-byte font or fallback
  return `(${escapeTextString(text.text)}) Tj`;
}

/**
 * Encode text with font fallback: split into runs by encodability,
 * encode each run with the appropriate font, and emit Tf+Tj pairs.
 *
 * Per ISO 32000-1:2008 Section 9.4.3, multiple Tf operators within
 * a single BT...ET block are valid for switching fonts mid-text.
 *
 * The fallback font is resolved through FontProvider.resolveFallback(),
 * which is DI-injectable. The default falls back to Helvetica (Standard 14).
 */
/**
 * Encode text with font fallback: split into runs by encodability,
 * encode each run with the appropriate font, and emit Tf+Tj pairs.
 *
 * Per ISO 32000-1:2008 Section 9.4.3, multiple Tf operators within
 * a single BT...ET block are valid for switching fonts mid-text.
 *
 * The fallback font is resolved through FontProvider.resolveFallback(),
 * which is DI-injectable. The default falls back to Helvetica (Standard 14).
 */
function resolveTextOutputWithFallback(
  textElement: PdfText,
  primaryFont: ResolvedFont,
  ctx: TextSerializationContext,
): string {
  const provider = ctx.fontProvider!;
  const runs = splitTextByEncodability(textElement.text, primaryFont);
  const lines: string[] = [];
  const fontSize = textElement.fontSize;

  // Get fallback font (may be undefined if no strategy can handle it)
  const nonEncodableChars = runs.filter(r => !r.encodable).map(r => r.text).join("");
  const fallbackFont = nonEncodableChars.length > 0
    ? provider.resolveFallback(nonEncodableChars, primaryFont)
    : undefined;

  // Resolve font resource names for Tf operators
  const primaryResource = findFontResource(primaryFont, ctx.fontNameToResource) ?? textElement.fontName;
  const fallbackResource = fallbackFont
    ? findFontResource(fallbackFont, ctx.fontNameToResource) ?? fallbackFont.pdfBaseFont
    : undefined;

  for (const run of runs) {
    if (run.encodable) {
      // Encode with primary font
      const encoded = encodeTextForFont(run.text, primaryFont);
      if (encoded && encoded.codeByteWidth === 2) {
        lines.push(`<${bytesToHex(encoded.rawBytes)}> Tj`);
      } else {
        lines.push(`(${escapeTextString(run.text)}) Tj`);
      }
    } else if (fallbackFont && fallbackResource) {
      // Switch to fallback font (same size), encode, then switch back
      lines.push(`/${fallbackResource} ${formatNum(fontSize)} Tf`);
      const encoded = encodeTextForFont(run.text, fallbackFont);
      if (encoded && encoded.codeByteWidth === 2) {
        lines.push(`<${bytesToHex(encoded.rawBytes)}> Tj`);
      } else {
        lines.push(`(${escapeTextString(run.text)}) Tj`);
      }
      // Switch back to primary font
      lines.push(`/${primaryResource} ${formatNum(fontSize)} Tf`);
    } else {
      // No fallback available — output as plain text string (best effort)
      lines.push(`(${escapeTextString(run.text)}) Tj`);
    }
  }

  return lines.join("\n");
}

/** Find the PDF resource name (e.g. "F1") for a resolved font. */
function findFontResource(
  font: ResolvedFont,
  fontNameToResource: ReadonlyMap<string, string>,
): string | undefined {
  return fontNameToResource.get(font.pdfBaseFont)
    ?? fontNameToResource.get(font.cssFontFamily);
}

// Import type for internal use
type ResolvedFont = import("../../domain/font/font-provider").ResolvedFont;
