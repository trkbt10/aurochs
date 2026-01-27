/**
 * @file Color conversion utilities for UI components
 *
 * Wraps the base color conversion functions from src/color to adapt them
 * for UI display formats (e.g., s/l values as 0-100 instead of 0-1).
 */

import {
  hexToRgb as hexToRgbBase,
  rgbToHex as rgbToHexBase,
  rgbToHsl as rgbToHslBase,
  hslToRgb as hslToRgbBase,
} from "@oxen/color";

export type RgbColor = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
};

export type HslColor = {
  readonly h: number;
  readonly s: number;
  readonly l: number;
};

/**
 * Convert hex color to RGB values (0-255).
 * @param hex - Hex color string (6 characters, without #)
 */
export function hexToRgb(hex: string): RgbColor {
  const rgb = hexToRgbBase(hex);
  return {
    r: Math.round(rgb.r),
    g: Math.round(rgb.g),
    b: Math.round(rgb.b),
  };
}

/**
 * Convert RGB values to uppercase hex string (without #).
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return rgbToHexBase(r, g, b).toUpperCase();
}

/**
 * Convert RGB values to HSL.
 * @returns HSL with h in 0-360, s/l in 0-100 (UI format)
 */
export function rgbToHsl(r: number, g: number, b: number): HslColor {
  const hsl = rgbToHslBase(r, g, b);
  return {
    h: Math.round(hsl.h),
    s: Math.round(hsl.s * 100),
    l: Math.round(hsl.l * 100),
  };
}

/**
 * Convert HSL values to RGB.
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100, UI format)
 * @param l - Lightness (0-100, UI format)
 */
export function hslToRgb(h: number, s: number, l: number): RgbColor {
  const rgb = hslToRgbBase(h, s / 100, l / 100);
  return {
    r: Math.round(rgb.r),
    g: Math.round(rgb.g),
    b: Math.round(rgb.b),
  };
}

/**
 * Parse and validate a hex color input string.
 * @returns Normalized uppercase hex string if valid, null otherwise
 */
export function parseHexInput(input: string): string | null {
  const hex = input.replace(/^#/, "").slice(0, 6).toUpperCase();
  if (/^[0-9A-F]{6}$/i.test(hex)) {
    return hex;
  }
  return null;
}

/**
 * Convert hex to CSS rgba() compatible string "r, g, b".
 */
export function hexToRgbCss(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `${r}, ${g}, ${b}`;
}
