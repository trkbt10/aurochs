/**
 * @file Primitive parsing utilities
 *
 * Converts XML attribute strings to Domain Object primitive types.
 * All unit conversions are performed here.
 *
 * @see ECMA-376 Part 1, Section 20.1.10 - Simple Types
 */

import type {
  Degrees,
  Percent,
  Pixels,
  Points,
  BlackWhiteMode,
  BlipCompression,
  ColorSchemeIndex,
  FontCollectionIndex,
  OnOffStyleType,
  RectAlignment,
  SchemeColorValue,
  ShapeId,
  StyleMatrixColumnIndex,
  TextShapeType,
  AlignH,
  AlignV,
  RelFromH,
  RelFromV,
  WrapText,
  EditAs,
} from "../domain";
import { px, deg, pct, pt } from "../domain/types";
import { getAttr, getChild, type XmlElement } from "../../xml";

// =============================================================================
// Constants
// =============================================================================

/** EMU per inch (914400) */
const EMU_PER_INCH = 914400;

/** Standard display DPI (96) */
const STANDARD_DPI = 96;

/** Points per inch (72) */
const POINTS_PER_INCH = 72;

/** EMU to pixels factor */
const EMU_TO_PX = STANDARD_DPI / EMU_PER_INCH;

/** Points to pixels factor */
const PT_TO_PX = STANDARD_DPI / POINTS_PER_INCH;

/** Angle units per degree (60000) */
const ANGLE_UNITS_PER_DEGREE = 60000;

/** Percent units per percent (1000 for some, 100000 for others) */
const PERCENT_1000 = 1000;
const PERCENT_100000 = 100000;

// =============================================================================
// Integer/Number Parsing
// =============================================================================

/**
 * Parse integer from string
 */
export function parseInt32(value: string | undefined): number | undefined {
  if (value === undefined) {return undefined;}
  const num = parseInt(value, 10);
  return isNaN(num) ? undefined : num;
}

/**
 * Parse 64-bit integer from string (within JS safe range)
 */
export function parseInt64(value: string | undefined): number | undefined {
  if (value === undefined) {return undefined;}
  const num = parseInt(value, 10);
  if (isNaN(num)) {return undefined;}
  if (!Number.isSafeInteger(num)) {return undefined;}
  return num;
}

/**
 * Parse unsigned 32-bit integer from string
 */
export function parseUnsignedInt(value: string | undefined): number | undefined {
  const num = parseInt64(value);
  if (num === undefined) {return undefined;}
  if (num < 0 || num > 4294967295) {return undefined;}
  return num;
}

/**
 * Parse index (unsigned int)
 * @see ECMA-376 Part 1, Section 19.7.3 (ST_Index)
 */
export function parseIndex(value: string | undefined): number | undefined {
  return parseUnsignedInt(value);
}

/**
 * Parse integer with default value
 */
export function parseInt32Or(value: string | undefined, defaultValue: number): number {
  const num = parseInt32(value);
  return num ?? defaultValue;
}

/**
 * Parse float from string
 */
export function parseFloat64(value: string | undefined): number | undefined {
  if (value === undefined) {return undefined;}
  const num = parseFloat(value);
  return isNaN(num) ? undefined : num;
}

// =============================================================================
// Boolean Parsing
// =============================================================================

/**
 * Parse boolean from string
 * OOXML uses "1", "true", "on" for true; "0", "false", "off" for false
 */
export function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {return undefined;}
  const lower = value.toLowerCase();
  if (lower === "1" || lower === "true" || lower === "on") {return true;}
  if (lower === "0" || lower === "false" || lower === "off") {return false;}
  return undefined;
}

/**
 * Parse boolean with default value
 */
export function parseBooleanOr(value: string | undefined, defaultValue: boolean): boolean {
  const bool = parseBoolean(value);
  return bool ?? defaultValue;
}

// =============================================================================
// EMU (English Metric Units) Parsing
// =============================================================================

