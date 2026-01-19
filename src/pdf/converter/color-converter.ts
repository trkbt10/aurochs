/**
 * @file src/pdf/converter/color-converter.ts
 */

import type { PdfColor, PdfGraphicsState, PdfLineCap, PdfLineJoin, PdfAlternateColorSpace } from "../domain";
import { grayToRgb, cmykToRgb, rgbToHex, clamp01, toByte } from "../domain/color";
import type { Color } from "../../ooxml/domain/color";
import { pct, px } from "../../ooxml/domain/units";
import type { DashStyle, LineCap, LineJoin } from "../../pptx/domain/line";
import type { Fill, Line } from "../../pptx/domain/color/types";

/**
 * PDF色をPPTX Colorに変換
 *
 * Color space handling (PDF Reference 8.6):
 * - DeviceGray: Direct grayscale conversion
 * - DeviceRGB: Direct RGB conversion
 * - DeviceCMYK: Naive CMYK→RGB conversion (no ICC profile)
 * - ICCBased: Falls back to alternate color space (ICC profile parsing not implemented)
 * - Pattern: Returns black (pattern rendering not supported)
 *
 * Note: For accurate color reproduction, ICC profile parsing would be required.
 * Currently, ICCBased colors use a naive conversion based on the alternate color space.
 */
export function convertColor(pdfColor: PdfColor): Color {
  switch (pdfColor.colorSpace) {
    case "DeviceGray":
      return convertGrayToSrgb(pdfColor.components[0] ?? 0);
    case "DeviceRGB":
      return convertRgbToSrgb(pdfColor.components);
    case "DeviceCMYK":
      return convertCmykToSrgb(pdfColor.components);
    case "ICCBased":
      return convertIccBasedToSrgb(pdfColor.components, pdfColor.alternateColorSpace);
    case "Pattern":
      // Pattern color spaces are complex and not yet supported
      return { spec: { type: "srgb", value: "000000" } };
    default:
      return { spec: { type: "srgb", value: "000000" } };
  }
}

/**
 * Convert ICCBased color to sRGB.
 *
 * ## Limitations
 *
 * This implementation does NOT parse ICC profiles. Instead, it:
 * 1. Uses the AlternateColorSpace if specified in the PDF
 * 2. Falls back to guessing based on component count:
 *    - 1 component: DeviceGray
 *    - 3 components: DeviceRGB
 *    - 4 components: DeviceCMYK
 *
 * This approach may result in color inaccuracy for:
 * - Professional print PDFs with calibrated colors
 * - Wide-gamut color spaces (Adobe RGB, ProPhoto RGB)
 * - Lab or other perceptual color spaces
 *
 * ## Future Improvements
 *
 * To properly support ICC profiles, we would need to:
 * 1. Parse the ICC profile embedded in the PDF
 * 2. Use a color management library (e.g., lcms2)
 * 3. Convert through PCS (Profile Connection Space)
 *
 * @see PDF Reference 1.7, Section 8.6.5.5 (ICCBased Color Spaces)
 * @see ICC.1:2022 (ICC Profile Format Specification)
 */
function convertIccBasedToSrgb(
  components: readonly number[],
  alternateColorSpace?: PdfAlternateColorSpace
): Color {
  // Use provided alternate color space if available
  if (alternateColorSpace) {
    switch (alternateColorSpace) {
      case "DeviceGray":
        return convertGrayToSrgb(components[0] ?? 0);
      case "DeviceRGB":
        return convertRgbToSrgb(components);
      case "DeviceCMYK":
        return convertCmykToSrgb(components);
    }
  }

  // Infer alternate color space from component count
  // This is a fallback when the PDF doesn't specify an alternate color space
  const n = components.length;
  if (n === 1) {
    return convertGrayToSrgb(components[0] ?? 0);
  }
  if (n === 3) {
    return convertRgbToSrgb(components);
  }
  if (n === 4) {
    return convertCmykToSrgb(components);
  }

  // Unknown component count - cannot determine color space
  // Supported: 1 (Gray), 3 (RGB), 4 (CMYK)
  // Unsupported: 2 (e.g., two-color printing), 5+ (e.g., Hexachrome)
  console.warn(
    `[PDF Color] Cannot convert ICCBased color with ${n} components. ` +
      `Supported: 1 (Gray), 3 (RGB), 4 (CMYK). Falling back to black.`
  );
  return { spec: { type: "srgb", value: "000000" } };
}

function convertGrayToSrgb(gray: number): Color {
  const [r, g, b] = grayToRgb(gray);
  return { spec: { type: "srgb", value: rgbToHex(r, g, b) } };
}

