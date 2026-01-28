/**
 * @file Color interpolation utilities for animation
 *
 * Provides color interpolation for PPTX color animations.
 * Uses src/color for color conversion (no duplication).
 *
 * @see ECMA-376 Part 1, Section 19.5.2 (p:animClr)
 */

import type {
  AnimateColorBehavior,
  AnimateColorSpace,
  AnimateColorDirection,
} from "@oxen-office/pptx/domain/animation";
import type { HslColor, RgbColor } from "@oxen/color";
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  getColorName2Hex,
} from "@oxen/color";
import { lerp } from "./engine";

// =============================================================================
// Types
// =============================================================================

/**
 * Parsed color with alpha
 */
export type ParsedColor = {
  readonly rgb: RgbColor;
  readonly alpha: number; // 0-1
};

// =============================================================================
// Color Parsing
// =============================================================================

/**
 * Parse a color string into RGB values.
 *
 * Supported formats:
 * - "#RRGGBB" (hex)
 * - "#RGB" (short hex)
 * - "#AARRGGBB" (hex with alpha)
 * - "rgb(r, g, b)"
 * - "rgba(r, g, b, a)"
 * - "hsl(h, s%, l%)"
 * - "hsla(h, s%, l%, a)"
 * - Named colors
 *
 * @param color - Color string
 * @returns Parsed color or undefined if unparseable
 */
export function parseColor(color: string | undefined): ParsedColor | undefined {
  if (!color || typeof color !== "string") {
    return undefined;
  }

  const trimmed = color.trim().toLowerCase();

  // Hex colors
  if (trimmed.startsWith("#")) {
    return parseHexColor(trimmed);
  }

  // RGB/RGBA
  if (trimmed.startsWith("rgb")) {
    return parseRGBString(trimmed);
  }

  // HSL/HSLA
  if (trimmed.startsWith("hsl")) {
    return parseHSLString(trimmed);
  }

  // Named colors - use existing getColorName2Hex
  const hex = getColorName2Hex(trimmed);
  if (hex) {
    const rgb = hexToRgb(hex);
    return { rgb, alpha: 1 };
  }

  // Handle "transparent"
  if (trimmed === "transparent") {
    return { rgb: { r: 0, g: 0, b: 0 }, alpha: 0 };
  }

  return undefined;
}

/**
 * Parse hex color string.
 */
function parseHexColor(hex: string): ParsedColor | undefined {
  const h = hex.slice(1);

  // #RGB or #RGBA
  if (h.length === 3 || h.length === 4) {
    const rgb = hexToRgb(h.slice(0, 3));
    const alpha = h.length === 4 ? parseInt(h[3] + h[3], 16) / 255 : 1;
    return { rgb, alpha };
  }

  // #RRGGBB
  if (h.length === 6) {
    const rgb = hexToRgb(h);
    return { rgb, alpha: 1 };
  }

  // #AARRGGBB (PPTX format) or #RRGGBBAA
  if (h.length === 8) {
    // Try AARRGGBB first (PPTX format)
    const alpha = parseInt(h.slice(0, 2), 16) / 255;
    const rgb = hexToRgb(h.slice(2, 8));
    return { rgb, alpha };
  }

  return undefined;
}

/**
 * Parse rgb() or rgba() color string.
 */
function parseRGBString(str: string): ParsedColor | undefined {
  const match = str.match(
    /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/
  );

  if (!match) {
    return undefined;
  }

  const rgb: RgbColor = {
    r: Math.min(255, Math.max(0, parseInt(match[1], 10))),
    g: Math.min(255, Math.max(0, parseInt(match[2], 10))),
    b: Math.min(255, Math.max(0, parseInt(match[3], 10))),
  };
  const alpha = match[4] !== undefined ? parseFloat(match[4]) : 1;

  return { rgb, alpha };
}

/**
 * Parse hsl() or hsla() color string.
 */
function parseHSLString(str: string): ParsedColor | undefined {
  const match = str.match(
    /hsla?\s*\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?\s*(?:,\s*([\d.]+)\s*)?\)/
  );

  if (!match) {
    return undefined;
  }

  const h = parseInt(match[1], 10) % 360;
  const s = Math.min(100, Math.max(0, parseInt(match[2], 10))) / 100;
  const l = Math.min(100, Math.max(0, parseInt(match[3], 10))) / 100;
  const alpha = match[4] !== undefined ? parseFloat(match[4]) : 1;

  // Use existing hslToRgb (note: it expects h in degrees, s/l in 0-1 range)
  const rgb = hslToRgb(h, s, l);
  return {
    rgb: {
      r: Math.round(rgb.r),
      g: Math.round(rgb.g),
      b: Math.round(rgb.b),
    },
    alpha,
  };
}

// =============================================================================
// Color Interpolation
// =============================================================================

/**
 * Interpolate between two RGB colors.
 *
 * @param from - Start color
 * @param to - End color
 * @param t - Progress (0-1)
 * @returns Interpolated color
 */
