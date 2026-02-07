/**
 * @file Shared border/color utilities for DOC BRC structures
 *
 * BRC80 (legacy, 4 bytes): dptLineWidth(1B) + brcType(1B) + ico(1B) + dptSpace+flags(1B)
 * BRC (modern, 8 bytes): cv(4B COLORREF) + dptLineWidth(1B) + brcType(1B) + dptSpace+flags(2B)
 */

import type { DocBorder, DocBorderStyle } from "../domain/types";
import { ICO_COLORS } from "../sprm/sprm-decoder";

/** BRC80 border type → DocBorderStyle mapping (0-25). */
export const BRC_TYPE_MAP: readonly (DocBorderStyle | undefined)[] = [
  "none",                // 0
  "single",              // 1
  "thick",               // 2
  "double",              // 3
  undefined,             // 4 (reserved)
  "dotted",              // 5 (hairline)
  "dotted",              // 6
  "dashed",              // 7
  "dotDash",             // 8
  "dotDotDash",          // 9
  "triple",              // 10
  "thinThickSmall",      // 11
  "thickThinSmall",      // 12
  "thinThickThinSmall",  // 13
  "thinThickMedium",     // 14
  "thickThinMedium",     // 15
  "thinThickThinMedium", // 16
  "thinThickLarge",      // 17
  "thickThinLarge",      // 18
  "thinThickThinLarge",  // 19
  "wave",                // 20
  "doubleWave",          // 21
  "dashSmall",           // 22
  "dashDotStroked",      // 23
  "emboss3D",            // 24
  "engrave3D",           // 25
];

/**
 * Convert COLORREF bytes (R, G, B at offset) to "RRGGBB" hex string.
 * Returns undefined for auto color (all zeros) or cvAuto (0xFF000000).
 */
export function colorrefToHex(data: Uint8Array, offset: number): string | undefined {
  if (offset + 4 > data.length) return undefined;
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];
  // Skip all-zero (transparent/auto) and 0xFF flag byte (cvAuto)
  if (r === 0 && g === 0 && b === 0) return undefined;
  if (data[offset + 3] === 0xff) return undefined;
  return (
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b.toString(16).padStart(2, "0")
  ).toUpperCase();
}

/**
 * Parse a BRC80 (legacy border code, 4 bytes) at the given offset.
 *
 * Layout: dptLineWidth(1B) + brcType(1B) + ico(1B) + dptSpace(5bits)+flags(3bits)
 */
export function parseBrc80(data: Uint8Array, offset: number): DocBorder | undefined {
  if (offset + 4 > data.length) return undefined;

  const dptLineWidth = data[offset];
  const brcType = data[offset + 1];
  const ico = data[offset + 2];

  if (brcType === 0 && dptLineWidth === 0) return undefined;

  const style = brcType < BRC_TYPE_MAP.length ? BRC_TYPE_MAP[brcType] : undefined;
  const color = ico < ICO_COLORS.length ? ICO_COLORS[ico] : undefined;

  return {
    ...(style ? { style } : {}),
    ...(dptLineWidth > 0 ? { width: dptLineWidth } : {}),
    ...(color ? { color } : {}),
  };
}

/**
 * Parse a modern BRC (8 bytes) at the given offset.
 *
 * Layout: cv(4B COLORREF) + dptLineWidth(1B) + brcType(1B) + dptSpace(5bits)+flags(11bits)
 */
export function parseBrc(data: Uint8Array, offset: number): DocBorder | undefined {
  if (offset + 8 > data.length) return undefined;

  const color = colorrefToHex(data, offset);
  const dptLineWidth = data[offset + 4];
  const brcType = data[offset + 5];

  if (brcType === 0 && dptLineWidth === 0 && !color) return undefined;

  const style = brcType < BRC_TYPE_MAP.length ? BRC_TYPE_MAP[brcType] : undefined;

  return {
    ...(style ? { style } : {}),
    ...(dptLineWidth > 0 ? { width: dptLineWidth } : {}),
    ...(color ? { color } : {}),
  };
}