function convertRgbToSrgb(components: readonly number[]): Color {
  const [r = 0, g = 0, b = 0] = components;
  return {
    spec: {
      type: "srgb",
      value: rgbToHex(toByte(r), toByte(g), toByte(b)),
    },
  };
}

function convertCmykToSrgb(components: readonly number[]): Color {
  const [c = 0, m = 0, y = 0, k = 0] = components;
  const [r, g, b] = cmykToRgb(c, m, y, k);
  return {
    spec: {
      type: "srgb",
      value: rgbToHex(r, g, b),
    },
  };
}

/**
 * PDF塗りつぶし色をPPTX Fillに変換
 */
export function convertFill(pdfColor: PdfColor, alpha: number = 1): Fill {
  const baseColor = convertColor(pdfColor);
  const a = clamp01(alpha);

  const color: Color =
    a < 1 ? { ...baseColor, transform: { ...baseColor.transform, alpha: pct(a * 100) } } : baseColor;

  return {
    type: "solidFill",
    color,
  };
}

/**
 * 塗りつぶしなしを示すFill
 */
export function noFill(): Fill {
  return { type: "noFill" };
}

/**
 * PDF線スタイルをPPTX Lineに変換
 */
export function convertLine(
  strokeColor: PdfColor,
  lineWidth: number,
  lineCap: PdfLineCap,
  lineJoin: PdfLineJoin,
  dashArray: readonly number[],
  _dashPhase: number,
  alpha: number = 1,
  widthScale: number = 1,
): Line {
  if (!Number.isFinite(widthScale) || widthScale <= 0) {
    throw new Error(`Invalid widthScale: ${widthScale}`);
  }
  const scaledWidth = lineWidth * widthScale;
  return {
    fill: convertFill(strokeColor, alpha),
    width: px(scaledWidth),
    cap: convertLineCap(lineCap),
    compound: "sng",
    alignment: "ctr",
    join: convertLineJoin(lineJoin),
    dash: convertDashPattern(dashArray),
  };
}

function convertLineCap(pdfCap: PdfLineCap): LineCap {
  switch (pdfCap) {
    case 0:
      return "flat";
    case 1:
      return "round";
    case 2:
      return "square";
    default:
      return "flat";
  }
}

function convertLineJoin(pdfJoin: PdfLineJoin): LineJoin {
  switch (pdfJoin) {
    case 0:
      return "miter";
    case 1:
      return "round";
    case 2:
      return "bevel";
    default:
      return "miter";
  }
}

function convertDashPattern(dashArray: readonly number[]): DashStyle {
  if (dashArray.length === 0) {
    return "solid";
  }

  const dashLength = Math.abs(dashArray[0] ?? 0);
  const gapLength = Math.abs(dashArray[1] ?? dashLength);

  if (dashArray.length === 1 && dashLength <= 3) {
    return "dot";
  }

  if (dashLength <= 2 && gapLength <= 2) {
    return "dot";
  }

  if (dashLength >= 6) {
    return "lgDash";
  }

  return "dash";
}

/**
 * PdfGraphicsStateからFillとLineを生成
 *
 * For stroke-only paths, explicitly returns noFill to prevent
 * PPTX from applying theme default fills.
 */
export function convertGraphicsStateToStyle(
  graphicsState: PdfGraphicsState,
  paintOp: "stroke" | "fill" | "fillStroke",
  options: { readonly lineWidthScale?: number } = {},
): { fill: Fill | undefined; line: Line | undefined } {
  const style: { fill: Fill | undefined; line: Line | undefined } = { fill: undefined, line: undefined };
  const softMaskAlpha = graphicsState.softMaskAlpha ?? 1;
  const lineWidthScale = options.lineWidthScale ?? 1;

  if (paintOp === "fill" || paintOp === "fillStroke") {
    style.fill = convertFill(graphicsState.fillColor, graphicsState.fillAlpha * softMaskAlpha);
  } else if (paintOp === "stroke") {
    // Explicitly set noFill for stroke-only paths to prevent
    // PPTX theme default fills from being applied
    style.fill = noFill();
  }

  if (paintOp === "stroke" || paintOp === "fillStroke") {
    style.line = convertLine(
      graphicsState.strokeColor,
      graphicsState.lineWidth,
      graphicsState.lineCap,
      graphicsState.lineJoin,
      graphicsState.dashArray,
      graphicsState.dashPhase,
      graphicsState.strokeAlpha * softMaskAlpha,
      lineWidthScale,
    );
  }

  return style;
}
