/**
 * @file Color atom parsers and color resolution
 *
 * @see [MS-PPT] Section 2.12.1 (ColorSchemeAtom)
 * @see [MS-ODRAW] Section 2.2.1 (MSOCOLORREF)
 */

import type { PptRecord } from "../types";
import { RT } from "../record-types";

export type ColorScheme = {
  readonly background: string;
  readonly textAndLines: string;
  readonly shadows: string;
  readonly titleText: string;
  readonly fills: string;
  readonly accent: string;
  readonly accentAndHyperlink: string;
  readonly accentAndFollowedHyperlink: string;
};

/** Parse ColorSchemeAtom (recType=0x07F0). Contains 8 colors (4 bytes each, BGR format). */
export function parseColorSchemeAtom(record: PptRecord): ColorScheme {
  if (record.recType !== RT.ColorSchemeAtom) {
    throw new Error(`Expected ColorSchemeAtom (0x07F0), got 0x${record.recType.toString(16)}`);
  }

  function readColor(offset: number): string {
    if (offset + 3 > record.data.byteLength) return "000000";
    const r = record.data[offset];
    const g = record.data[offset + 1];
    const b = record.data[offset + 2];
    return toHex(r) + toHex(g) + toHex(b);
  }

  return {
    background: readColor(0),
    textAndLines: readColor(4),
    shadows: readColor(8),
    titleText: readColor(12),
    fills: readColor(16),
    accent: readColor(20),
    accentAndHyperlink: readColor(24),
    accentAndFollowedHyperlink: readColor(28),
  };
}

function toHex(n: number): string {
  return n.toString(16).padStart(2, "0").toUpperCase();
}

/** Default color scheme (PowerPoint default). */
export const DEFAULT_COLOR_SCHEME: ColorScheme = {
  background: "FFFFFF",
  textAndLines: "000000",
  shadows: "808080",
  titleText: "000000",
  fills: "BBE0E3",
  accent: "333399",
  accentAndHyperlink: "0066CC",
  accentAndFollowedHyperlink: "990099",
};

/**
 * Resolve a PPT MSOCOLORREF to hex RGB.
 *
 * PPT stores colors as u32 with flags in the high byte:
 * - 0x00BBGGRR: direct RGB
 * - 0x01BBGGRR: palette index (scheme color)
 * - 0xFEBBGGRR: scheme color by index
 */
export function resolveColor(value: number, scheme: ColorScheme): string {
  const flag = (value >> 24) & 0xFF;
  const r = value & 0xFF;
  const g = (value >> 8) & 0xFF;
  const b = (value >> 16) & 0xFF;

  if (flag === 0xFE || flag === 0x01) {
    // Scheme color by index
    return resolveSchemeColor(r, scheme);
  }

  // Direct RGB
  return toHex(r) + toHex(g) + toHex(b);
}

/** Resolve scheme color by index (0-7). */
export function resolveSchemeColor(index: number, scheme: ColorScheme): string {
  const colors = [
    scheme.background,
    scheme.textAndLines,
    scheme.shadows,
    scheme.titleText,
    scheme.fills,
    scheme.accent,
    scheme.accentAndHyperlink,
    scheme.accentAndFollowedHyperlink,
  ];
  return colors[index] ?? "000000";
}