/**
 * Parse EMU value to pixels
 * @see ECMA-376 Part 1, Section 20.1.10.16 (ST_Coordinate)
 */
export function parseEmu(value: string | undefined): Pixels | undefined {
  const num = parseInt32(value);
  if (num === undefined) {return undefined;}
  return px(num * EMU_TO_PX);
}

/**
 * Parse coordinate32 (int EMU)
 * @see ECMA-376 Part 1, Section 20.1.10.18 (ST_Coordinate32Unqualified)
 */
export function parseCoordinate32Unqualified(value: string | undefined): Pixels | undefined {
  return parseEmu(value);
}

/**
 * Parse coordinate (long EMU with bounds)
 * @see ECMA-376 Part 1, Section 20.1.10.19 (ST_CoordinateUnqualified)
 */
export function parseCoordinateUnqualified(value: string | undefined): Pixels | undefined {
  const num = parseInt64(value);
  if (num === undefined) {return undefined;}
  if (num < -27273042329600 || num > 27273042316900) {return undefined;}
  return px(num * EMU_TO_PX);
}

/**
 * Parse drawing element id (unsigned int)
 * @see ECMA-376 Part 1, Section 20.1.10.21 (ST_DrawingElementId)
 */
export function parseDrawingElementId(value: string | undefined): number | undefined {
  return parseUnsignedInt(value);
}

/**
 * Parse slide id (unsigned int with min/max)
 * @see ECMA-376 Part 1, Section 19.7.13 (ST_SlideId)
 */
export function parseSlideId(value: string | undefined): number | undefined {
  const num = parseUnsignedInt(value);
  if (num === undefined) {return undefined;}
  if (num < 256 || num >= 2147483648) {return undefined;}
  return num;
}

/**
 * Parse slide layout id (unsigned int with min)
 * @see ECMA-376 Part 1, Section 19.7.14 (ST_SlideLayoutId)
 */
export function parseSlideLayoutId(value: string | undefined): number | undefined {
  const num = parseUnsignedInt(value);
  if (num === undefined) {return undefined;}
  if (num < 2147483648) {return undefined;}
  return num;
}

/**
 * Parse slide master id (unsigned int with min)
 * @see ECMA-376 Part 1, Section 19.7.16 (ST_SlideMasterId)
 */
export function parseSlideMasterId(value: string | undefined): number | undefined {
  const num = parseUnsignedInt(value);
  if (num === undefined) {return undefined;}
  if (num < 2147483648) {return undefined;}
  return num;
}

/**
 * Parse slide size coordinate (EMU, bounded)
 * @see ECMA-376 Part 1, Section 19.7.17 (ST_SlideSizeCoordinate)
 */
export function parseSlideSizeCoordinate(value: string | undefined): number | undefined {
  const num = parseInt32(value);
  if (num === undefined) {return undefined;}
  if (num < 914400 || num > 51206400) {return undefined;}
  return num;
}

/**
 * Parse line width (0 to 20116800 EMU)
 * @see ECMA-376 Part 1, Section 20.1.10.35 (ST_LineWidth)
 */
export function parseLineWidth(value: string | undefined): Pixels | undefined {
  const num = parseInt32(value);
  if (num === undefined) {return undefined;}
  if (num < 0 || num > 20116800) {return undefined;}
  return px(num * EMU_TO_PX);
}

/**
 * Parse positive coordinate (long EMU)
 * @see ECMA-376 Part 1, Section 20.1.10.42 (ST_PositiveCoordinate)
 */
export function parsePositiveCoordinate(value: string | undefined): Pixels | undefined {
  const num = parseInt64(value);
  if (num === undefined) {return undefined;}
  if (num < 0 || num > 27273042316900) {return undefined;}
  return px(num * EMU_TO_PX);
}

/**
 * Parse positive coordinate32 (int EMU)
 * @see ECMA-376 Part 1, Section 20.1.10.43 (ST_PositiveCoordinate32)
 */
