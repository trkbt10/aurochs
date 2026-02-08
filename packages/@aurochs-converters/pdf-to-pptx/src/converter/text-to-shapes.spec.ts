/**
 * @file Tests for PdfText → SpShape conversion
 */

import type { PdfColor, PdfGraphicsState, PdfText } from "@aurochs/pdf/domain";
import { createDefaultGraphicsState } from "@aurochs/pdf/domain";
import { deg, pt, px } from "@aurochs-office/drawing-ml/domain/units";
import { convertTextToShape, convertGroupedTextToShape } from "./text-to-shapes";
import type { GroupedText } from "./text-grouping/types";
import { createFitContext } from "./transform-converter";

function createContext({
  pdfWidth,
  pdfHeight,
  slideWidth,
  slideHeight,
}: {
  pdfWidth: number;
  pdfHeight: number;
  slideWidth: number;
  slideHeight: number;
}) {
  return createFitContext({
    pdfWidth,
    pdfHeight,
    slideWidth: px(slideWidth),
    slideHeight: px(slideHeight),
    fit: "stretch",
  });
}

function createGraphicsState(fillColor: PdfColor, fillAlpha: number = 1): PdfGraphicsState {
  return {
    ...createDefaultGraphicsState(),
    fillColor,
    fillAlpha,
  };
}

