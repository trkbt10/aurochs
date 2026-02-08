/**
 * @file SpreadsheetML color resolver (XLSX → CSS)
 *
 * Converts ECMA-376 SpreadsheetML color specs (rgb/theme/indexed/auto)
 * into CSS color strings.
 */

export type XlsxColorLike =
  | { readonly type: "rgb"; readonly value: string }
  | { readonly type: "theme"; readonly theme: number; readonly tint?: number }
  | { readonly type: "indexed"; readonly index: number }
  | { readonly type: "auto" };

export type XlsxColorToCssOptions = {
  /**
   * Indexed palette override from `styles.xml` (`colors/indexedColors`).
   *
   * Values are stored as 8-hex strings (commonly `00RRGGBB` in POI fixtures).
   */
  readonly indexedColors?: readonly string[];
};

function clampByte(n: number): number {
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.max(0, Math.min(255, Math.round(n)));
}

function normalizeArgb(value: string): string | undefined {
  const raw = value.trim();
  const hex = raw.startsWith("#") ? raw.slice(1) : raw;
  if (!/^[0-9a-fA-F]{8}$/u.test(hex)) {
    return undefined;
  }
  return hex.toUpperCase();
}

function argbToRgba(argb: string): { readonly r: number; readonly g: number; readonly b: number; readonly a: number } | undefined {
  const hex = normalizeArgb(argb);
  if (!hex) {
    return undefined;
  }
  const a = Number.parseInt(hex.slice(0, 2), 16);
  const r = Number.parseInt(hex.slice(2, 4), 16);
  const g = Number.parseInt(hex.slice(4, 6), 16);
  const b = Number.parseInt(hex.slice(6, 8), 16);
  if (![a, r, g, b].every((n) => Number.isFinite(n))) {
    return undefined;
  }
  return { r, g, b, a };
}