export function parsePositiveCoordinate32(value: string | undefined): Pixels | undefined {
  const num = parseInt32(value);
  if (num === undefined) {return undefined;}
  if (num < 0) {return undefined;}
  return px(num * EMU_TO_PX);
}

/**
 * Parse EMU with default value
 */
export function parseEmuOr(value: string | undefined, defaultValue: Pixels): Pixels {
  return parseEmu(value) ?? defaultValue;
}

/**
 * Parse positive EMU (unsigned)
 * @see ECMA-376 Part 1, Section 20.1.10.17 (ST_Coordinate32)
 */
export function parsePositiveEmu(value: string | undefined): Pixels | undefined {
  const px = parseEmu(value);
  if (px === undefined || px < 0) {return undefined;}
  return px;
}

// =============================================================================
// Angle Parsing
// =============================================================================

/**
 * Parse angle to degrees
 * @see ECMA-376 Part 1, Section 20.1.10.3 (ST_Angle)
 */
export function parseAngle(value: string | undefined): Degrees | undefined {
  const num = parseInt32(value);
  if (num === undefined) {return undefined;}
  return deg(num / ANGLE_UNITS_PER_DEGREE);
}

/**
 * Parse angle with default value
 */
export function parseAngleOr(value: string | undefined, defaultValue: Degrees): Degrees {
  return parseAngle(value) ?? defaultValue;
}

/**
 * Parse positive fixed angle (0-360 degrees)
 * @see ECMA-376 Part 1, Section 20.1.10.44 (ST_PositiveFixedAngle)
 */
export function parsePositiveFixedAngle(value: string | undefined): Degrees | undefined {
  const degrees = parseAngle(value);
  if (degrees === undefined) {return undefined;}
  // Normalize to 0-360
  return deg(((degrees % 360) + 360) % 360);
}

/**
 * Parse fixed angle (-90 to 90 degrees)
 * @see ECMA-376 Part 1, Section 20.1.10.23 (ST_FixedAngle)
 */
export function parseFixedAngle(value: string | undefined): Degrees | undefined {
  const num = parseInt32(value);
  if (num === undefined) {return undefined;}
  if (num <= -5400000 || num >= 5400000) {return undefined;}
  return deg(num / ANGLE_UNITS_PER_DEGREE);
}

/**
 * Parse field-of-view angle (0-180 degrees)
 * @see ECMA-376 Part 1, Section 20.1.10.26 (ST_FOVAngle)
 */
export function parseFovAngle(value: string | undefined): Degrees | undefined {
  const num = parseInt32(value);
  if (num === undefined) {return undefined;}
  if (num < 0 || num > 10800000) {return undefined;}
  return deg(num / ANGLE_UNITS_PER_DEGREE);
}

// =============================================================================
// Percentage Parsing
// =============================================================================

/**
 * Parse percentage (1000ths) to 0-100 scale
 * @see ECMA-376 Part 1, Section 20.1.10.40 (ST_Percentage)
 */
export function parsePercentage(value: string | undefined): Percent | undefined {
  const num = parseInt32(value);
  if (num === undefined) {return undefined;}
  return pct(num / PERCENT_1000);
}

/**
 * Parse percentage (100000ths) to 0-100 scale
 * Used for color transforms, etc.
 */
export function parsePercentage100k(value: string | undefined): Percent | undefined {
  const num = parseInt32(value);
  if (num === undefined) {return undefined;}
  return pct(num / PERCENT_100000 * 100);
}

/**
 * Parse positive percentage
 * @see ECMA-376 Part 1, Section 20.1.10.45 (ST_PositivePercentage)
 */
export function parsePositivePercentage(value: string | undefined): Percent | undefined {
  const pct = parsePercentage(value);
  if (pct === undefined || pct < 0) {return undefined;}
  return pct;
}

/**
 * Parse fixed percentage (0-100)
 * @see ECMA-376 Part 1, Section 20.1.10.24 (ST_FixedPercentage)
 */
