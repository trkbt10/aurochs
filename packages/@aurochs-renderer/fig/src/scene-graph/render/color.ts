/**
 * @file Color conversion — shared SoT for SceneGraph Color → SVG hex
 *
 * Both SVG string and React renderers MUST use this function.
 * Duplicating color-to-hex logic elsewhere is a parity violation.
 */

import type { Color } from "../types";

/**
 * Convert a 0–1 float channel to 0–255 integer.
 *
 * Kiwi encodes colors as float32, so exact 0.9 becomes 0.8999999..., making
 * `0.9 * 255 = 229.4999...` round down to 229 (#e5) instead of the intended
 * 230 (#e6). float32 has ~7 significant digits, giving a boundary error of
 * roughly 255 * 2^-23 ≈ 3e-5. An epsilon of 1e-4 absorbs that without being
 * large enough to shift any correctly-specified channel into the wrong byte
 * (1/255 ≈ 4e-3, so 1e-4 is well below one-byte granularity).
 */
function channelToByte(c: number): number {
  return Math.round(c * 255 + 1e-4);
}

/** Convert a normalized Color {r,g,b} (0–1) to #RRGGBB hex string */
export function colorToHex(c: Color): string {
  const r = channelToByte(c.r).toString(16).padStart(2, "0");
  const g = channelToByte(c.g).toString(16).padStart(2, "0");
  const b = channelToByte(c.b).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

/** Convert Uint8Array to base64 string */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary);
}
