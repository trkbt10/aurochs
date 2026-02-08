/**
 * @file Color transformation utilities
 * Shade, tint, luminance, hue, and saturation modifications
 */

import { parseColorToHsl, hslToHexString } from "./convert";

/**
 * Apply shade transformation to a color.
 *
 * Per MS-ODRAWXML and ECMA-376, shade "moves the color towards black".
 * This is implemented as RGB multiplication, not HSL luminance modification.
 * Each RGB component is multiplied by the shade value.
 *
 * shade=100% (1.0) → original color
 * shade=0% (0.0) → black
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3.31 (shade)
 */
export function applyShade(rgbStr: string, shadeValue: number, isAlpha: boolean = false): string {
  // Parse RGB from hex string
  const hex = rgbStr.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const clampedShade = Math.min(Math.max(shadeValue, 0), 1);

  // Apply shade by multiplying each RGB component
  const newR = Math.round(r * clampedShade);
  const newG = Math.round(g * clampedShade);
  const newB = Math.round(b * clampedShade);

  // Convert back to hex
  const toHex = (n: number) => n.toString(16).padStart(2, "0");

  if (isAlpha && hex.length === 8) {
    const a = hex.substring(6, 8);
    return toHex(newR) + toHex(newG) + toHex(newB) + a;
  }

  return toHex(newR) + toHex(newG) + toHex(newB);
}

/**
 * Apply tint transformation to a color.
 *
 * Per MS-ODRAWXML and ECMA-376, tint "moves the color towards white".
 * This is implemented as: newColor = color + (255 - color) * (1 - tint)
 *
 * tint=100% (1.0) → original color
 * tint=0% (0.0) → white
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3.34 (tint)
 */
export function applyTint(rgbStr: string, tintValue: number, isAlpha: boolean = false): string {
  // Parse RGB from hex string
  const hex = rgbStr.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const clampedTint = Math.min(Math.max(tintValue, 0), 1);

  // Apply tint: move towards white (255)
  // Formula: newColor = color + (255 - color) * (1 - tint)
  const newR = Math.round(r + (255 - r) * (1 - clampedTint));
  const newG = Math.round(g + (255 - g) * (1 - clampedTint));
  const newB = Math.round(b + (255 - b) * (1 - clampedTint));

  // Convert back to hex
  const toHex = (n: number) => n.toString(16).padStart(2, "0");

  if (isAlpha && hex.length === 8) {
    const a = hex.substring(6, 8);
    return toHex(newR) + toHex(newG) + toHex(newB) + a;
  }

  return toHex(newR) + toHex(newG) + toHex(newB);
}

/**
 * Apply luminance offset to a color
 */
export function applyLumOff(rgbStr: string, offset: number, isAlpha: boolean = false): string {
  const color = parseColorToHsl(rgbStr);
  const newL = Math.min(Math.max(offset + color.l, 0), 1);

  return hslToHexString({ h: color.h, s: color.s, l: newL, a: color.a }, isAlpha);
}

/**
 * Apply luminance modifier to a color
 */
export function applyLumMod(rgbStr: string, multiplier: number, isAlpha: boolean = false): string {
  const color = parseColorToHsl(rgbStr);
  const newL = Math.min(color.l * multiplier, 1);

  return hslToHexString({ h: color.h, s: color.s, l: newL, a: color.a }, isAlpha);
}

/**
 * Apply hue modifier to a color
 */
export function applyHueMod(rgbStr: string, multiplier: number, isAlpha: boolean = false): string {
  const color = parseColorToHsl(rgbStr);
  const newH = color.h * multiplier >= 360 ? color.h * multiplier - 360 : color.h * multiplier;

  return hslToHexString({ h: newH, s: color.s, l: color.l, a: color.a }, isAlpha);
}

/**
 * Apply saturation modifier to a color
 */
export function applySatMod(rgbStr: string, multiplier: number, isAlpha: boolean = false): string {
  const color = parseColorToHsl(rgbStr);
  const newS = Math.min(color.s * multiplier, 1);

  return hslToHexString({ h: color.h, s: newS, l: color.l, a: color.a }, isAlpha);
}

/**
 * Apply sRGB gamma encoding to a channel (0-255).
 * Converts from linear RGB to sRGB color space.
 *
 * @see IEC 61966-2-1:1999 (sRGB specification)
 */
export function applySrgbGamma(channel: number): number {
  const c = Math.max(0, Math.min(255, channel)) / 255;
  const encoded = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(encoded * 255);
}

/**
 * Apply inverse sRGB gamma decoding to a channel (0-255).
 * Converts from sRGB to linear RGB color space.
 *
 * @see IEC 61966-2-1:1999 (sRGB specification)
 */
export function applySrgbInvGamma(channel: number): number {
  const c = Math.max(0, Math.min(255, channel)) / 255;
  const decoded = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return Math.round(decoded * 255);
}
