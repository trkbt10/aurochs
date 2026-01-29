/**
 * @file Unit tests for text-utils
 */

import {
  buildFontFamily,
  applyTextTransform,
  applyVerticalAlign,
  toSvgDominantBaseline,
} from "./text-utils";
import type { PositionedSpan } from "../../../text-layout";
import { pt, px } from "@oxen-office/ooxml/domain/units";

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a minimal PositionedSpan for testing
 */
function createTestSpan(overrides: Partial<PositionedSpan> = {}): PositionedSpan {
  return {
    text: "test",
    fontFamily: "Arial",
    fontFamilyEastAsian: undefined,
    fontFamilyComplexScript: undefined,
    fontFamilySymbol: undefined,
    fontSize: pt(12),
    fontWeight: 400,
    fontStyle: "normal" as const,
    textDecoration: undefined,
    color: "#000000",
    verticalAlign: "baseline" as const,
    letterSpacing: px(0),
    isBreak: false,
    direction: "ltr" as const,
    highlightColor: undefined,
    textTransform: undefined,
    linkId: undefined,
    linkTooltip: undefined,
    mouseOverLinkId: undefined,
    mouseOverLinkTooltip: undefined,
    bookmark: undefined,
    kerning: undefined,
    textOutline: undefined,
    textFill: undefined,
    effects: undefined,
    underlineColor: undefined,
    width: px(100),
    dx: px(0),
    ...overrides,
  };
}

// =============================================================================
// buildFontFamily Tests
// =============================================================================

describe("buildFontFamily", () => {
  it("returns single font family when only primary is set", () => {
    const span = createTestSpan({ fontFamily: "Arial" });
    expect(buildFontFamily(span)).toBe("Arial");
  });

  it("includes East Asian font family", () => {
    const span = createTestSpan({
      fontFamily: "Arial",
      fontFamilyEastAsian: "MS Gothic",
    });
    expect(buildFontFamily(span)).toBe("Arial, MS Gothic");
  });

  it("includes complex script font family when different", () => {
    const span = createTestSpan({
      fontFamily: "Arial",
      fontFamilyComplexScript: "Tahoma",
    });
    expect(buildFontFamily(span)).toBe("Arial, Tahoma");
  });

  it("excludes complex script font when same as primary", () => {
    const span = createTestSpan({
      fontFamily: "Arial",
      fontFamilyComplexScript: "Arial",
    });
    expect(buildFontFamily(span)).toBe("Arial");
  });

  it("includes symbol font family when different", () => {
    const span = createTestSpan({
      fontFamily: "Arial",
      fontFamilySymbol: "Symbol",
    });
    expect(buildFontFamily(span)).toBe("Arial, Symbol");
  });

  it("combines all font families", () => {
    const span = createTestSpan({
      fontFamily: "Arial",
      fontFamilyEastAsian: "MS Gothic",
      fontFamilyComplexScript: "Tahoma",
      fontFamilySymbol: "Symbol",
    });
    expect(buildFontFamily(span)).toBe("Arial, MS Gothic, Tahoma, Symbol");
  });
});

// =============================================================================
// applyTextTransform Tests
// =============================================================================

describe("applyTextTransform", () => {
  it("returns original text when transform is none", () => {
    expect(applyTextTransform("Hello World", "none")).toBe("Hello World");
  });

  it("returns original text when transform is undefined", () => {
    expect(applyTextTransform("Hello World", undefined)).toBe("Hello World");
  });

  it("converts to uppercase", () => {
    expect(applyTextTransform("Hello World", "uppercase")).toBe("HELLO WORLD");
  });

  it("converts to lowercase", () => {
    expect(applyTextTransform("Hello World", "lowercase")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(applyTextTransform("", "uppercase")).toBe("");
  });
});

// =============================================================================
// applyVerticalAlign Tests
// =============================================================================

describe("applyVerticalAlign", () => {
  const lineY = 100;
  const fontSizePx = 12;

  it("returns original Y for baseline alignment", () => {
    expect(applyVerticalAlign(lineY, fontSizePx, "baseline")).toBe(100);
  });

  it("moves Y up for superscript", () => {
    const result = applyVerticalAlign(lineY, fontSizePx, "superscript");
    expect(result).toBe(100 - 12 * 0.3);
  });

  it("moves Y down for subscript", () => {
    const result = applyVerticalAlign(lineY, fontSizePx, "subscript");
    expect(result).toBe(100 + 12 * 0.3);
  });
});

// =============================================================================
// toSvgDominantBaseline Tests
// =============================================================================

describe("toSvgDominantBaseline", () => {
  it("returns text-top for top alignment", () => {
    expect(toSvgDominantBaseline("top")).toBe("text-top");
  });

  it("returns central for center alignment", () => {
    expect(toSvgDominantBaseline("center")).toBe("central");
  });

  it("returns text-bottom for bottom alignment", () => {
    expect(toSvgDominantBaseline("bottom")).toBe("text-bottom");
  });

  it("returns undefined for auto alignment", () => {
    expect(toSvgDominantBaseline("auto")).toBeUndefined();
  });

  it("returns undefined for base alignment", () => {
    expect(toSvgDominantBaseline("base")).toBeUndefined();
  });
});
