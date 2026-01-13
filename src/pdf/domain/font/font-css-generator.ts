/**
 * @file Font CSS generator
 *
 * Generates @font-face CSS from embedded font data.
 * The generated CSS can be embedded in SVG or HTML for accurate font rendering.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face
 */
import type { EmbeddedFont } from "./font-extractor";

/**
 * Convert font data to a base64-encoded data URL.
 *
 * @param font - Embedded font data
 * @returns Data URL string (e.g., "data:font/otf;base64,...")
 */
export function fontToDataUrl(font: EmbeddedFont): string {
  const base64 = uint8ArrayToBase64(font.data);
  return `data:${font.mimeType};base64,${base64}`;
}

/**
 * Generate @font-face CSS rule for a single font.
 *
 * @param font - Embedded font data
 * @returns CSS @font-face rule string
 */
export function generateFontFaceCss(font: EmbeddedFont): string {
  const dataUrl = fontToDataUrl(font);
  const format = getFormatHint(font.format);

  return `@font-face {
  font-family: "${font.fontFamily}";
  src: url("${dataUrl}") format("${format}");
  font-weight: normal;
  font-style: normal;
  font-display: block;
}`;
}

/**
 * Generate combined @font-face CSS for multiple fonts.
 *
 * @param fonts - Array of embedded fonts
 * @returns CSS string with all @font-face rules
 */
export function generateFontFaceStyle(fonts: readonly EmbeddedFont[]): string {
  return fonts.map((font) => generateFontFaceCss(font)).join("\n\n");
}

/**
 * Get CSS format() hint for font format.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/src#format()
 */
function getFormatHint(format: EmbeddedFont["format"]): string {
  switch (format) {
    case "opentype":
      return "opentype";
    case "truetype":
      return "truetype";
    case "type1":
      // Type 1 fonts are not directly supported in browsers
      // but we can try OpenType as fallback
      return "opentype";
    case "cff":
      return "opentype";
    default:
      return "opentype";
  }
}

/**
 * Convert Uint8Array to base64 string.
 *
 * Uses Node.js Buffer if available, otherwise falls back to browser-compatible method.
 */
function uint8ArrayToBase64(data: Uint8Array): string {
  // Node.js environment
  if (typeof Buffer !== "undefined") {
    return Buffer.from(data).toString("base64");
  }

  // Browser environment
  let binary = "";
  const len = data.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(data[i]!);
  }
  return btoa(binary);
}
