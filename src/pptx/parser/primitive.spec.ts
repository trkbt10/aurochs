/**
 * @file Tests for primitive parsing utilities
 *
 * ECMA-376 Part 1, Section 20.1.10 - Simple Types
 * This file tests the conversion of XML attribute strings to Domain Object primitive types.
 *
 * Key conversions:
 * - EMU (English Metric Units) to pixels: 914400 EMU = 1 inch = 96px
 * - Angle units to degrees: 60000 units = 1 degree
 * - Percentage units: 1000 = 1% (some), 100000 = 100% (others)
 * - Font size: 100ths of a point
 *
 * @see ECMA-376 Part 1, Section 20.1.10
 */

import type { XmlElement } from "../../xml";
import {
  parseInt32,
  parseInt32Or,
  parseFloat64,
  parseInt64,
  parseUnsignedInt,
  parseIndex,
  parseBoolean,
  parseBooleanOr,
  parseEmu,
  parseEmuOr,
  parsePositiveEmu,
  parseCoordinate32Unqualified,
  parseCoordinateUnqualified,
  parseDrawingElementId,
  parseSlideId,
  parseSlideLayoutId,
  parseSlideMasterId,
  parseSlideSizeCoordinate,
  parseLineWidth,
  parsePositiveCoordinate,
  parsePositiveCoordinate32,
  parseAngle,
  parseAngleOr,
  parsePositiveFixedAngle,
  parseFixedAngle,
  parseFovAngle,
  parsePercentage,
  parsePercentage100k,
  parsePositivePercentage,
  parseFixedPercentage,
  parsePositiveFixedPercentage,
  parseBlackWhiteMode,
  parseBlipCompression,
  parseColorSchemeIndex,
  parseFontCollectionIndex,
  parseOnOffStyleType,
  parseRectAlignment,
  parseSchemeColorValue,
  parseShapeId,
  parseStyleMatrixColumnIndex,
  parseTextBulletSizePercent,
  parseTextBulletSize,
  parseTextBulletStartAt,
  parseTextColumnCount,
  parseTextFontScalePercent,
  parseTextIndent,
  parseTextIndentLevel,
  parseTextMargin,
  parseTextNonNegativePoint,
  parseTextPoint,
  parseTextPointUnqualified,
  parseTextShapeType,
  parseTextSpacingPoint,
  parseUniversalMeasureToPixels,
  parseAlignH,
  parseAlignV,
  parseRelFromH,
  parseRelFromV,
  parsePositionOffset,
  parseWrapDistance,
  parseWrapText,
  parseEditAs,
  parseFontSize,
  parseFontSizeOr,
  parseFontSizeToPx,
  pointsToPixels,
  getEmuAttr,
  getEmuAttrOr,
  getAngleAttr,
  getBoolAttr,
  getBoolAttrOr,
  getIntAttr,
  getIntAttrOr,
  getIndexAttr,
  getFloatAttr,
  getFontSizeAttr,
  getPercentAttr,
  getPercent100kAttr,
  getChildAttr,
  getChildEmuAttr,
  getChildBoolAttr,
} from "./primitive";
import { px, deg, pt } from "../domain/types";