describe("convertTextToShape", () => {
  it("converts PdfText into a text-box SpShape with correct geometry and text", () => {
    const graphicsState = createGraphicsState({ colorSpace: "DeviceRGB", components: [1, 0, 0] as const }, 1);

    const pdfText: PdfText = {
      type: "text",
      text: "Hello",
      x: 50,
      y: 100,
      width: 100,
      height: 10,
      fontName: "/BCDFEE+ArialMT",
      fontSize: 12,
      graphicsState,
    };

    const context = createContext({ pdfWidth: 200, pdfHeight: 400, slideWidth: 400, slideHeight: 800 });

    const shape = convertTextToShape(pdfText, context, "1");

    expect(shape.type).toBe("sp");
    expect(shape.nonVisual).toEqual({
      id: "1",
      name: "TextBox 1",
      textBox: true,
    });

    expect(shape.properties.fill).toEqual({ type: "noFill" });
    expect(shape.properties.geometry).toEqual({
      type: "preset",
      preset: "rect",
      adjustValues: [],
    });

    expect(shape.properties.transform).toEqual({
      x: px(100),
      y: px(580),
      width: px(200),
      height: px(20),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    });

    expect(shape.textBody).toEqual({
      bodyProperties: {
        wrapping: "none",
        anchor: "top",
        anchorCenter: false,
        forceAntiAlias: true,
        insets: {
          left: px(0),
          top: px(0),
          right: px(0),
          bottom: px(0),
        },
      },
      paragraphs: [
        {
          properties: {
            alignment: "left",
          },
          runs: [
            {
              type: "text",
              text: "Hello",
              properties: {
                fontSize: pt(18),
                fontFamily: "ArialMT",
                fill: {
                  type: "solidFill",
                  color: { spec: { type: "srgb", value: "FF0000" } },
                },
                bold: false,
                italic: false,
                underline: "none",
              },
            },
          ],
          endProperties: {},
        },
      ],
    });
  });

  describe("Y coordinate conversion (baseline → top edge)", () => {
    const context = createContext({ pdfWidth: 100, pdfHeight: 100, slideWidth: 100, slideHeight: 100 });

    it.each([
      { name: "page top", y: 90, height: 10, fontSize: 10, expectedY: 0 },
      { name: "page middle", y: 50, height: 10, fontSize: 10, expectedY: 40 },
      { name: "page bottom", y: 0, height: 10, fontSize: 10, expectedY: 90 },
      { name: "large font size", y: 70, height: 30, fontSize: 30, expectedY: 0 },
      { name: "small font size", y: 50, height: 5, fontSize: 5, expectedY: 45 },
    ] satisfies ReadonlyArray<{
      readonly name: string;
      readonly y: number;
      readonly height: number;
      readonly fontSize: number;
      readonly expectedY: number;
    }>)("$name", ({ y, height, fontSize, expectedY }) => {
      const pdfText: PdfText = {
        type: "text",
        text: "Y",
        x: 10,
        y,
        width: 20,
        height,
        fontName: "Helvetica",
        fontSize,
        graphicsState: createGraphicsState({ colorSpace: "DeviceGray", components: [0] as const }),
      };

      const shape = convertTextToShape(pdfText, context, "t");

      expect(shape.properties.transform).toEqual({
        x: px(10),
        y: px(expectedY),
        width: px(20),
        height: px(height),
        rotation: deg(0),
        flipH: false,
        flipV: false,
      });

      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") {
        throw new Error("Expected text run");
      }
      if (!run.properties) {
        throw new Error("Expected run properties");
      }
      expect(run.properties.fontSize).toEqual(pt(fontSize * context.fontSizeScale));
    });

    it("keeps multiline text as-is and uses the whole block height for baseline-to-top conversion", () => {
      const pdfText: PdfText = {
        type: "text",
        text: "Line 1\nLine 2",
        x: 10,
        y: 60,
        width: 20,
        height: 20,
        fontName: "Helvetica",
        fontSize: 10,
        graphicsState: createGraphicsState({ colorSpace: "DeviceGray", components: [0] as const }),
      };

      const shape = convertTextToShape(pdfText, context, "ml");
      const transform = shape.properties.transform;
      if (!transform) {
        throw new Error("Expected shape transform");
      }
      expect(transform.y).toEqual(px(20));

      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") {
        throw new Error("Expected text run");
      }
      expect(run.text).toBe("Line 1\nLine 2");
    });
  });

  it("throws when shapeId is empty", () => {
    const pdfText: PdfText = {
      type: "text",
      text: "X",
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fontName: "ArialMT",
      fontSize: 10,
      graphicsState: createGraphicsState({ colorSpace: "DeviceGray", components: [0] as const }),
    };

    const context = createContext({ pdfWidth: 100, pdfHeight: 100, slideWidth: 100, slideHeight: 100 });
    expect(() => convertTextToShape(pdfText, context, "")).toThrow("shapeId is required");
  });

  it("throws for invalid text bounds and font size", () => {
    const g = createGraphicsState({ colorSpace: "DeviceGray", components: [0] as const });
    const context = createContext({ pdfWidth: 100, pdfHeight: 100, slideWidth: 100, slideHeight: 100 });

    expect(() =>
      convertTextToShape(
        {
          type: "text",
          text: "X",
          x: 0,
          y: 0,
          width: -1,
          height: 10,
          fontName: "ArialMT",
          fontSize: 10,
          graphicsState: g,
        },
        context,
        "1",
      ),
    ).toThrow("Invalid PdfText width");

    expect(() =>
      convertTextToShape(
        {
          type: "text",
          text: "X",
          x: 0,
          y: 0,
          width: 10,
          height: -1,
          fontName: "ArialMT",
          fontSize: 10,
          graphicsState: g,
        },
        context,
        "1",
      ),
    ).toThrow("Invalid PdfText height");

    expect(() =>
      convertTextToShape(
        {
          type: "text",
          text: "X",
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          fontName: "ArialMT",
          fontSize: 0,
          graphicsState: g,
        },
        context,
        "1",
      ),
    ).toThrow("Invalid pdfFontSize");
  });

  it("detects bold/italic from PDF font names", () => {
    const g = createGraphicsState({ colorSpace: "DeviceGray", components: [0] as const });
    const context = createContext({ pdfWidth: 100, pdfHeight: 100, slideWidth: 100, slideHeight: 100 });

    const shape = convertTextToShape(
      {
        type: "text",
        text: "Style",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        fontName: "/ABCDEF+Arial-BoldItalicMT",
        fontSize: 10,
        graphicsState: g,
      },
      context,
      "1",
    );

    const run = shape.textBody?.paragraphs[0]?.runs[0];
    if (!run || run.type !== "text") {
      throw new Error("Expected text run");
    }
    if (!run.properties) {
      throw new Error("Expected run properties");
    }
    expect(run.properties.bold).toBe(true);
    expect(run.properties.italic).toBe(true);
  });

  describe("script type detection for font elements", () => {
    const g = createGraphicsState({ colorSpace: "DeviceGray", components: [0] as const });
    const context = createContext({ pdfWidth: 100, pdfHeight: 100, slideWidth: 100, slideHeight: 100 });

    it("sets fontFamilyEastAsian for Japanese font (MS Gothic)", () => {
      const shape = convertTextToShape(
        {
          type: "text",
          text: "テスト",
          x: 0,
          y: 50,
          width: 30,
          height: 12,
          fontName: "ABCDEF+MSGothic",
          fontSize: 12,
          graphicsState: g,
        },
        context,
        "1",
      );

      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") {
        throw new Error("Expected text run");
      }
      // Font name is preserved as-is (after removing subset prefix)
      // This ensures @font-face matching for embedded fonts
      expect(run.properties?.fontFamily).toBe("MSGothic");
      expect(run.properties?.fontFamilyEastAsian).toBe("MSGothic");
    });

    it("sets fontFamilyEastAsian for Japanese font (Yu Mincho)", () => {
      const shape = convertTextToShape(
        {
          type: "text",
          text: "日本語",
          x: 0,
          y: 50,
          width: 30,
          height: 12,
          fontName: "YuMincho-Regular",
          fontSize: 12,
          graphicsState: g,
        },
        context,
        "1",
      );

      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") {
        throw new Error("Expected text run");
      }
      // YuMincho maps to Yu Mincho
      expect(run.properties?.fontFamilyEastAsian).toBeDefined();
    });

    it("sets fontFamilyEastAsian for Chinese Simplified font (SimSun)", () => {
      const shape = convertTextToShape(
        {
          type: "text",
          text: "中文",
          x: 0,
          y: 50,
          width: 20,
          height: 12,
          fontName: "SimSun",
          fontSize: 12,
          graphicsState: g,
        },
        context,
        "1",
      );

      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") {
        throw new Error("Expected text run");
      }
      expect(run.properties?.fontFamily).toBe("SimSun");
      expect(run.properties?.fontFamilyEastAsian).toBe("SimSun");
    });

    it("sets fontFamilyComplexScript for Arabic font", () => {
      const shape = convertTextToShape(
        {
          type: "text",
          text: "عربي",
          x: 0,
          y: 50,
          width: 30,
          height: 12,
          fontName: "Traditional Arabic",
          fontSize: 12,
          graphicsState: g,
        },
        context,
        "1",
      );

      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") {
        throw new Error("Expected text run");
      }
      expect(run.properties?.fontFamilyComplexScript).toBe("Traditional Arabic");
      expect(run.properties?.fontFamilyEastAsian).toBeUndefined();
    });

    it("sets fontFamilyComplexScript for Thai font", () => {
      const shape = convertTextToShape(
        {
          type: "text",
          text: "ไทย",
          x: 0,
          y: 50,
          width: 20,
          height: 12,
          fontName: "Angsana New",
          fontSize: 12,
          graphicsState: g,
        },
        context,
        "1",
      );

      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") {
        throw new Error("Expected text run");
      }
      expect(run.properties?.fontFamilyComplexScript).toBe("Angsana New");
    });

    it("does not set fontFamilyEastAsian for Latin font (Arial)", () => {
      const shape = convertTextToShape(
        {
          type: "text",
          text: "Test",
          x: 0,
          y: 50,
          width: 20,
          height: 12,
          fontName: "ArialMT",
          fontSize: 12,
          graphicsState: g,
        },
        context,
        "1",
      );

      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") {
        throw new Error("Expected text run");
      }
      // ArialMT is not Standard 14, preserved as-is
      expect(run.properties?.fontFamily).toBe("ArialMT");
      expect(run.properties?.fontFamilyEastAsian).toBeUndefined();
      expect(run.properties?.fontFamilyComplexScript).toBeUndefined();
    });

    // CIDOrdering-based detection (ISO 32000-1 Section 9.7.3)
    it("sets fontFamilyEastAsian from cidOrdering Japan1", () => {
      const shape = convertTextToShape(
        {
          type: "text",
          text: "日本語テスト",
          x: 0,
          y: 50,
          width: 60,
          height: 12,
          fontName: "UnknownFont", // Font name doesn't indicate script
          fontSize: 12,
          graphicsState: g,
          cidOrdering: "Japan1", // But CIDOrdering identifies it as Japanese
        },
        context,
        "1",
      );

      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") {
        throw new Error("Expected text run");
      }
      expect(run.properties?.fontFamilyEastAsian).toBe("UnknownFont");
    });

    it("sets fontFamilyEastAsian from cidOrdering GB1", () => {
      const shape = convertTextToShape(
        {
          type: "text",
          text: "简体中文",
          x: 0,
          y: 50,
          width: 40,
          height: 12,
          fontName: "CustomFont",
          fontSize: 12,
          graphicsState: g,
          cidOrdering: "GB1",
        },
        context,
        "1",
      );

      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") {
        throw new Error("Expected text run");
      }
      expect(run.properties?.fontFamilyEastAsian).toBe("CustomFont");
    });

    it("sets fontFamilyEastAsian from cidOrdering CNS1", () => {
      const shape = convertTextToShape(
        {
          type: "text",
          text: "繁體中文",
          x: 0,
          y: 50,
          width: 40,
          height: 12,
          fontName: "TraditionalFont",
          fontSize: 12,
          graphicsState: g,
          cidOrdering: "CNS1",
        },
        context,
        "1",
      );

      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") {
        throw new Error("Expected text run");
      }
      expect(run.properties?.fontFamilyEastAsian).toBe("TraditionalFont");
    });

    it("sets fontFamilyEastAsian from cidOrdering Korea1", () => {
      const shape = convertTextToShape(
        {
          type: "text",
          text: "한국어",
          x: 0,
          y: 50,
          width: 30,
          height: 12,
          fontName: "KoreanFont",
          fontSize: 12,
          graphicsState: g,
          cidOrdering: "Korea1",
        },
        context,
        "1",
      );

      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") {
        throw new Error("Expected text run");
      }
      expect(run.properties?.fontFamilyEastAsian).toBe("KoreanFont");
    });

    it("cidOrdering takes priority over font name pattern", () => {
      // Font name suggests Arabic (Complex Script), but CIDOrdering says Japan1
      const shape = convertTextToShape(
        {
          type: "text",
          text: "テスト",
          x: 0,
          y: 50,
          width: 30,
          height: 12,
          fontName: "Arabic-Style-Font", // Name suggests Arabic
          fontSize: 12,
          graphicsState: g,
          cidOrdering: "Japan1", // But CIDOrdering says Japanese
        },
        context,
        "1",
      );

      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") {
        throw new Error("Expected text run");
      }
      // CIDOrdering wins: should be East Asian, not Complex Script
      expect(run.properties?.fontFamilyEastAsian).toBe("Arabic-Style-Font");
      expect(run.properties?.fontFamilyComplexScript).toBeUndefined();
    });
  });

  describe("charSpacing conversion", () => {
    const context = createContext({ pdfWidth: 100, pdfHeight: 100, slideWidth: 100, slideHeight: 100 });
    const g = createGraphicsState({ colorSpace: "DeviceGray", components: [0] as const });

    it("converts positive charSpacing to PPTX spacing", () => {
      const pdfText: PdfText = {
        type: "text",
        text: "Hello",
        x: 0,
        y: 50,
        width: 50,
        height: 10,
        fontName: "ArialMT",
        fontSize: 10,
        graphicsState: g,
        charSpacing: 2, // 2 points
      };

      const shape = convertTextToShape(pdfText, context, "1");
      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") {
        throw new Error("Expected text run");
      }

      // Spacing is converted from PDF points to slide pixels using the same X scale as coordinates.
      expect(run.properties?.spacing).toBeDefined();
      expect(run.properties?.spacing as number).toBeCloseTo(2 * context.scaleX, 6);
    });

    it("applies horizontalScaling to spacing", () => {
      const pdfText: PdfText = {
        type: "text",
        text: "Hello",
        x: 0,
        y: 50,
        width: 50,
        height: 10,
        fontName: "ArialMT",
        fontSize: 10,
        graphicsState: g,
        charSpacing: 2,
        horizontalScaling: 150, // 150%
      };

      const shape = convertTextToShape(pdfText, context, "1");
      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") {
        throw new Error("Expected text run");
      }

      // Apply horizontal scaling (Tz) and then convert using the X scale.
      expect(run.properties?.spacing).toBeDefined();
      expect(run.properties?.spacing as number).toBeCloseTo(2 * 1.5 * context.scaleX, 6);
    });

    it("omits spacing when charSpacing is 0", () => {
      const pdfText: PdfText = {
        type: "text",
        text: "Hello",
        x: 0,
        y: 50,
        width: 50,
        height: 10,
        fontName: "ArialMT",
        fontSize: 10,
        graphicsState: g,
        charSpacing: 0,
      };

      const shape = convertTextToShape(pdfText, context, "1");
      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") {
        throw new Error("Expected text run");
      }

      expect(run.properties?.spacing).toBeUndefined();
    });

    it("omits spacing when charSpacing is undefined", () => {
      const pdfText: PdfText = {
        type: "text",
        text: "Hello",
        x: 0,
        y: 50,
        width: 50,
        height: 10,
        fontName: "ArialMT",
        fontSize: 10,
        graphicsState: g,
      };

      const shape = convertTextToShape(pdfText, context, "1");
      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") {
        throw new Error("Expected text run");
      }

      expect(run.properties?.spacing).toBeUndefined();
    });
  });

  describe("wordSpacing conversion", () => {
    const context = createContext({ pdfWidth: 100, pdfHeight: 100, slideWidth: 100, slideHeight: 100 });
    const g = createGraphicsState({ colorSpace: "DeviceGray", components: [0] as const });

    it("ignores wordSpacing alone (only charSpacing is used)", () => {
      // Note: wordSpacing (PDF Tw operator) is intentionally not mapped to PPTX spacing
      // because PPTX's spacing applies uniformly to all characters, while PDF's Tw
      // only affects space characters. Averaging Tw produces inaccurate results.
      const pdfText: PdfText = {
        type: "text",
        text: "Hello World", // 1 space in 11 characters
        x: 0,
        y: 50,
        width: 80,
        height: 10,
        fontName: "ArialMT",
        fontSize: 10,
        graphicsState: g,
        wordSpacing: 5, // 5 points per space - NOT used
      };

      const shape = convertTextToShape(pdfText, context, "1");
      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") {
        throw new Error("Expected text run");
      }

      // wordSpacing is not mapped to PPTX spacing
      expect(run.properties?.spacing).toBeUndefined();
    });

    it("uses only charSpacing when both charSpacing and wordSpacing present", () => {
      const pdfText: PdfText = {
        type: "text",
        text: "A B", // 1 space in 3 characters
        x: 0,
        y: 50,
        width: 30,
        height: 10,
        fontName: "ArialMT",
        fontSize: 10,
        graphicsState: g,
        charSpacing: 2, // 2 points per char - this IS used
        wordSpacing: 4, // 4 points per space - NOT used
      };

      const shape = convertTextToShape(pdfText, context, "1");
      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") {
        throw new Error("Expected text run");
      }

      // Only charSpacing is used and converted using the X scale.
      expect(run.properties?.spacing).toBeDefined();
      expect(run.properties?.spacing as number).toBeCloseTo(2 * context.scaleX, 6);
    });

    it("ignores wordSpacing when text has no spaces", () => {
      const pdfText: PdfText = {
        type: "text",
        text: "NoSpaces",
        x: 0,
        y: 50,
        width: 60,
        height: 10,
        fontName: "ArialMT",
        fontSize: 10,
        graphicsState: g,
        wordSpacing: 5, // Not used regardless
      };

      const shape = convertTextToShape(pdfText, context, "1");
      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") {
        throw new Error("Expected text run");
      }

      // No charSpacing and wordSpacing is not used
      expect(run.properties?.spacing).toBeUndefined();
    });
  });

  describe("spacing validation", () => {
    const context = createContext({ pdfWidth: 100, pdfHeight: 100, slideWidth: 100, slideHeight: 100 });
    const g = createGraphicsState({ colorSpace: "DeviceGray", components: [0] as const });

    it("omits negligible spacing (less than 0.5px)", () => {
      const pdfText: PdfText = {
        type: "text",
        text: "Test",
        x: 0,
        y: 50,
        width: 40,
        height: 10,
        fontName: "ArialMT",
        fontSize: 10,
        graphicsState: g,
        charSpacing: 0.01, // Very small
      };

      const shape = convertTextToShape(pdfText, context, "1");
      const run = shape.textBody?.paragraphs[0]?.runs[0];
      if (!run || run.type !== "text") {
        throw new Error("Expected text run");
      }

      // 0.01 * (96/72) ≈ 0.013px, should be omitted
      expect(run.properties?.spacing).toBeUndefined();
    });
  });
});

