/**
 * @file Color conversion utilities
 * RGB, HSL, Hex color space conversions
 */

import type { HslColor, RgbColor } from "./types";

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): RgbColor {
  const cleanHex = hex.replace(/^#/, "");
  const bigint = parseInt(cleanHex, 16);

  if (cleanHex.length === 3) {
    return {
      r: ((bigint >> 8) & 0xf) * 17,
      g: ((bigint >> 4) & 0xf) * 17,
      b: (bigint & 0xf) * 17,
    };
  }

  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

/**
 * Convert a number to 2-digit hex
 */
export function toHex(n: number): string {
  const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
  return hex.length < 2 ? "0" + hex : hex;
}

/**
 * Convert RGB to hex string
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return toHex(Math.round(r)) + toHex(Math.round(g)) + toHex(Math.round(b));
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(r: number, g: number, b: number): HslColor {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  const hueMap: Record<number, () => number> = {
    [rNorm]: () => ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6,
    [gNorm]: () => ((bNorm - rNorm) / d + 2) / 6,
    [bNorm]: () => ((rNorm - gNorm) / d + 4) / 6,
  };

  const h = (hueMap[max]?.() ?? 0) * 360;

  return { h, s, l };
}

function hueToRgb(t1: number, t2: number, hue: number): number {
  const h = hue < 0 ? hue + 6 : hue >= 6 ? hue - 6 : hue;
  if (h < 1) {
    return (t2 - t1) * h + t1;
  }
  if (h < 3) {
    return t2;
  }
  if (h < 4) {
    return (t2 - t1) * (4 - h) + t1;
  }
  return t1;
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(hue: number, sat: number, light: number): RgbColor {
  const h = hue / 60;
  const t2 = light <= 0.5 ? light * (sat + 1) : light + sat - light * sat;
  const t1 = light * 2 - t2;

  return {
    r: hueToRgb(t1, t2, h + 2) * 255,
    g: hueToRgb(t1, t2, h) * 255,
    b: hueToRgb(t1, t2, h - 2) * 255,
  };
}

/**
 * Parse a color string to HSL
 */
export function parseColorToHsl(colorStr: string): HslColor {
  const cleanColor = colorStr.replace(/^#/, "");
  const rgb = hexToRgb(cleanColor);
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

/**
 * Convert HSL color back to hex string
 */
export function hslToHexString(hsl: HslColor, includeAlpha: boolean = false): string {
  const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

  if (includeAlpha && hsl.a !== undefined) {
    return hex + toHex(Math.round(hsl.a * 255));
  }

  return hex;
}

/**
 * Convert RGBA string to hex
 */
export function rgba2hex(rgbaStr: string): string {
  const match = rgbaStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) {
    return rgbaStr.replace(/^#/, "");
  }

  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  const a = match[4] ? parseFloat(match[4]) : 1;

  const hex = rgbToHex(r, g, b);
  if (a < 1) {
    return hex + toHex(Math.round(a * 255));
  }

  return hex;
}