// Helper to create mock XmlElement
function el(name: string, attrs: Record<string, string> = {}, children: XmlElement[] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

// =============================================================================
// Integer Parsing
// =============================================================================

describe("parseInt32 - Integer parsing", () => {
  it("parses positive integer", () => {
    expect(parseInt32("123")).toBe(123);
  });

  it("parses negative integer", () => {
    expect(parseInt32("-456")).toBe(-456);
  });

  it("parses zero", () => {
    expect(parseInt32("0")).toBe(0);
  });

  it("returns undefined for undefined input", () => {
    expect(parseInt32(undefined)).toBeUndefined();
  });

  it("returns undefined for non-numeric string", () => {
    expect(parseInt32("abc")).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(parseInt32("")).toBeUndefined();
  });

  it("parses integer with leading zeros", () => {
    expect(parseInt32("007")).toBe(7);
  });

  it("truncates decimal values", () => {
    expect(parseInt32("123.456")).toBe(123);
  });
});

describe("parseInt32Or - Integer with default", () => {
  it("returns parsed value when valid", () => {
    expect(parseInt32Or("42", 0)).toBe(42);
  });

  it("returns default for undefined", () => {
    expect(parseInt32Or(undefined, 99)).toBe(99);
  });

  it("returns default for invalid string", () => {
    expect(parseInt32Or("not-a-number", 50)).toBe(50);
  });
});

describe("parseFloat64 - Float parsing", () => {
  it("parses positive float", () => {
    expect(parseFloat64("3.14")).toBeCloseTo(3.14, 2);
  });

  it("parses negative float", () => {
    expect(parseFloat64("-2.5")).toBeCloseTo(-2.5, 1);
  });

  it("parses integer as float", () => {
    expect(parseFloat64("42")).toBe(42);
  });

  it("parses scientific notation", () => {
    expect(parseFloat64("1.5e3")).toBe(1500);
  });

  it("returns undefined for undefined input", () => {
    expect(parseFloat64(undefined)).toBeUndefined();
  });

  it("returns undefined for non-numeric string", () => {
    expect(parseFloat64("xyz")).toBeUndefined();
  });
});

describe("parseInt64 - 64-bit integer parsing", () => {
  it("parses positive integer", () => {
    expect(parseInt64("123")).toBe(123);
  });

  it("parses negative integer", () => {
    expect(parseInt64("-456")).toBe(-456);
  });

  it("returns undefined for non-numeric", () => {
    expect(parseInt64("abc")).toBeUndefined();
  });
});

describe("parseUnsignedInt - Unsigned 32-bit parsing", () => {
  it("parses zero and positive values", () => {
    expect(parseUnsignedInt("0")).toBe(0);
    expect(parseUnsignedInt("4294967295")).toBe(4294967295);
  });

  it("returns undefined for negative or overflow", () => {
    expect(parseUnsignedInt("-1")).toBeUndefined();
    expect(parseUnsignedInt("4294967296")).toBeUndefined();
  });
});

describe("parseIndex - Index parsing", () => {
  it("parses valid unsigned integer index", () => {
    expect(parseIndex("12")).toBe(12);
  });

  it("returns undefined for invalid index", () => {
    expect(parseIndex("-3")).toBeUndefined();
  });
});

// =============================================================================
// Boolean Parsing
// =============================================================================

describe("parseBoolean - Boolean parsing", () => {
  describe("Truthy values", () => {
    it("parses '1' as true", () => {
      expect(parseBoolean("1")).toBe(true);
    });

    it("parses 'true' as true", () => {
      expect(parseBoolean("true")).toBe(true);
    });

    it("parses 'TRUE' as true (case insensitive)", () => {
      expect(parseBoolean("TRUE")).toBe(true);
    });

    it("parses 'on' as true", () => {
      expect(parseBoolean("on")).toBe(true);
    });
  });

  describe("Falsy values", () => {
    it("parses '0' as false", () => {
      expect(parseBoolean("0")).toBe(false);
    });

    it("parses 'false' as false", () => {
      expect(parseBoolean("false")).toBe(false);
    });

    it("parses 'FALSE' as false (case insensitive)", () => {
      expect(parseBoolean("FALSE")).toBe(false);
    });

    it("parses 'off' as false", () => {
      expect(parseBoolean("off")).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("returns undefined for undefined input", () => {
      expect(parseBoolean(undefined)).toBeUndefined();
    });

    it("returns undefined for unrecognized value", () => {
      expect(parseBoolean("yes")).toBeUndefined();
    });

    it("returns undefined for empty string", () => {
      expect(parseBoolean("")).toBeUndefined();
    });
  });
});

describe("parseBooleanOr - Boolean with default", () => {
  it("returns parsed value when valid", () => {
    expect(parseBooleanOr("1", false)).toBe(true);
    expect(parseBooleanOr("0", true)).toBe(false);
  });

  it("returns default for undefined", () => {
    expect(parseBooleanOr(undefined, true)).toBe(true);
    expect(parseBooleanOr(undefined, false)).toBe(false);
  });
});

// =============================================================================
// EMU Parsing (ECMA-376 Section 20.1.10.16)
// =============================================================================

describe("parseEmu - EMU to pixels (ECMA-376 Section 20.1.10.16)", () => {
  it("converts EMU to pixels (914400 EMU = 96px)", () => {
    // 914400 EMU = 1 inch = 96px at 96 DPI
    const result = parseEmu("914400");
    expect(result).toBeCloseTo(96, 0);
  });

  it("converts half inch to 48px", () => {
    const result = parseEmu("457200"); // 0.5 inch
    expect(result).toBeCloseTo(48, 0);
  });

  it("converts 1pt to ~1.33px", () => {
    // 1pt = 914400/72 EMU = 12700 EMU ≈ 1.33px
    const result = parseEmu("12700");
    expect(result).toBeCloseTo(1.33, 1);
  });

  it("handles zero", () => {
    expect(parseEmu("0")).toBe(0);
  });

  it("handles negative values", () => {
    const result = parseEmu("-914400");
    expect(result).toBeCloseTo(-96, 0);
  });

  it("returns undefined for undefined input", () => {
    expect(parseEmu(undefined)).toBeUndefined();
  });

  it("returns undefined for non-numeric string", () => {
    expect(parseEmu("invalid")).toBeUndefined();
  });
});

describe("parseEmuOr - EMU with default", () => {
  it("returns parsed value when valid", () => {
    const result = parseEmuOr("914400", px(0));
    expect(result).toBeCloseTo(96, 0);
  });

  it("returns default for undefined", () => {
    expect(parseEmuOr(undefined, px(50))).toBe(50);
  });
});

describe("parsePositiveEmu - Positive EMU (ECMA-376 Section 20.1.10.17)", () => {
  it("parses positive EMU value", () => {
    const result = parsePositiveEmu("914400");
    expect(result).toBeCloseTo(96, 0);
  });

  it("returns undefined for negative EMU", () => {
    expect(parsePositiveEmu("-914400")).toBeUndefined();
  });

  it("returns undefined for undefined input", () => {
    expect(parsePositiveEmu(undefined)).toBeUndefined();
  });
});

describe("parseCoordinate32Unqualified - EMU coordinate (int)", () => {
  it("parses 32-bit EMU coordinate", () => {
    expect(parseCoordinate32Unqualified("914400")).toBe(96);
  });

  it("returns undefined for invalid input", () => {
    expect(parseCoordinate32Unqualified(undefined)).toBeUndefined();
    expect(parseCoordinate32Unqualified("invalid")).toBeUndefined();
  });
});

describe("parseCoordinateUnqualified - EMU coordinate (long)", () => {
  it("parses coordinate within bounds", () => {
    expect(parseCoordinateUnqualified("914400")).toBe(96);
  });

  it("returns undefined for out of range values", () => {
    expect(parseCoordinateUnqualified("27273042316901")).toBeUndefined();
    expect(parseCoordinateUnqualified("-27273042329601")).toBeUndefined();
  });
});

describe("parseDrawingElementId - Drawing element id", () => {
  it("parses unsigned int ids", () => {
    expect(parseDrawingElementId("1")).toBe(1);
    expect(parseDrawingElementId("4294967295")).toBe(4294967295);
  });

  it("returns undefined for invalid ids", () => {
    expect(parseDrawingElementId(undefined)).toBeUndefined();
    expect(parseDrawingElementId("-1")).toBeUndefined();
  });
});

describe("parseSlideId - Slide identifier (ECMA-376 Section 19.7.13)", () => {
  it("parses slide ids within range", () => {
    expect(parseSlideId("256")).toBe(256);
    expect(parseSlideId("2147483647")).toBe(2147483647);
  });

  it("returns undefined for out of range", () => {
    expect(parseSlideId("255")).toBeUndefined();
    expect(parseSlideId("2147483648")).toBeUndefined();
  });
});

describe("parseSlideLayoutId - Slide layout identifier (ECMA-376 Section 19.7.14)", () => {
  it("parses slide layout ids within range", () => {
    expect(parseSlideLayoutId("2147483648")).toBe(2147483648);
    expect(parseSlideLayoutId("4294967295")).toBe(4294967295);
  });

  it("returns undefined for out of range", () => {
    expect(parseSlideLayoutId("2147483647")).toBeUndefined();
  });
});

describe("parseSlideMasterId - Slide master identifier (ECMA-376 Section 19.7.16)", () => {
  it("parses slide master ids within range", () => {
    expect(parseSlideMasterId("2147483648")).toBe(2147483648);
    expect(parseSlideMasterId("4294967295")).toBe(4294967295);
  });

  it("returns undefined for out of range", () => {
    expect(parseSlideMasterId("2147483647")).toBeUndefined();
  });
});

describe("parseSlideSizeCoordinate - Slide size coordinate (ECMA-376 Section 19.7.17)", () => {
  it("parses slide size coordinates within range", () => {
    expect(parseSlideSizeCoordinate("914400")).toBe(914400);
    expect(parseSlideSizeCoordinate("51206400")).toBe(51206400);
  });

  it("returns undefined for out of range", () => {
    expect(parseSlideSizeCoordinate("914399")).toBeUndefined();
    expect(parseSlideSizeCoordinate("51206401")).toBeUndefined();
  });
});

describe("parseLineWidth - Line width (ECMA-376 Section 20.1.10.35)", () => {
  it("parses width within range", () => {
    expect(parseLineWidth("0")).toBe(0);
    expect(parseLineWidth("12700")).toBeCloseTo(1.33, 1);
  });

  it("returns undefined for out of range", () => {
    expect(parseLineWidth("-1")).toBeUndefined();
    expect(parseLineWidth("20116801")).toBeUndefined();
  });
});

describe("parsePositiveCoordinate - Positive coordinate (ECMA-376 Section 20.1.10.42)", () => {
  it("parses positive coordinate", () => {
    expect(parsePositiveCoordinate("914400")).toBe(96);
  });

  it("returns undefined for out of range", () => {
    expect(parsePositiveCoordinate("-1")).toBeUndefined();
    expect(parsePositiveCoordinate("27273042316901")).toBeUndefined();
  });
});

describe("parsePositiveCoordinate32 - Positive coordinate32 (ECMA-376 Section 20.1.10.43)", () => {
  it("parses positive coordinate32", () => {
    expect(parsePositiveCoordinate32("914400")).toBe(96);
  });

  it("returns undefined for negative", () => {
    expect(parsePositiveCoordinate32("-1")).toBeUndefined();
  });
});

// =============================================================================
// Angle Parsing (ECMA-376 Section 20.1.10.3)
// =============================================================================

describe("parseAngle - Angle to degrees (ECMA-376 Section 20.1.10.3)", () => {
  it("converts 60000 units to 1 degree", () => {
    expect(parseAngle("60000")).toBe(1);
  });

  it("converts 5400000 units to 90 degrees", () => {
    expect(parseAngle("5400000")).toBe(90);
  });

  it("converts 10800000 units to 180 degrees", () => {
    expect(parseAngle("10800000")).toBe(180);
  });

  it("converts 21600000 units to 360 degrees", () => {
    expect(parseAngle("21600000")).toBe(360);
  });

  it("handles fractional degrees", () => {
    const result = parseAngle("30000"); // 0.5 degrees
    expect(result).toBeCloseTo(0.5, 1);
  });

  it("handles zero", () => {
    expect(parseAngle("0")).toBe(0);
  });

  it("handles negative angles", () => {
    expect(parseAngle("-5400000")).toBe(-90);
  });

  it("returns undefined for undefined input", () => {
    expect(parseAngle(undefined)).toBeUndefined();
  });
});

describe("parseAngleOr - Angle with default", () => {
  it("returns parsed value when valid", () => {
    expect(parseAngleOr("5400000", deg(0))).toBe(90);
  });

  it("returns default for undefined", () => {
    expect(parseAngleOr(undefined, deg(45))).toBe(45);
  });
});

describe("parsePositiveFixedAngle - 0-360 degrees (ECMA-376 Section 20.1.10.44)", () => {
  it("parses angle within 0-360", () => {
    expect(parsePositiveFixedAngle("5400000")).toBe(90);
  });

  it("normalizes angle >= 360", () => {
    const result = parsePositiveFixedAngle("25200000"); // 420 degrees
    expect(result).toBe(60); // 420 % 360
  });

  it("normalizes negative angle", () => {
    const result = parsePositiveFixedAngle("-5400000"); // -90 degrees
    expect(result).toBe(270); // (-90 + 360) % 360
  });

  it("returns undefined for undefined input", () => {
    expect(parsePositiveFixedAngle(undefined)).toBeUndefined();
  });
});

describe("parseFixedAngle - -90 to 90 degrees (ECMA-376 Section 20.1.10.23)", () => {
  it("parses angle within range", () => {
    expect(parseFixedAngle("0")).toBe(0);
    expect(parseFixedAngle("5399999")).toBeCloseTo(89.999983, 5);
    expect(parseFixedAngle("-5399999")).toBeCloseTo(-89.999983, 5);
  });

  it("returns undefined for out of range", () => {
    expect(parseFixedAngle("5400000")).toBeUndefined();
    expect(parseFixedAngle("-5400000")).toBeUndefined();
  });

  it("returns undefined for invalid input", () => {
    expect(parseFixedAngle(undefined)).toBeUndefined();
    expect(parseFixedAngle("invalid")).toBeUndefined();
  });
});

describe("parseFovAngle - 0 to 180 degrees (ECMA-376 Section 20.1.10.26)", () => {
  it("parses angle within range", () => {
    expect(parseFovAngle("0")).toBe(0);
    expect(parseFovAngle("5400000")).toBe(90);
    expect(parseFovAngle("10800000")).toBe(180);
  });

  it("returns undefined for out of range", () => {
    expect(parseFovAngle("-1")).toBeUndefined();
    expect(parseFovAngle("10800001")).toBeUndefined();
  });

  it("returns undefined for invalid input", () => {
    expect(parseFovAngle(undefined)).toBeUndefined();
    expect(parseFovAngle("invalid")).toBeUndefined();
  });
});

// =============================================================================
// Percentage Parsing (ECMA-376 Section 20.1.10.40)
// =============================================================================

describe("parsePercentage - 1000ths to percent (ECMA-376 Section 20.1.10.40)", () => {
  it("converts 1000 to 1%", () => {
    expect(parsePercentage("1000")).toBe(1);
  });

  it("converts 100000 to 100%", () => {
    expect(parsePercentage("100000")).toBe(100);
  });

  it("converts 50000 to 50%", () => {
    expect(parsePercentage("50000")).toBe(50);
  });

  it("handles zero", () => {
    expect(parsePercentage("0")).toBe(0);
  });

  it("handles fractional percent", () => {
    const result = parsePercentage("500"); // 0.5%
    expect(result).toBeCloseTo(0.5, 1);
  });

  it("returns undefined for undefined input", () => {
    expect(parsePercentage(undefined)).toBeUndefined();
  });
});

describe("parsePercentage100k - 100000ths to percent", () => {
  it("converts 100000 to 100%", () => {
    expect(parsePercentage100k("100000")).toBe(100);
  });

  it("converts 50000 to 50%", () => {
    expect(parsePercentage100k("50000")).toBe(50);
  });

  it("converts 0 to 0%", () => {
    expect(parsePercentage100k("0")).toBe(0);
  });

  it("handles values > 100%", () => {
    expect(parsePercentage100k("150000")).toBe(150);
  });

  it("returns undefined for undefined input", () => {
    expect(parsePercentage100k(undefined)).toBeUndefined();
  });
});

describe("parsePositivePercentage - Positive percent (ECMA-376 Section 20.1.10.45)", () => {
  it("parses positive percentage", () => {
    expect(parsePositivePercentage("50000")).toBe(50);
  });

  it("returns undefined for negative percentage", () => {
    expect(parsePositivePercentage("-10000")).toBeUndefined();
  });

  it("returns undefined for undefined input", () => {
    expect(parsePositivePercentage(undefined)).toBeUndefined();
  });
});

describe("parseFixedPercentage - 0-100% (ECMA-376 Section 20.1.10.24)", () => {
  it("parses percentage in 0-100 range", () => {
    expect(parseFixedPercentage("50000")).toBe(50);
  });

  it("parses 0%", () => {
    expect(parseFixedPercentage("0")).toBe(0);
  });

  it("parses 100%", () => {
    expect(parseFixedPercentage("100000")).toBe(100);
  });

  it("returns undefined for > 100%", () => {
    expect(parseFixedPercentage("150000")).toBeUndefined();
  });

  it("returns undefined for negative", () => {
    expect(parseFixedPercentage("-10000")).toBeUndefined();
  });

  it("returns undefined for undefined input", () => {
    expect(parseFixedPercentage(undefined)).toBeUndefined();
  });
});

describe("parsePositiveFixedPercentage - 0-100% with percent sign (ECMA-376 Section 20.1.10.45)", () => {
  it("parses valid percentages", () => {
    expect(parsePositiveFixedPercentage("0%")).toBe(0);
    expect(parsePositiveFixedPercentage("50%")).toBe(50);
    expect(parsePositiveFixedPercentage("100%")).toBe(100);
    expect(parsePositiveFixedPercentage("33.3%")).toBeCloseTo(33.3, 1);
  });

  it("returns undefined for invalid values", () => {
    expect(parsePositiveFixedPercentage(undefined)).toBeUndefined();
    expect(parsePositiveFixedPercentage("101%")).toBeUndefined();
    expect(parsePositiveFixedPercentage("-1%")).toBeUndefined();
    expect(parsePositiveFixedPercentage("50")).toBeUndefined();
  });
});

// =============================================================================
// Enumeration Parsing
// =============================================================================

describe("parseBlackWhiteMode - Black/white rendering mode", () => {
  it("parses valid black/white modes", () => {
    expect(parseBlackWhiteMode("auto")).toBe("auto");
    expect(parseBlackWhiteMode("black")).toBe("black");
    expect(parseBlackWhiteMode("blackGray")).toBe("blackGray");
    expect(parseBlackWhiteMode("blackWhite")).toBe("blackWhite");
    expect(parseBlackWhiteMode("clr")).toBe("clr");
    expect(parseBlackWhiteMode("gray")).toBe("gray");
    expect(parseBlackWhiteMode("grayWhite")).toBe("grayWhite");
    expect(parseBlackWhiteMode("hidden")).toBe("hidden");
    expect(parseBlackWhiteMode("invGray")).toBe("invGray");
    expect(parseBlackWhiteMode("ltGray")).toBe("ltGray");
    expect(parseBlackWhiteMode("white")).toBe("white");
  });

  it("returns undefined for invalid values", () => {
    expect(parseBlackWhiteMode(undefined)).toBeUndefined();
    expect(parseBlackWhiteMode("unknown")).toBeUndefined();
  });
});

describe("parseBlipCompression - Blip compression type", () => {
  it("parses valid compression states", () => {
    expect(parseBlipCompression("email")).toBe("email");
    expect(parseBlipCompression("hqprint")).toBe("hqprint");
    expect(parseBlipCompression("none")).toBe("none");
    expect(parseBlipCompression("print")).toBe("print");
    expect(parseBlipCompression("screen")).toBe("screen");
  });

  it("returns undefined for invalid values", () => {
    expect(parseBlipCompression(undefined)).toBeUndefined();
    expect(parseBlipCompression("unknown")).toBeUndefined();
  });
});

describe("parseColorSchemeIndex - Theme color scheme index", () => {
  it("parses valid scheme index values", () => {
    expect(parseColorSchemeIndex("dk1")).toBe("dk1");
    expect(parseColorSchemeIndex("lt1")).toBe("lt1");
    expect(parseColorSchemeIndex("dk2")).toBe("dk2");
    expect(parseColorSchemeIndex("lt2")).toBe("lt2");
    expect(parseColorSchemeIndex("accent1")).toBe("accent1");
    expect(parseColorSchemeIndex("accent2")).toBe("accent2");
    expect(parseColorSchemeIndex("accent3")).toBe("accent3");
    expect(parseColorSchemeIndex("accent4")).toBe("accent4");
    expect(parseColorSchemeIndex("accent5")).toBe("accent5");
    expect(parseColorSchemeIndex("accent6")).toBe("accent6");
    expect(parseColorSchemeIndex("hlink")).toBe("hlink");
    expect(parseColorSchemeIndex("folHlink")).toBe("folHlink");
  });

  it("returns undefined for invalid values", () => {
    expect(parseColorSchemeIndex(undefined)).toBeUndefined();
    expect(parseColorSchemeIndex("tx1")).toBeUndefined();
  });
});

describe("parseFontCollectionIndex - Font collection index", () => {
  it("parses valid font collection values", () => {
    expect(parseFontCollectionIndex("major")).toBe("major");
    expect(parseFontCollectionIndex("minor")).toBe("minor");
    expect(parseFontCollectionIndex("none")).toBe("none");
  });

  it("returns undefined for invalid values", () => {
    expect(parseFontCollectionIndex(undefined)).toBeUndefined();
    expect(parseFontCollectionIndex("unknown")).toBeUndefined();
  });
});

describe("parseOnOffStyleType - On/off style type", () => {
  it("parses valid values", () => {
    expect(parseOnOffStyleType("on")).toBe("on");
    expect(parseOnOffStyleType("off")).toBe("off");
    expect(parseOnOffStyleType("def")).toBe("def");
  });

  it("returns undefined for invalid values", () => {
    expect(parseOnOffStyleType(undefined)).toBeUndefined();
    expect(parseOnOffStyleType("1")).toBeUndefined();
  });
});

describe("parseRectAlignment - Rectangle alignment", () => {
  it("parses valid alignment values", () => {
    expect(parseRectAlignment("b")).toBe("b");
    expect(parseRectAlignment("bl")).toBe("bl");
    expect(parseRectAlignment("br")).toBe("br");
    expect(parseRectAlignment("ctr")).toBe("ctr");
    expect(parseRectAlignment("l")).toBe("l");
    expect(parseRectAlignment("r")).toBe("r");
    expect(parseRectAlignment("t")).toBe("t");
    expect(parseRectAlignment("tl")).toBe("tl");
    expect(parseRectAlignment("tr")).toBe("tr");
  });

  it("returns undefined for invalid values", () => {
    expect(parseRectAlignment(undefined)).toBeUndefined();
    expect(parseRectAlignment("center")).toBeUndefined();
  });
});

describe("parseSchemeColorValue - Scheme color value", () => {
  it("parses standard scheme colors", () => {
    expect(parseSchemeColorValue("dk1")).toBe("dk1");
    expect(parseSchemeColorValue("lt1")).toBe("lt1");
    expect(parseSchemeColorValue("dk2")).toBe("dk2");
    expect(parseSchemeColorValue("lt2")).toBe("lt2");
    expect(parseSchemeColorValue("accent1")).toBe("accent1");
    expect(parseSchemeColorValue("accent2")).toBe("accent2");
    expect(parseSchemeColorValue("accent3")).toBe("accent3");
    expect(parseSchemeColorValue("accent4")).toBe("accent4");
    expect(parseSchemeColorValue("accent5")).toBe("accent5");
    expect(parseSchemeColorValue("accent6")).toBe("accent6");
    expect(parseSchemeColorValue("hlink")).toBe("hlink");
    expect(parseSchemeColorValue("folHlink")).toBe("folHlink");
  });

  it("parses mapped scheme colors", () => {
    expect(parseSchemeColorValue("bg1")).toBe("bg1");
    expect(parseSchemeColorValue("bg2")).toBe("bg2");
    expect(parseSchemeColorValue("tx1")).toBe("tx1");
    expect(parseSchemeColorValue("tx2")).toBe("tx2");
    expect(parseSchemeColorValue("phClr")).toBe("phClr");
  });

  it("returns undefined for invalid values", () => {
    expect(parseSchemeColorValue(undefined)).toBeUndefined();
    expect(parseSchemeColorValue("accent7")).toBeUndefined();
  });
});

describe("parseShapeId - Shape ID token", () => {
  it("normalizes whitespace for tokens", () => {
    expect(parseShapeId("  shape   id  ")).toBe("shape id");
  });

  it("returns undefined for empty or missing values", () => {
    expect(parseShapeId(undefined)).toBeUndefined();
    expect(parseShapeId("   ")).toBeUndefined();
  });
});

describe("parseStyleMatrixColumnIndex - Style matrix column index", () => {
  it("parses unsigned int values", () => {
    expect(parseStyleMatrixColumnIndex("0")).toBe(0);
    expect(parseStyleMatrixColumnIndex("4294967295")).toBe(4294967295);
  });

  it("returns undefined for invalid values", () => {
    expect(parseStyleMatrixColumnIndex(undefined)).toBeUndefined();
    expect(parseStyleMatrixColumnIndex("-1")).toBeUndefined();
  });
});

describe("parseTextBulletSizePercent - Text bullet size percent", () => {
  it("parses 1000th-based percent values", () => {
    expect(parseTextBulletSizePercent("75000")).toBe(75);
    expect(parseTextBulletSizePercent("25000")).toBe(25);
    expect(parseTextBulletSizePercent("400000")).toBe(400);
  });

  it("parses percent string values", () => {
    expect(parseTextBulletSizePercent("75%")).toBe(75);
    expect(parseTextBulletSizePercent("25%")).toBe(25);
    expect(parseTextBulletSizePercent("400%")).toBe(400);
  });

  it("returns undefined for out-of-range values", () => {
    expect(parseTextBulletSizePercent("24000")).toBeUndefined();
    expect(parseTextBulletSizePercent("401000")).toBeUndefined();
    expect(parseTextBulletSizePercent("24%")).toBeUndefined();
    expect(parseTextBulletSizePercent("401%")).toBeUndefined();
  });
});

describe("parseTextBulletSize - Text bullet size", () => {
  it("parses percent values", () => {
    expect(parseTextBulletSize("75000")).toBe(75);
    expect(parseTextBulletSize("75%")).toBe(75);
  });
});

describe("parseTextBulletStartAt - Text bullet start-at number", () => {
  it("parses in-range values", () => {
    expect(parseTextBulletStartAt("1")).toBe(1);
    expect(parseTextBulletStartAt("32767")).toBe(32767);
  });

  it("returns undefined for out-of-range values", () => {
    expect(parseTextBulletStartAt("0")).toBeUndefined();
    expect(parseTextBulletStartAt("32768")).toBeUndefined();
  });
});

describe("parseTextColumnCount - Text column count", () => {
  it("parses in-range values", () => {
    expect(parseTextColumnCount("1")).toBe(1);
    expect(parseTextColumnCount("16")).toBe(16);
  });

  it("returns undefined for out-of-range values", () => {
    expect(parseTextColumnCount("0")).toBeUndefined();
    expect(parseTextColumnCount("17")).toBeUndefined();
  });
});

describe("parseTextFontScalePercent - Text font scale percent", () => {
  it("parses 1000th-based percent values", () => {
    expect(parseTextFontScalePercent("75000")).toBe(75);
    expect(parseTextFontScalePercent("100000")).toBe(100);
  });

  it("parses percent string values", () => {
    expect(parseTextFontScalePercent("75%")).toBe(75);
    expect(parseTextFontScalePercent("100%")).toBe(100);
  });
});

describe("parseTextIndent - Text indent", () => {
  it("parses in-range values", () => {
    expect(parseTextIndent("0")).toBe(0);
    expect(parseTextIndent("-457200")).toBeCloseTo(-48, 1);
    expect(parseTextIndent("457200")).toBeCloseTo(48, 1);
  });

  it("returns undefined for out-of-range values", () => {
    expect(parseTextIndent("-51206401")).toBeUndefined();
    expect(parseTextIndent("51206401")).toBeUndefined();
  });
});

describe("parseTextIndentLevel - Text indent level", () => {
  it("parses in-range values", () => {
    expect(parseTextIndentLevel("0")).toBe(0);
    expect(parseTextIndentLevel("8")).toBe(8);
  });

  it("returns undefined for out-of-range values", () => {
    expect(parseTextIndentLevel("-1")).toBeUndefined();
    expect(parseTextIndentLevel("9")).toBeUndefined();
  });
});

describe("parseTextMargin - Text margin", () => {
  it("parses in-range values", () => {
    expect(parseTextMargin("0")).toBe(0);
    expect(parseTextMargin("457200")).toBeCloseTo(48, 1);
  });

  it("returns undefined for out-of-range values", () => {
    expect(parseTextMargin("-1")).toBeUndefined();
    expect(parseTextMargin("51206401")).toBeUndefined();
  });
});

describe("parseTextNonNegativePoint - Text non-negative point", () => {
  it("parses in-range values", () => {
    expect(parseTextNonNegativePoint("0")).toBe(0);
    expect(parseTextNonNegativePoint("1200")).toBe(12);
    expect(parseTextNonNegativePoint("400000")).toBe(4000);
  });

  it("returns undefined for out-of-range values", () => {
    expect(parseTextNonNegativePoint("-1")).toBeUndefined();
    expect(parseTextNonNegativePoint("400001")).toBeUndefined();
  });
});

describe("parseUniversalMeasureToPixels - Universal measure", () => {
  it("parses supported units", () => {
    expect(parseUniversalMeasureToPixels("1in")).toBeCloseTo(96, 1);
    expect(parseUniversalMeasureToPixels("2.54cm")).toBeCloseTo(96, 1);
    expect(parseUniversalMeasureToPixels("25.4mm")).toBeCloseTo(96, 1);
    expect(parseUniversalMeasureToPixels("72pt")).toBeCloseTo(96, 1);
    expect(parseUniversalMeasureToPixels("6pc")).toBeCloseTo(96, 1);
    expect(parseUniversalMeasureToPixels("6pi")).toBeCloseTo(96, 1);
  });

  it("returns undefined for invalid values", () => {
    expect(parseUniversalMeasureToPixels(undefined)).toBeUndefined();
    expect(parseUniversalMeasureToPixels("10px")).toBeUndefined();
  });
});

describe("parseTextPointUnqualified - Text point unqualified", () => {
  it("parses in-range values", () => {
    expect(parseTextPointUnqualified("0")).toBe(0);
    expect(parseTextPointUnqualified("-1200")).toBeCloseTo(-16, 1);
    expect(parseTextPointUnqualified("1200")).toBeCloseTo(16, 1);
  });

  it("returns undefined for out-of-range values", () => {
    expect(parseTextPointUnqualified("-400001")).toBeUndefined();
    expect(parseTextPointUnqualified("400001")).toBeUndefined();
  });
});

describe("parseTextPoint - Text point", () => {
  it("parses unqualified values", () => {
    expect(parseTextPoint("1200")).toBeCloseTo(16, 1);
  });

  it("parses universal measure values", () => {
    expect(parseTextPoint("1in")).toBeCloseTo(96, 1);
  });
});

describe("parseTextShapeType - Text shape type", () => {
  it("parses known presets", () => {
    expect(parseTextShapeType("textNoShape")).toBe("textNoShape");
    expect(parseTextShapeType("textWave1")).toBe("textWave1");
    expect(parseTextShapeType("textCascadeDown")).toBe("textCascadeDown");
  });

  it("returns undefined for unknown values", () => {
    expect(parseTextShapeType("textUnknown")).toBeUndefined();
    expect(parseTextShapeType(undefined)).toBeUndefined();
  });
});

describe("parseTextSpacingPoint - Text spacing point", () => {
  it("parses in-range values", () => {
    expect(parseTextSpacingPoint("0")).toBe(0);
    expect(parseTextSpacingPoint("1200")).toBe(12);
    expect(parseTextSpacingPoint("158400")).toBe(1584);
  });

  it("returns undefined for out-of-range values", () => {
    expect(parseTextSpacingPoint("-1")).toBeUndefined();
    expect(parseTextSpacingPoint("158401")).toBeUndefined();
  });
});

describe("parseAlignH - Relative horizontal alignment", () => {
  it("parses known values", () => {
    expect(parseAlignH("left")).toBe("left");
    expect(parseAlignH("center")).toBe("center");
    expect(parseAlignH("outside")).toBe("outside");
  });

  it("returns undefined for unknown values", () => {
    expect(parseAlignH("top")).toBeUndefined();
    expect(parseAlignH(undefined)).toBeUndefined();
  });
});

describe("parseAlignV - Relative vertical alignment", () => {
  it("parses known values", () => {
    expect(parseAlignV("top")).toBe("top");
    expect(parseAlignV("center")).toBe("center");
    expect(parseAlignV("inside")).toBe("inside");
  });

  it("returns undefined for unknown values", () => {
    expect(parseAlignV("left")).toBeUndefined();
    expect(parseAlignV(undefined)).toBeUndefined();
  });
});

describe("parseRelFromH - Horizontal relative positioning base", () => {
  it("parses known values", () => {
    expect(parseRelFromH("page")).toBe("page");
    expect(parseRelFromH("margin")).toBe("margin");
    expect(parseRelFromH("insideMargin")).toBe("insideMargin");
  });

  it("returns undefined for unknown values", () => {
    expect(parseRelFromH("top")).toBeUndefined();
    expect(parseRelFromH(undefined)).toBeUndefined();
  });
});

describe("parseRelFromV - Vertical relative positioning base", () => {
  it("parses known values", () => {
    expect(parseRelFromV("page")).toBe("page");
    expect(parseRelFromV("paragraph")).toBe("paragraph");
    expect(parseRelFromV("topMargin")).toBe("topMargin");
  });

  it("returns undefined for unknown values", () => {
    expect(parseRelFromV("leftMargin")).toBeUndefined();
    expect(parseRelFromV(undefined)).toBeUndefined();
  });
});

describe("parsePositionOffset - Absolute position offset (EMU)", () => {
  it("parses EMU values", () => {
    expect(parsePositionOffset("914400")).toBeCloseTo(96, 0);
    expect(parsePositionOffset("0")).toBe(0);
  });

  it("returns undefined for invalid values", () => {
    expect(parsePositionOffset("invalid")).toBeUndefined();
    expect(parsePositionOffset(undefined)).toBeUndefined();
  });
});

describe("parseWrapDistance - Distance from text", () => {
  it("parses unsigned EMU values", () => {
    expect(parseWrapDistance("457200")).toBeCloseTo(48, 0);
    expect(parseWrapDistance("0")).toBe(0);
  });

  it("returns undefined for invalid values", () => {
    expect(parseWrapDistance("-1")).toBeUndefined();
    expect(parseWrapDistance("invalid")).toBeUndefined();
  });
});

describe("parseWrapText - Text wrapping location", () => {
  it("parses known values", () => {
    expect(parseWrapText("bothSides")).toBe("bothSides");
    expect(parseWrapText("largest")).toBe("largest");
  });

  it("returns undefined for unknown values", () => {
    expect(parseWrapText("center")).toBeUndefined();
    expect(parseWrapText(undefined)).toBeUndefined();
  });
});

describe("parseEditAs - Spreadsheet anchor resize behavior", () => {
  it("parses known values", () => {
    expect(parseEditAs("twoCell")).toBe("twoCell");
    expect(parseEditAs("oneCell")).toBe("oneCell");
    expect(parseEditAs("absolute")).toBe("absolute");
  });

  it("returns undefined for unknown values", () => {
    expect(parseEditAs("center")).toBeUndefined();
    expect(parseEditAs(undefined)).toBeUndefined();
  });
});

// =============================================================================
// Font Size Parsing (ECMA-376 Section 21.1.2.3.6)
// =============================================================================

describe("parseFontSize - 100ths of point to points", () => {
  it("converts 1800 to 18pt", () => {
    expect(parseFontSize("1800")).toBe(18);
  });

  it("converts 2400 to 24pt", () => {
    expect(parseFontSize("2400")).toBe(24);
  });

  it("converts 1200 to 12pt", () => {
    expect(parseFontSize("1200")).toBe(12);
  });

  it("handles fractional points", () => {
    const result = parseFontSize("1050"); // 10.5pt
    expect(result).toBeCloseTo(10.5, 1);
  });

  it("returns undefined for undefined input", () => {
    expect(parseFontSize(undefined)).toBeUndefined();
  });
});

describe("parseFontSizeOr - Font size with default", () => {
  it("returns parsed value when valid", () => {
    expect(parseFontSizeOr("1800", pt(12))).toBe(18);
  });

  it("returns default for undefined", () => {
    expect(parseFontSizeOr(undefined, pt(12))).toBe(12);
  });
});

describe("parseFontSizeToPx - Font size to pixels", () => {
  it("converts 18pt to ~24px", () => {
    // 18pt * (96/72) = 24px
    const result = parseFontSizeToPx("1800");
    expect(result).toBeCloseTo(24, 0);
  });

  it("converts 12pt to 16px", () => {
    const result = parseFontSizeToPx("1200");
    expect(result).toBeCloseTo(16, 0);
  });

  it("returns undefined for undefined input", () => {
    expect(parseFontSizeToPx(undefined)).toBeUndefined();
  });
});

describe("pointsToPixels - Points to pixels conversion", () => {
  it("converts 72pt to 96px", () => {
    expect(pointsToPixels(pt(72))).toBe(96);
  });

  it("converts 36pt to 48px", () => {
    expect(pointsToPixels(pt(36))).toBe(48);
  });

  it("converts 12pt to 16px", () => {
    expect(pointsToPixels(pt(12))).toBe(16);
  });
});

// =============================================================================
// Attribute Helpers
// =============================================================================

describe("getEmuAttr - Get EMU attribute as pixels", () => {
  it("extracts and converts EMU attribute", () => {
    const element = el("a:off", { x: "914400" });
    const result = getEmuAttr(element, "x");
    expect(result).toBeCloseTo(96, 0);
  });

  it("returns undefined for missing attribute", () => {
    const element = el("a:off", {});
    expect(getEmuAttr(element, "x")).toBeUndefined();
  });
});

describe("getEmuAttrOr - Get EMU attribute with default", () => {
  it("returns converted value when present", () => {
    const element = el("a:off", { x: "914400" });
    const result = getEmuAttrOr(element, "x", px(0));
    expect(result).toBeCloseTo(96, 0);
  });

  it("returns default when attribute missing", () => {
    const element = el("a:off", {});
    expect(getEmuAttrOr(element, "x", px(50))).toBe(50);
  });
});

describe("getAngleAttr - Get angle attribute as degrees", () => {
  it("extracts and converts angle attribute", () => {
    const element = el("a:xfrm", { rot: "5400000" });
    expect(getAngleAttr(element, "rot")).toBe(90);
  });

  it("returns undefined for missing attribute", () => {
    const element = el("a:xfrm", {});
    expect(getAngleAttr(element, "rot")).toBeUndefined();
  });
});

describe("getBoolAttr - Get boolean attribute", () => {
  it("extracts boolean attribute", () => {
    const element = el("a:xfrm", { flipH: "1" });
    expect(getBoolAttr(element, "flipH")).toBe(true);
  });

  it("returns undefined for missing attribute", () => {
    const element = el("a:xfrm", {});
    expect(getBoolAttr(element, "flipH")).toBeUndefined();
  });

  it("returns undefined for undefined element", () => {
    expect(getBoolAttr(undefined, "flipH")).toBeUndefined();
  });
});

describe("getBoolAttrOr - Get boolean attribute with default", () => {
  it("returns attribute value when present", () => {
    const element = el("a:xfrm", { flipH: "0" });
    expect(getBoolAttrOr(element, "flipH", true)).toBe(false);
  });

  it("returns default when attribute missing", () => {
    const element = el("a:xfrm", {});
    expect(getBoolAttrOr(element, "flipH", true)).toBe(true);
  });
});

describe("getIntAttr - Get integer attribute", () => {
  it("extracts integer attribute", () => {
    const element = el("a:gs", { pos: "50000" });
    expect(getIntAttr(element, "pos")).toBe(50000);
  });

  it("returns undefined for missing attribute", () => {
    const element = el("a:gs", {});
    expect(getIntAttr(element, "pos")).toBeUndefined();
  });

  it("returns undefined for undefined element", () => {
    expect(getIntAttr(undefined, "pos")).toBeUndefined();
  });
});

describe("getIndexAttr - Get index attribute", () => {
  it("extracts unsigned index attribute", () => {
    const element = el("p:ph", { idx: "4" });
    expect(getIndexAttr(element, "idx")).toBe(4);
  });

  it("returns undefined for invalid index", () => {
    const element = el("p:ph", { idx: "-2" });
    expect(getIndexAttr(element, "idx")).toBeUndefined();
  });
});

describe("getIntAttrOr - Get integer attribute with default", () => {
  it("returns attribute value when present", () => {
    const element = el("a:gs", { pos: "75000" });
    expect(getIntAttrOr(element, "pos", 0)).toBe(75000);
  });

  it("returns default when attribute missing", () => {
    const element = el("a:gs", {});
    expect(getIntAttrOr(element, "pos", 100)).toBe(100);
  });
});

describe("getFloatAttr - Get float attribute", () => {
  it("extracts float attribute", () => {
    const element = el("a:test", { val: "3.14" });
    expect(getFloatAttr(element, "val")).toBeCloseTo(3.14, 2);
  });

  it("returns undefined for undefined element", () => {
    expect(getFloatAttr(undefined, "val")).toBeUndefined();
  });
});

describe("getFontSizeAttr - Get font size attribute as points", () => {
  it("extracts and converts font size", () => {
    const element = el("a:rPr", { sz: "1800" });
    expect(getFontSizeAttr(element, "sz")).toBe(18);
  });

  it("returns undefined for missing attribute", () => {
    const element = el("a:rPr", {});
    expect(getFontSizeAttr(element, "sz")).toBeUndefined();
  });
});

describe("getPercentAttr - Get percentage attribute (1000ths)", () => {
  it("extracts and converts percentage", () => {
    const element = el("a:test", { val: "50000" });
    expect(getPercentAttr(element, "val")).toBe(50);
  });
});

describe("getPercent100kAttr - Get percentage attribute (100000ths)", () => {
  it("extracts and converts percentage", () => {
    const element = el("a:alpha", { val: "50000" });
    expect(getPercent100kAttr(element, "val")).toBe(50);
  });
});

// =============================================================================
// Child Element Helpers
// =============================================================================

describe("getChildAttr - Get child element attribute", () => {
  it("extracts attribute from child element", () => {
    const parent = el("a:xfrm", {}, [el("a:off", { x: "914400", y: "457200" })]);
    expect(getChildAttr(parent, "a:off", "x")).toBe("914400");
    expect(getChildAttr(parent, "a:off", "y")).toBe("457200");
  });

  it("returns undefined for missing child", () => {
    const parent = el("a:xfrm", {});
    expect(getChildAttr(parent, "a:off", "x")).toBeUndefined();
  });

  it("returns undefined for missing attribute", () => {
    const parent = el("a:xfrm", {}, [el("a:off", {})]);
    expect(getChildAttr(parent, "a:off", "x")).toBeUndefined();
  });
});

describe("getChildEmuAttr - Get child EMU attribute as pixels", () => {
  it("extracts and converts EMU from child", () => {
    const parent = el("a:xfrm", {}, [el("a:off", { x: "914400" })]);
    const result = getChildEmuAttr(parent, "a:off", "x");
    expect(result).toBeCloseTo(96, 0);
  });

  it("returns undefined for missing child", () => {
    const parent = el("a:xfrm", {});
    expect(getChildEmuAttr(parent, "a:off", "x")).toBeUndefined();
  });
});

describe("getChildBoolAttr - Get child boolean attribute", () => {
  it("extracts boolean from child element", () => {
    const parent = el("a:xfrm", {}, [el("a:child", { enabled: "1" })]);
    expect(getChildBoolAttr(parent, "a:child", "enabled")).toBe(true);
  });

  it("returns undefined for missing child", () => {
    const parent = el("a:xfrm", {});
    expect(getChildBoolAttr(parent, "a:child", "enabled")).toBeUndefined();
  });
});
