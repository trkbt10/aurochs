/**
 * @file Tests for PdfText → SpShape conversion
 */

import type { PdfColor, PdfGraphicsState, PdfText } from "../domain";
import { createDefaultGraphicsState } from "../domain";
import { deg, pt, px } from "../../ooxml/domain/units";
import { convertTextToShape } from "./text-to-shapes";

function createGraphicsState(fillColor: PdfColor, fillAlpha: number = 1): PdfGraphicsState {
  return {
    ...createDefaultGraphicsState(),
    fillColor,
    fillAlpha,
  };
}

describe("convertTextToShape", () => {
  it("converts PdfText into a text-box SpShape with correct geometry and text", () => {
    const graphicsState = createGraphicsState(
      { colorSpace: "DeviceRGB", components: [1, 0, 0] as const },
      1
    );

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

    const context = {
      pdfWidth: 200,
      pdfHeight: 400,
      slideWidth: px(400),
      slideHeight: px(800),
    } as const;

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
                fontSize: pt(12),
                fontFamily: "Arial",
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

  it("applies Y-axis flip from ConversionContext (PDF bottom-left → PPTX top-left)", () => {
    const pdfText: PdfText = {
      type: "text",
      text: "Y",
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fontName: "Helvetica",
      fontSize: 10,
      graphicsState: createGraphicsState({ colorSpace: "DeviceGray", components: [0] as const }),
    };

    const context = {
      pdfWidth: 100,
      pdfHeight: 100,
      slideWidth: px(100),
      slideHeight: px(100),
    } as const;

    const shape = convertTextToShape(pdfText, context, "t");

    expect(shape.properties.transform).toEqual({
      x: px(0),
      y: px(90),
      width: px(10),
      height: px(10),
      rotation: deg(0),
      flipH: false,
      flipV: false,
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

    const context = { pdfWidth: 100, pdfHeight: 100, slideWidth: px(100), slideHeight: px(100) } as const;
    expect(() => convertTextToShape(pdfText, context, "")).toThrow("shapeId is required");
  });

  it("throws for invalid text bounds and font size", () => {
    const g = createGraphicsState({ colorSpace: "DeviceGray", components: [0] as const });
    const context = { pdfWidth: 100, pdfHeight: 100, slideWidth: px(100), slideHeight: px(100) } as const;

    expect(() =>
      convertTextToShape({ type: "text", text: "X", x: 0, y: 0, width: -1, height: 10, fontName: "ArialMT", fontSize: 10, graphicsState: g }, context, "1")
    ).toThrow("Invalid PdfText width");

    expect(() =>
      convertTextToShape({ type: "text", text: "X", x: 0, y: 0, width: 10, height: -1, fontName: "ArialMT", fontSize: 10, graphicsState: g }, context, "1")
    ).toThrow("Invalid PdfText height");

    expect(() =>
      convertTextToShape({ type: "text", text: "X", x: 0, y: 0, width: 10, height: 10, fontName: "ArialMT", fontSize: 0, graphicsState: g }, context, "1")
    ).toThrow("Invalid pdfFontSize");
  });

  it("detects bold/italic from PDF font names", () => {
    const g = createGraphicsState({ colorSpace: "DeviceGray", components: [0] as const });
    const context = { pdfWidth: 100, pdfHeight: 100, slideWidth: px(100), slideHeight: px(100) } as const;

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
      "1"
    );

    const run = shape.textBody?.paragraphs[0]?.runs[0];
    if (!run || run.type !== "text") throw new Error("Expected text run");
    if (!run.properties) throw new Error("Expected run properties");
    expect(run.properties.bold).toBe(true);
    expect(run.properties.italic).toBe(true);
  });
});