describe("convertGroupedTextToShape", () => {
  const createPdfText = (overrides: Partial<PdfText> = {}): PdfText => ({
    type: "text",
    text: "Test",
    x: 0,
    y: 0,
    width: 100,
    height: 12,
    fontName: "Helvetica",
    fontSize: 12,
    graphicsState: createDefaultGraphicsState(),
    ...overrides,
  });

  const context = createContext({ pdfWidth: 100, pdfHeight: 100, slideWidth: 100, slideHeight: 100 });

  it("converts single-paragraph group to SpShape", () => {
    const group: GroupedText = {
      bounds: { x: 10, y: 88, width: 50, height: 12 },
      paragraphs: [
        {
          runs: [createPdfText({ text: "Hello", x: 10, y: 88 })],
          baselineY: 100,
        },
      ],
    };

    const shape = convertGroupedTextToShape(group, context, "1");

    expect(shape.type).toBe("sp");
    expect(shape.nonVisual?.textBox).toBe(true);
    expect(shape.textBody?.paragraphs).toHaveLength(1);
    const run = shape.textBody?.paragraphs[0].runs[0];
    if (!run || run.type !== "text") {
      throw new Error("Expected text run");
    }
    expect(run.text).toBe("Hello");
  });

  it("converts consecutive lines into separate paragraphs to preserve layout", () => {
    // Preserve PDF line structure using paragraph spacing/margins (avoid PPTX reflow).
    const group: GroupedText = {
      bounds: { x: 10, y: 76, width: 100, height: 24 },
      paragraphs: [
        {
          runs: [createPdfText({ text: "Line 1", y: 88 })],
          baselineY: 100, // 12pt spacing = normal line height
        },
        {
          runs: [createPdfText({ text: "Line 2", y: 76 })],
          baselineY: 88,
        },
      ],
    };

    const shape = convertGroupedTextToShape(group, context, "1");

    // Two PDF lines -> two PPTX paragraphs
    expect(shape.textBody?.paragraphs).toHaveLength(2);
    expect(shape.textBody?.paragraphs[0]?.runs).toHaveLength(1);
    expect(shape.textBody?.paragraphs[1]?.runs).toHaveLength(1);
    const run1 = shape.textBody?.paragraphs[0].runs[0];
    const run2 = shape.textBody?.paragraphs[1].runs[0];
    if (!run1 || run1.type !== "text") {
      throw new Error("Expected text run");
    }
    if (!run2 || run2.type !== "text") {
      throw new Error("Expected text run");
    }
    expect(run1.text).toBe("Line 1");
    expect(run2.text).toBe("Line 2");
  });

  it("creates separate paragraphs when there is significant extra space", () => {
    // When extraSpace > fontSize * 0.5, treat as paragraph break
    // fontSize=12, threshold=6, so need extraSpace > 6
    // baselineDistance = 100 - 70 = 30, extraSpace = 30 - 12 = 18 > 6
    const group: GroupedText = {
      bounds: { x: 10, y: 58, width: 100, height: 42 },
      paragraphs: [
        {
          runs: [createPdfText({ text: "Paragraph 1", y: 88 })],
          baselineY: 100,
        },
        {
          runs: [createPdfText({ text: "Paragraph 2", y: 58 })],
          baselineY: 70, // 30pt spacing with 12pt font = 18pt extra space
        },
      ],
    };

    const shape = convertGroupedTextToShape(group, context, "1");

    // Should be 2 separate paragraphs due to significant extra space
    expect(shape.textBody?.paragraphs).toHaveLength(2);
    const run1 = shape.textBody?.paragraphs[0].runs[0];
    const run2 = shape.textBody?.paragraphs[1].runs[0];
    if (!run1 || run1.type !== "text") {
      throw new Error("Expected text run");
    }
    if (!run2 || run2.type !== "text") {
      throw new Error("Expected text run");
    }
    expect(run1.text).toBe("Paragraph 1");
    expect(run2.text).toBe("Paragraph 2");
    // Second paragraph should have spaceBefore
    expect(shape.textBody?.paragraphs[1].properties?.spaceBefore).toBeDefined();
  });

  it("converts paragraph with multiple runs", () => {
    const group: GroupedText = {
      bounds: { x: 10, y: 88, width: 150, height: 12 },
      paragraphs: [
        {
          runs: [createPdfText({ text: "Hello ", x: 10 }), createPdfText({ text: "World", x: 60 })],
          baselineY: 100,
        },
      ],
    };

    const shape = convertGroupedTextToShape(group, context, "1");

    expect(shape.textBody?.paragraphs[0].runs).toHaveLength(1);
    const run = shape.textBody?.paragraphs[0].runs[0];
    if (!run || run.type !== "text") {
      throw new Error("Expected text run");
    }
    expect(run.text).toBe("Hello World");
  });

  it("throws when shapeId is empty", () => {
    const group: GroupedText = {
      bounds: { x: 10, y: 88, width: 50, height: 12 },
      paragraphs: [
        {
          runs: [createPdfText({ text: "Test" })],
          baselineY: 100,
        },
      ],
    };

    expect(() => convertGroupedTextToShape(group, context, "")).toThrow("shapeId is required");
  });

  it("correctly positions shape using bounds", () => {
    const group: GroupedText = {
      bounds: { x: 20, y: 70, width: 60, height: 30 },
      paragraphs: [
        {
          runs: [createPdfText({ text: "Positioned" })],
          baselineY: 100,
        },
      ],
    };

    const shape = convertGroupedTextToShape(group, context, "pos");
    const transform = shape.properties.transform;

    expect(transform?.x).toEqual(px(20));
    // PDF y=70, height=30, so top in PDF = 100, which in PPTX is y=0
    // After conversion: 100 - 70 - 30 = 0
    expect(transform?.y).toEqual(px(0));
    expect(transform?.width).toEqual(px(60));
    expect(transform?.height).toEqual(px(30));
  });
});