export function lerpRGB(from: RgbColor, to: RgbColor, t: number): RgbColor {
  return {
    r: Math.round(lerp(from.r, to.r, t)),
    g: Math.round(lerp(from.g, to.g, t)),
    b: Math.round(lerp(from.b, to.b, t)),
  };
}

/**
 * Interpolate between two HSL colors with direction control.
 *
 * @param from - Start color (h: 0-360, s/l: 0-1)
 * @param to - End color (h: 0-360, s/l: 0-1)
 * @param t - Progress (0-1)
 * @param direction - Hue rotation direction: "cw" (clockwise) or "ccw" (counter-clockwise)
 * @returns Interpolated color
 */
export function lerpHSL(
  from: HslColor,
  to: HslColor,
  t: number,
  direction: AnimateColorDirection = "cw"
): HslColor {
  // Handle saturation and lightness linearly
  const s = lerp(from.s, to.s, t);
  const l = lerp(from.l, to.l, t);

  // Handle hue with direction
  const fromH = ((from.h % 360) + 360) % 360;
  const toH = ((to.h % 360) + 360) % 360;

  let delta = toH - fromH;

  if (direction === "cw") {
    // Clockwise: positive direction
    if (delta < 0) {
      delta += 360;
    }
  } else {
    // Counter-clockwise: negative direction
    if (delta > 0) {
      delta -= 360;
    }
  }

  const h = ((fromH + delta * t) % 360 + 360) % 360;

  return { h, s, l };
}

/**
 * Interpolate between two colors.
 *
 * @param from - Start color (parsed)
 * @param to - End color (parsed)
 * @param t - Progress (0-1)
 * @param colorSpace - Color space for interpolation
 * @param direction - Direction for HSL hue interpolation
 * @returns Interpolated color as CSS string
 */
export function interpolateColor(
  from: ParsedColor,
  to: ParsedColor,
  t: number,
  colorSpace: AnimateColorSpace = "rgb",
  direction: AnimateColorDirection = "cw"
): string {
  // Interpolate alpha
  const alpha = lerp(from.alpha, to.alpha, t);

  let rgb: RgbColor;

  if (colorSpace === "hsl") {
    // Convert to HSL using existing utility
    const fromHsl = rgbToHsl(from.rgb.r, from.rgb.g, from.rgb.b);
    const toHsl = rgbToHsl(to.rgb.r, to.rgb.g, to.rgb.b);
    const hsl = lerpHSL(fromHsl, toHsl, t, direction);
    const converted = hslToRgb(hsl.h, hsl.s, hsl.l);
    rgb = {
      r: Math.round(converted.r),
      g: Math.round(converted.g),
      b: Math.round(converted.b),
    };
  } else {
    // RGB interpolation
    rgb = lerpRGB(from.rgb, to.rgb, t);
  }

  // Return CSS color string
  if (alpha < 1) {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(3)})`;
  }

  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

/**
 * Convert RGB to hex string using existing utility.
 */
export function rgbToHexString(rgb: RgbColor): string {
  return "#" + rgbToHex(rgb.r, rgb.g, rgb.b);
}

// =============================================================================
// AnimateColorBehavior Processing
// =============================================================================

/**
 * Create an animation function for color animation.
 *
 * @param behavior - AnimateColorBehavior from timing tree
 * @param element - Target DOM element
 * @returns Animation update function (progress: 0-1) => void
 */
export function createColorAnimationFunction(
  behavior: AnimateColorBehavior,
  element: HTMLElement | SVGElement
): (progress: number) => void {
  const { attribute, colorSpace, direction, from, to, by } = behavior;

  // Parse colors
  const fromColor = parseColor(from);
  let toColor = parseColor(to);

  // Handle "by" for relative color change
  if (!toColor && by && fromColor) {
    // Parse by as color adjustment (simplified - treat as target color)
    toColor = parseColor(by);
  }

  // If we can't parse colors, return no-op
  if (!fromColor || !toColor) {
    return () => {};
  }

  // Determine CSS property from attribute
  let cssProperty: string;
  if (attribute.includes("fill") || attribute === "fillcolor") {
    cssProperty = element instanceof SVGElement ? "fill" : "background-color";
  } else if (attribute.includes("stroke")) {
    cssProperty = element instanceof SVGElement ? "stroke" : "border-color";
  } else if (attribute.includes("color")) {
    cssProperty = "color";
  } else {
    cssProperty = "background-color";
  }

  return (progress: number) => {
    const color = interpolateColor(
      fromColor,
      toColor!,
      progress,
      colorSpace ?? "rgb",
      direction ?? "cw"
    );

    if (element instanceof SVGElement && (cssProperty === "fill" || cssProperty === "stroke")) {
      element.setAttribute(cssProperty, color);
    } else {
      element.style.setProperty(cssProperty, color);
    }
  };
}
