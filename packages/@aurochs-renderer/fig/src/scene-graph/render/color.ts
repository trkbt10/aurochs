/**
 * @file Color conversion — shared SoT for SceneGraph Color → SVG hex
 *
 * Both SVG string and React renderers MUST use this function.
 * Duplicating color-to-hex logic elsewhere is a parity violation.
 */

import type { Color } from "../types";

/** Convert a normalized Color {r,g,b} (0–1) to #RRGGBB hex string */
export function colorToHex(c: Color): string {
  const r = Math.round(c.r * 255)
    .toString(16)
    .padStart(2, "0");
  const g = Math.round(c.g * 255)
    .toString(16)
    .padStart(2, "0");
  const b = Math.round(c.b * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${r}${g}${b}`;
}

/** Convert Uint8Array to base64 string */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary);
}
