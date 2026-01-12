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
 * Convert ICCBased color to sRGB
 *
 * PDF Reference 8.6.5.5 - ICCBased Color Spaces:
 * An ICCBased color space is defined by an ICC profile stream.
 * The N entry in the profile stream dictionary specifies the number of components.
 *
 * Without full ICC profile parsing, we fall back to the alternate color space
 * based on the number of components:
 * - N=1: DeviceGray
 * - N=3: DeviceRGB
 * - N=4: DeviceCMYK
 *
 * Note: This is a naive conversion that does not apply ICC profile color transforms.
 * For accurate color reproduction, a full ICC profile parser would be required.
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

  // Fallback: return black
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

  let color: Color = baseColor;
  if (a < 1) {
    color = { ...baseColor, transform: { ...baseColor.transform, alpha: pct(a * 100) } };
  }

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
): Line {
  return {
    fill: convertFill(strokeColor, alpha),
    width: px(lineWidth),
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
 */
export function convertGraphicsStateToStyle(
  graphicsState: PdfGraphicsState,
  paintOp: "stroke" | "fill" | "fillStroke",
): { fill: Fill | undefined; line: Line | undefined } {
  let fill: Fill | undefined;
  let line: Line | undefined;

  if (paintOp === "fill" || paintOp === "fillStroke") {
    fill = convertFill(graphicsState.fillColor, graphicsState.fillAlpha);
  }

  if (paintOp === "stroke" || paintOp === "fillStroke") {
    line = convertLine(
      graphicsState.strokeColor,
      graphicsState.lineWidth,
      graphicsState.lineCap,
      graphicsState.lineJoin,
      graphicsState.dashArray,
      graphicsState.dashPhase,
      graphicsState.strokeAlpha,
    );
  }

  return { fill, line };
}