export function parseFixedPercentage(value: string | undefined): Percent | undefined {
  const pct = parsePercentage100k(value);
  if (pct === undefined || pct < 0 || pct > 100) {return undefined;}
  return pct;
}

/**
 * Parse positive fixed percentage (0-100%, percent string)
 * @see ECMA-376 Part 1, Section 20.1.10.45 (ST_PositiveFixedPercentage)
 */
export function parsePositiveFixedPercentage(value: string | undefined): Percent | undefined {
  if (!value) {return undefined;}
  if (!value.endsWith("%")) {return undefined;}
  const numeric = value.slice(0, -1);
  if (!numeric) {return undefined;}
  const num = parseFloat(numeric);
  if (Number.isNaN(num)) {return undefined;}
  if (num < 0 || num > 100) {return undefined;}
  return pct(num);
}

// =============================================================================
// Enumerations
// =============================================================================

/**
 * Parse black/white rendering mode
 * @see ECMA-376 Part 1, Section 20.1.10.10 (ST_BlackWhiteMode)
 */
export function parseBlackWhiteMode(value: string | undefined): BlackWhiteMode | undefined {
  switch (value) {
    case "auto":
    case "black":
    case "blackGray":
    case "blackWhite":
    case "clr":
    case "gray":
    case "grayWhite":
    case "hidden":
    case "invGray":
    case "ltGray":
    case "white":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse blip compression type
 * @see ECMA-376 Part 1, Section 20.1.10.12 (ST_BlipCompression)
 */
export function parseBlipCompression(value: string | undefined): BlipCompression | undefined {
  switch (value) {
    case "email":
    case "hqprint":
    case "none":
    case "print":
    case "screen":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse theme color scheme index
 * @see ECMA-376 Part 1, Section 20.1.10.14 (ST_ColorSchemeIndex)
 */
export function parseColorSchemeIndex(value: string | undefined): ColorSchemeIndex | undefined {
  switch (value) {
    case "dk1":
    case "lt1":
    case "dk2":
    case "lt2":
    case "accent1":
    case "accent2":
    case "accent3":
    case "accent4":
    case "accent5":
    case "accent6":
    case "hlink":
    case "folHlink":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse font collection index
 * @see ECMA-376 Part 1, Section 20.1.10.25 (ST_FontCollectionIndex)
 */
export function parseFontCollectionIndex(value: string | undefined): FontCollectionIndex | undefined {
  switch (value) {
    case "major":
    case "minor":
    case "none":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse on/off style type
 * @see ECMA-376 Part 1, Section 20.1.10.36 (ST_OnOffStyleType)
 */
export function parseOnOffStyleType(value: string | undefined): OnOffStyleType | undefined {
  switch (value) {
    case "on":
    case "off":
    case "def":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse rectangle alignment
 * @see ECMA-376 Part 1, Section 20.1.10.53 (ST_RectAlignment)
 */
export function parseRectAlignment(value: string | undefined): RectAlignment | undefined {
  switch (value) {
    case "b":
    case "bl":
    case "br":
    case "ctr":
    case "l":
    case "r":
    case "t":
    case "tl":
    case "tr":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse scheme color value
 * @see ECMA-376 Part 1, Section 20.1.10.54 (ST_SchemeColorVal)
 */
export function parseSchemeColorValue(value: string | undefined): SchemeColorValue | undefined {
  switch (value) {
    case "dk1":
    case "lt1":
    case "dk2":
    case "lt2":
    case "accent1":
    case "accent2":
    case "accent3":
    case "accent4":
    case "accent5":
    case "accent6":
    case "hlink":
    case "folHlink":
    case "bg1":
    case "bg2":
    case "tx1":
    case "tx2":
    case "phClr":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse shape ID token
 * @see ECMA-376 Part 1, Section 20.1.10.55 (ST_ShapeID)
 */
export function parseShapeId(value: string | undefined): ShapeId | undefined {
  if (value === undefined) {return undefined;}
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {return undefined;}
  return normalized;
}

/**
 * Parse style matrix column index (unsigned int)
 * @see ECMA-376 Part 1, Section 20.1.10.57 (ST_StyleMatrixColumnIndex)
 */
export function parseStyleMatrixColumnIndex(value: string | undefined): StyleMatrixColumnIndex | undefined {
  return parseUnsignedInt(value);
}

/**
 * Parse text bullet size percent (25%-400%, as percent string or 1000th units)
 * @see ECMA-376 Part 1, Section 20.1.10.62 (ST_TextBulletSizePercent)
 */
export function parseTextBulletSizePercent(value: string | undefined): Percent | undefined {
  if (value === undefined) {return undefined;}
  if (value.endsWith("%")) {
    const numeric = value.slice(0, -1);
    if (!numeric) {return undefined;}
    const num = parseFloat(numeric);
    if (Number.isNaN(num)) {return undefined;}
    if (num < 25 || num > 400) {return undefined;}
    return pct(num);
  }
  const num = parseInt32(value);
  if (num === undefined) {return undefined;}
  const percentValue = num / PERCENT_1000;
  if (percentValue < 25 || percentValue > 400) {return undefined;}
  return pct(percentValue);
}

/**
 * Parse text bullet size (percent)
 * @see ECMA-376 Part 1, Section 20.1.10.87 (ST_TextBulletSize)
 */
export function parseTextBulletSize(value: string | undefined): Percent | undefined {
  return parseTextBulletSizePercent(value);
}

/**
 * Parse text bullet start-at number (1-32767)
 * @see ECMA-376 Part 1, Section 20.1.10.63 (ST_TextBulletStartAtNum)
 */
export function parseTextBulletStartAt(value: string | undefined): number | undefined {
  const num = parseInt32(value);
  if (num === undefined) {return undefined;}
  if (num < 1 || num > 32767) {return undefined;}
  return num;
}

/**
 * Parse text column count (1-16)
 * @see ECMA-376 Part 1, Section 20.1.10.65 (ST_TextColumnCount)
 */
export function parseTextColumnCount(value: string | undefined): number | undefined {
  const num = parseInt32(value);
  if (num === undefined) {return undefined;}
  if (num < 1 || num > 16) {return undefined;}
  return num;
}

/**
 * Parse text font scale percent (percentage string or 1000ths)
 * @see ECMA-376 Part 1, Section 20.1.10.67 (ST_TextFontScalePercentOrPercentString)
 */
export function parseTextFontScalePercent(value: string | undefined): Percent | undefined {
  return value?.endsWith("%") ? parsePositiveFixedPercentage(value) : parsePercentage(value);
}

/**
 * Parse text indent (EMU, -51206400 to 51206400)
 * @see ECMA-376 Part 1, Section 20.1.10.70 (ST_TextIndent)
 */
export function parseTextIndent(value: string | undefined): Pixels | undefined {
  const num = parseInt32(value);
  if (num === undefined) {return undefined;}
  if (num < -51206400 || num > 51206400) {return undefined;}
  return px(num * EMU_TO_PX);
}

/**
 * Parse text indent level type (0-8)
 * @see ECMA-376 Part 1, Section 20.1.10.71 (ST_TextIndentLevelType)
 */
export function parseTextIndentLevel(value: string | undefined): number | undefined {
  const num = parseInt32(value);
  if (num === undefined) {return undefined;}
  if (num < 0 || num > 8) {return undefined;}
  return num;
}

/**
 * Parse text margin (0-51206400 EMU)
 * @see ECMA-376 Part 1, Section 20.1.10.72 (ST_TextMargin)
 */
export function parseTextMargin(value: string | undefined): Pixels | undefined {
  const num = parseInt32(value);
  if (num === undefined) {return undefined;}
  if (num < 0 || num > 51206400) {return undefined;}
  return px(num * EMU_TO_PX);
}

/**
 * Parse text non-negative point value (0-400000, 100ths of a point)
 * @see ECMA-376 Part 1, Section 20.1.10.73 (ST_TextNonNegativePoint)
 */
export function parseTextNonNegativePoint(value: string | undefined): Points | undefined {
  const num = parseInt32(value);
  if (num === undefined) {return undefined;}
  if (num < 0 || num > 400000) {return undefined;}
  return pt(num / 100);
}

/**
 * Parse universal measure to pixels (e.g., 1in, 2.54cm)
 * @see ECMA-376 Part 1, Section 22.9.2.15 (ST_UniversalMeasure)
 */
export function parseUniversalMeasureToPixels(value: string | undefined): Pixels | undefined {
  if (value === undefined) {return undefined;}
  const match = /^(-?\d+(?:\.\d+)?)(mm|cm|in|pt|pc|pi)$/.exec(value);
  if (!match) {return undefined;}
  const raw = parseFloat(match[1]);
  if (Number.isNaN(raw)) {return undefined;}
  const unit = match[2];
  switch (unit) {
    case "in":
      return px(raw * STANDARD_DPI);
    case "cm":
      return px((raw / 2.54) * STANDARD_DPI);
    case "mm":
      return px((raw / 25.4) * STANDARD_DPI);
    case "pt":
      return px(raw * PT_TO_PX);
    case "pc":
    case "pi":
      return px(raw * 12 * PT_TO_PX);
    default:
      return undefined;
  }
}

/**
 * Parse text point unqualified (-400000..400000, 100ths of a point)
 * @see ECMA-376 Part 1, Section 20.1.10.75 (ST_TextPointUnqualified)
 */
export function parseTextPointUnqualified(value: string | undefined): Pixels | undefined {
  const num = parseInt32(value);
  if (num === undefined) {return undefined;}
  if (num < -400000 || num > 400000) {return undefined;}
  return px((num / 100) * PT_TO_PX);
}

/**
 * Parse text point (unqualified or universal measure)
 * @see ECMA-376 Part 1, Section 20.1.10.74 (ST_TextPoint)
 */
export function parseTextPoint(value: string | undefined): Pixels | undefined {
  if (value === undefined) {return undefined;}
  if (/^-?\d+$/.test(value)) {
    return parseTextPointUnqualified(value);
  }
  return parseUniversalMeasureToPixels(value);
}

/**
 * Parse text shape type
 * @see ECMA-376 Part 1, Section 20.1.10.76 (ST_TextShapeType)
 */
export function parseTextShapeType(value: string | undefined): TextShapeType | undefined {
  switch (value) {
    case "textNoShape":
    case "textPlain":
    case "textStop":
    case "textTriangle":
    case "textTriangleInverted":
    case "textChevron":
    case "textChevronInverted":
    case "textRingInside":
    case "textRingOutside":
    case "textArchUp":
    case "textArchDown":
    case "textCircle":
    case "textButton":
    case "textArchUpPour":
    case "textArchDownPour":
    case "textCirclePour":
    case "textButtonPour":
    case "textCurveUp":
    case "textCurveDown":
    case "textCanUp":
    case "textCanDown":
    case "textWave1":
    case "textWave2":
    case "textDoubleWave1":
    case "textWave4":
    case "textInflate":
    case "textDeflate":
    case "textInflateBottom":
    case "textDeflateBottom":
    case "textInflateTop":
    case "textDeflateTop":
    case "textDeflateInflate":
    case "textDeflateInflateDeflate":
    case "textFadeRight":
    case "textFadeLeft":
    case "textFadeUp":
    case "textFadeDown":
    case "textSlantUp":
    case "textSlantDown":
    case "textCascadeUp":
    case "textCascadeDown":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse text spacing point (0-158400, 100ths of a point)
 * @see ECMA-376 Part 1, Section 20.1.10.78 (ST_TextSpacingPoint)
 */
export function parseTextSpacingPoint(value: string | undefined): Points | undefined {
  const num = parseInt32(value);
  if (num === undefined) {return undefined;}
  if (num < 0 || num > 158400) {return undefined;}
  return pt(num / 100);
}

/**
 * Parse relative horizontal alignment
 * @see ECMA-376 Part 1, Section 20.4.3.1 (ST_AlignH)
 */
export function parseAlignH(value: string | undefined): AlignH | undefined {
  switch (value) {
    case "left":
    case "right":
    case "center":
    case "inside":
    case "outside":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse relative vertical alignment
 * @see ECMA-376 Part 1, Section 20.4.3.2 (ST_AlignV)
 */
export function parseAlignV(value: string | undefined): AlignV | undefined {
  switch (value) {
    case "top":
    case "bottom":
    case "center":
    case "inside":
    case "outside":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse horizontal relative positioning base
 * @see ECMA-376 Part 1, Section 20.4.3.4 (ST_RelFromH)
 */
export function parseRelFromH(value: string | undefined): RelFromH | undefined {
  switch (value) {
    case "character":
    case "column":
    case "insideMargin":
    case "leftMargin":
    case "margin":
    case "outsideMargin":
    case "page":
    case "rightMargin":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse vertical relative positioning base
 * @see ECMA-376 Part 1, Section 20.4.3.5 (ST_RelFromV)
 */
export function parseRelFromV(value: string | undefined): RelFromV | undefined {
  switch (value) {
    case "bottomMargin":
    case "insideMargin":
    case "line":
    case "margin":
    case "outsideMargin":
    case "page":
    case "paragraph":
    case "topMargin":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse absolute position offset in EMUs
 * @see ECMA-376 Part 1, Section 20.4.3.3 (ST_PositionOffset)
 */
export function parsePositionOffset(value: string | undefined): Pixels | undefined {
  return parseEmu(value);
}

/**
 * Parse wrap text location
 * @see ECMA-376 Part 1, Section 20.4.3.7 (ST_WrapText)
 */
export function parseWrapText(value: string | undefined): WrapText | undefined {
  switch (value) {
    case "bothSides":
    case "left":
    case "right":
    case "largest":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse wrap distance in EMUs (unsigned)
 * @see ECMA-376 Part 1, Section 20.4.3.6 (ST_WrapDistance)
 */
export function parseWrapDistance(value: string | undefined): Pixels | undefined {
  const num = parseUnsignedInt(value);
  if (num === undefined) {return undefined;}
  return parseEmu(num.toString());
}

/**
 * Parse editAs behavior
 * @see ECMA-376 Part 1, Section 20.5.3.2 (ST_EditAs)
 */
export function parseEditAs(value: string | undefined): EditAs | undefined {
  switch (value) {
    case "twoCell":
    case "oneCell":
    case "absolute":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// Point Size Parsing
// =============================================================================

/**
 * Parse font size (100ths of a point) to points
 * @see ECMA-376 Part 1, Section 21.1.2.3.6 (sz attribute)
 */
export function parseFontSize(value: string | undefined): Points | undefined {
  const num = parseInt32(value);
  if (num === undefined) {return undefined;}
  return pt(num / 100);
}

/**
 * Parse character spacing (100ths of a point) to pixels
 *
 * Per ECMA-376 Part 1, Section 21.1.2.3.9 (a:rPr):
 * The spc attribute specifies the spacing between characters
 * within a text run. This spacing is specified in hundredths of a point.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.3.9
 */
export function parseCharacterSpacing(value: string | undefined): Pixels | undefined {
  return parseTextPoint(value);
}

/**
 * Parse font size with default value
 */
export function parseFontSizeOr(value: string | undefined, defaultValue: Points): Points {
  return parseFontSize(value) ?? defaultValue;
}

/**
 * Parse font size to pixels
 */
export function parseFontSizeToPx(value: string | undefined): Pixels | undefined {
  const pts = parseFontSize(value);
  if (pts === undefined) {return undefined;}
  return px(pts * PT_TO_PX);
}

/**
 * Convert points to pixels
 */
export function pointsToPixels(points: Points): Pixels {
  return px(points * PT_TO_PX);
}

// =============================================================================
// Attribute Helpers
// =============================================================================

/**
 * Get EMU attribute as pixels
 */
export function getEmuAttr(element: XmlElement, name: string): Pixels | undefined {
  return parseEmu(getAttr(element, name));
}

/**
 * Get EMU attribute with default
 */
export function getEmuAttrOr(element: XmlElement, name: string, defaultValue: Pixels): Pixels {
  return parseEmuOr(getAttr(element, name), defaultValue);
}

/**
 * Get angle attribute as degrees
 */
export function getAngleAttr(element: XmlElement, name: string): Degrees | undefined {
  return parseAngle(getAttr(element, name));
}

/**
 * Get boolean attribute
 */
export function getBoolAttr(element: XmlElement | undefined, name: string): boolean | undefined {
  if (!element) {return undefined;}
  return parseBoolean(getAttr(element, name));
}

/**
 * Get boolean attribute with default
 */
export function getBoolAttrOr(element: XmlElement, name: string, defaultValue: boolean): boolean {
  return parseBooleanOr(getAttr(element, name), defaultValue);
}

/**
 * Get integer attribute
 */
export function getIntAttr(element: XmlElement | undefined, name: string): number | undefined {
  if (!element) {return undefined;}
  return parseInt32(getAttr(element, name));
}

/**
 * Get index attribute (unsigned int)
 */
export function getIndexAttr(element: XmlElement | undefined, name: string): number | undefined {
  if (!element) {return undefined;}
  return parseIndex(getAttr(element, name));
}

/**
 * Get integer attribute with default
 */
export function getIntAttrOr(element: XmlElement, name: string, defaultValue: number): number {
  return parseInt32Or(getAttr(element, name), defaultValue);
}

/**
 * Get float attribute
 */
export function getFloatAttr(element: XmlElement | undefined, name: string): number | undefined {
  if (!element) {return undefined;}
  return parseFloat64(getAttr(element, name));
}

/**
 * Get font size attribute as points
 */
export function getFontSizeAttr(element: XmlElement, name: string): Points | undefined {
  return parseFontSize(getAttr(element, name));
}

/**
 * Get character spacing attribute as pixels
 * @see ECMA-376 Part 1, Section 21.1.2.3.9
 */
export function getCharacterSpacingAttr(element: XmlElement, name: string): Pixels | undefined {
  return parseCharacterSpacing(getAttr(element, name));
}

/**
 * Get percentage attribute (1000ths)
 */
export function getPercentAttr(element: XmlElement, name: string): Percent | undefined {
  return parsePercentage(getAttr(element, name));
}

/**
 * Get percentage attribute (100000ths)
 */
export function getPercent100kAttr(element: XmlElement, name: string): Percent | undefined {
  return parsePercentage100k(getAttr(element, name));
}

// =============================================================================
// Optional Value Extraction
// =============================================================================

/**
 * Get child element's attribute value
 */
export function getChildAttr(
  parent: XmlElement,
  childName: string,
  attrName: string,
): string | undefined {
  const child = getChild(parent, childName);
  if (!child) {return undefined;}
  return getAttr(child, attrName);
}

/**
 * Get child element's EMU attribute as pixels
 */
export function getChildEmuAttr(
  parent: XmlElement,
  childName: string,
  attrName: string,
): Pixels | undefined {
  return parseEmu(getChildAttr(parent, childName, attrName));
}

/**
 * Get child element's boolean attribute
 */
export function getChildBoolAttr(
  parent: XmlElement,
  childName: string,
  attrName: string,
): boolean | undefined {
  return parseBoolean(getChildAttr(parent, childName, attrName));
}