function rgbToHex6(r: number, g: number, b: number): string {
  const to2 = (n: number): string => clampByte(n).toString(16).padStart(2, "0").toUpperCase();
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

function rgbaToCss(rgba: { readonly r: number; readonly g: number; readonly b: number; readonly a: number }): string {
  const { r, g, b, a } = rgba;
  if (a >= 255) {
    return rgbToHex6(r, g, b);
  }
  const alpha = Math.max(0, Math.min(1, a / 255));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function normalizePaletteEntry(value: string): string | undefined {
  const raw = value.trim();
  const hex = raw.startsWith("#") ? raw.slice(1) : raw;
  if (!/^[0-9a-fA-F]{8}$/u.test(hex)) {
    return undefined;
  }
  return hex.toUpperCase();
}

function paletteEntryToCss(value: string): string | undefined {
  const hex = normalizePaletteEntry(value);
  if (!hex) {
    return undefined;
  }
  const alpha = hex.slice(0, 2);
  if (alpha === "00") {
    return `#${hex.slice(2, 8)}`;
  }
  const rgba = argbToRgba(hex);
  return rgba ? rgbaToCss(rgba) : undefined;
}

function applyTint(channel: number, tint: number): number {
  if (!Number.isFinite(tint) || tint === 0) {
    return channel;
  }
  if (tint < 0) {
    return channel * (1 + tint);
  }
  return channel * (1 - tint) + 255 * tint;
}

function applyThemeTint(rgb: { readonly r: number; readonly g: number; readonly b: number }, tint: number | undefined): { readonly r: number; readonly g: number; readonly b: number } {
  if (tint === undefined) {
    return rgb;
  }
  return {
    r: clampByte(applyTint(rgb.r, tint)),
    g: clampByte(applyTint(rgb.g, tint)),
    b: clampByte(applyTint(rgb.b, tint)),
  };
}

// NOTE: This is the common legacy indexed palette used by many XLSX writers.
// For full fidelity, indexed colors may be overridden by a workbook palette in theme/legacy contexts.
const DEFAULT_INDEXED_RGB: readonly { readonly r: number; readonly g: number; readonly b: number }[] = [
  { r: 0, g: 0, b: 0 },       // 0
  { r: 255, g: 255, b: 255 }, // 1
  { r: 255, g: 0, b: 0 },     // 2
  { r: 0, g: 255, b: 0 },     // 3
  { r: 0, g: 0, b: 255 },     // 4
  { r: 255, g: 255, b: 0 },   // 5
  { r: 255, g: 0, b: 255 },   // 6
  { r: 0, g: 255, b: 255 },   // 7
  { r: 0, g: 0, b: 0 },       // 8
  { r: 255, g: 255, b: 255 }, // 9
  { r: 255, g: 0, b: 0 },     // 10
  { r: 0, g: 255, b: 0 },     // 11
  { r: 0, g: 0, b: 255 },     // 12
  { r: 255, g: 255, b: 0 },   // 13
  { r: 255, g: 0, b: 255 },   // 14
  { r: 0, g: 255, b: 255 },   // 15
  { r: 128, g: 0, b: 0 },     // 16
  { r: 0, g: 128, b: 0 },     // 17
  { r: 0, g: 0, b: 128 },     // 18
  { r: 128, g: 128, b: 0 },   // 19
  { r: 128, g: 0, b: 128 },   // 20
  { r: 0, g: 128, b: 128 },   // 21
  { r: 192, g: 192, b: 192 }, // 22
  { r: 128, g: 128, b: 128 }, // 23
  { r: 153, g: 153, b: 255 }, // 24
  { r: 153, g: 51, b: 102 },  // 25
  { r: 255, g: 255, b: 204 }, // 26
  { r: 204, g: 255, b: 255 }, // 27
  { r: 102, g: 0, b: 102 },   // 28
  { r: 255, g: 128, b: 128 }, // 29
  { r: 0, g: 102, b: 204 },   // 30
  { r: 204, g: 204, b: 255 }, // 31
  { r: 0, g: 0, b: 128 },     // 32
  { r: 255, g: 0, b: 255 },   // 33
  { r: 255, g: 255, b: 0 },   // 34
  { r: 0, g: 255, b: 255 },   // 35
  { r: 128, g: 0, b: 128 },   // 36
  { r: 128, g: 0, b: 0 },     // 37
  { r: 0, g: 128, b: 128 },   // 38
  { r: 0, g: 0, b: 255 },     // 39
  { r: 0, g: 204, b: 255 },   // 40
  { r: 204, g: 255, b: 255 }, // 41
  { r: 204, g: 255, b: 204 }, // 42
  { r: 255, g: 255, b: 153 }, // 43
  { r: 153, g: 204, b: 255 }, // 44
  { r: 255, g: 153, b: 204 }, // 45
  { r: 204, g: 153, b: 255 }, // 46
  { r: 255, g: 204, b: 153 }, // 47
  { r: 51, g: 102, b: 255 },  // 48
  { r: 51, g: 204, b: 204 },  // 49
  { r: 153, g: 204, b: 0 },   // 50
  { r: 255, g: 204, b: 0 },   // 51
  { r: 255, g: 153, b: 0 },   // 52
  { r: 255, g: 102, b: 0 },   // 53
  { r: 102, g: 102, b: 153 }, // 54
  { r: 150, g: 150, b: 150 }, // 55
  { r: 0, g: 51, b: 102 },    // 56
  { r: 51, g: 153, b: 102 },  // 57
  { r: 0, g: 51, b: 0 },      // 58
  { r: 51, g: 51, b: 0 },     // 59
  { r: 153, g: 51, b: 0 },    // 60
  { r: 153, g: 51, b: 102 },  // 61
  { r: 51, g: 51, b: 153 },   // 62
  { r: 51, g: 51, b: 51 },    // 63
];

// NOTE: Without parsing theme1.xml, we use common "Office" defaults.
// Index mapping is per SpreadsheetML CT_Color theme indices (0..11).
const DEFAULT_THEME_RGB: readonly { readonly r: number; readonly g: number; readonly b: number }[] = [
  { r: 0, g: 0, b: 0 },       // 0: dk1
  { r: 255, g: 255, b: 255 }, // 1: lt1
  { r: 31, g: 73, b: 125 },   // 2: dk2
  { r: 238, g: 236, b: 225 }, // 3: lt2
  { r: 79, g: 129, b: 189 },  // 4: accent1
  { r: 192, g: 80, b: 77 },   // 5: accent2
  { r: 155, g: 187, b: 89 },  // 6: accent3
  { r: 128, g: 100, b: 162 }, // 7: accent4
  { r: 75, g: 172, b: 198 },  // 8: accent5
  { r: 247, g: 150, b: 70 },  // 9: accent6
  { r: 0, g: 0, b: 255 },     // 10: hlink
  { r: 128, g: 0, b: 128 },   // 11: folHlink
];

function indexedToRgb(index: number): { readonly r: number; readonly g: number; readonly b: number } | undefined {
  if (!Number.isInteger(index)) {
    return undefined;
  }
  if (index < 0 || index >= DEFAULT_INDEXED_RGB.length) {
    return undefined;
  }
  return DEFAULT_INDEXED_RGB[index];
}

function themeToRgb(theme: number): { readonly r: number; readonly g: number; readonly b: number } | undefined {
  if (!Number.isInteger(theme)) {
    return undefined;
  }
  if (theme < 0 || theme >= DEFAULT_THEME_RGB.length) {
    return undefined;
  }
  return DEFAULT_THEME_RGB[theme];
}

/**
 * Convert an OOXML color value into a CSS hex string (e.g. `#RRGGBB`).
 *
 * Supports rgb/indexed/theme colors and applies theme tint when present.
 */
export function xlsxColorToCss(color: XlsxColorLike | undefined, options?: XlsxColorToCssOptions): string | undefined {
  if (!color) {
    return undefined;
  }
  if (color.type === "auto") {
    return undefined;
  }
  if (color.type === "rgb") {
    const rgba = argbToRgba(color.value);
    return rgba ? rgbaToCss(rgba) : undefined;
  }
  if (color.type === "indexed") {
    const palette = options?.indexedColors;
    const paletteEntry = palette?.[color.index];
    if (paletteEntry) {
      const resolved = paletteEntryToCss(paletteEntry);
      if (resolved) {
        return resolved;
      }
    }
    const rgb = indexedToRgb(color.index);
    return rgb ? rgbToHex6(rgb.r, rgb.g, rgb.b) : undefined;
  }
  if (color.type === "theme") {
    const base = themeToRgb(color.theme);
    if (!base) {
      return undefined;
    }
    const tinted = applyThemeTint(base, color.tint);
    return rgbToHex6(tinted.r, tinted.g, tinted.b);
  }
  return undefined;
}
