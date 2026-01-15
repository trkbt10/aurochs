/**
 * @file Font rendering integration test
 * @vitest-environment jsdom
 *
 * Verifies font-family attribute is correctly set in SVG output
 */
import { describe, it, expect, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import { SlideRendererSvg } from "../../SlideRenderer";
import { px, pt, deg } from "../../../../../ooxml/domain/units";
import type { Slide } from "../../../../domain/slide/types";
import type { SpShape } from "../../../../domain/shape";
import { convertTextToShape } from "../../../../../pdf/converter/text-to-shapes";
import { createDefaultGraphicsState } from "../../../../../pdf/domain";

// Mock getComputedTextLength for JSDOM (not supported natively)
beforeAll(() => {
  // Create SVG element to get SVGTextElement prototype
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  svg.appendChild(text);
  document.body.appendChild(svg);

  const SVGTextElementProto = Object.getPrototypeOf(text);
  if (!SVGTextElementProto.getComputedTextLength) {
    SVGTextElementProto.getComputedTextLength = function () {
      // Simple approximation: 8px per character
      return (this.textContent?.length ?? 0) * 8;
    };
  }

  document.body.removeChild(svg);
});

function createTextShape(
  fontFamily: string,
  fontFamilyEastAsian?: string,
  fontFamilyComplexScript?: string,
): SpShape {
  return {
    type: "sp",
    nonVisual: { id: "1", name: "TextBox 1", textBox: true },
    properties: {
      transform: {
        x: px(10),
        y: px(10),
        width: px(100),
        height: px(50),
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
      geometry: { type: "preset", preset: "rect", adjustValues: [] },
      fill: { type: "noFill" },
    },
    textBody: {
      bodyProperties: {
        wrapping: "none",
        anchor: "top",
        anchorCenter: false,
        insets: { left: px(0), top: px(0), right: px(0), bottom: px(0) },
      },
      paragraphs: [
        {
          properties: { alignment: "left" },
          runs: [
            {
              type: "text",
              text: "テスト",
              properties: {
                fontSize: pt(12),
                fontFamily,
                ...(fontFamilyEastAsian && { fontFamilyEastAsian }),
                ...(fontFamilyComplexScript && { fontFamilyComplexScript }),
              },
            },
          ],
          endProperties: {},
        },
      ],
    },
  };
}

describe("font rendering in SVG output", () => {
  it("renders fontFamilyEastAsian in SVG font-family attribute", () => {
    const shape = createTextShape("Arial", "MS Gothic");
    const slide: Slide = { shapes: [shape] };

    const { container } = render(
      <SlideRendererSvg
        slide={slide}
        slideSize={{ width: px(200), height: px(200) }}
        colorContext={{ colorScheme: {}, colorMap: {} }}
        resources={{
          getTarget: () => undefined,
          getType: () => undefined,
          resolve: () => undefined,
          getMimeType: () => undefined,
          getFilePath: () => undefined,
          readFile: () => null,
        }}
      />
    );

    // Find text elements
    const textElements = container.querySelectorAll("text, tspan");
    expect(textElements.length).toBeGreaterThan(0);

    // Check font-family contains MS Gothic
    let foundMSGothic = false;
    textElements.forEach((el) => {
      const fontFamily = el.getAttribute("font-family");
      if (fontFamily?.includes("MS Gothic")) {
        foundMSGothic = true;
      }
    });

    expect(foundMSGothic).toBe(true);
  });

  it("renders fontFamilyComplexScript in SVG font-family attribute", () => {
    const shape = createTextShape("Arial", undefined, "Arabic Typesetting");
    const slide: Slide = { shapes: [shape] };

    const { container } = render(
      <SlideRendererSvg
        slide={slide}
        slideSize={{ width: px(200), height: px(200) }}
        colorContext={{ colorScheme: {}, colorMap: {} }}
        resources={{
          getTarget: () => undefined,
          getType: () => undefined,
          resolve: () => undefined,
          getMimeType: () => undefined,
          getFilePath: () => undefined,
          readFile: () => null,
        }}
      />
    );

    const textElements = container.querySelectorAll("text, tspan");
    expect(textElements.length).toBeGreaterThan(0);

    let foundArabic = false;
    textElements.forEach((el) => {
      const fontFamily = el.getAttribute("font-family");
      if (fontFamily?.includes("Arabic Typesetting")) {
        foundArabic = true;
      }
    });

    expect(foundArabic).toBe(true);
  });

  it("renders only fontFamily when no East Asian or Complex Script font specified", () => {
    const shape = createTextShape("Helvetica");
    const slide: Slide = { shapes: [shape] };

    const { container } = render(
      <SlideRendererSvg
        slide={slide}
        slideSize={{ width: px(200), height: px(200) }}
        colorContext={{ colorScheme: {}, colorMap: {} }}
        resources={{
          getTarget: () => undefined,
          getType: () => undefined,
          resolve: () => undefined,
          getMimeType: () => undefined,
          getFilePath: () => undefined,
          readFile: () => null,
        }}
      />
    );

    const textElements = container.querySelectorAll("text, tspan");
    expect(textElements.length).toBeGreaterThan(0);

    let foundHelvetica = false;
    textElements.forEach((el) => {
      const fontFamily = el.getAttribute("font-family");
      if (fontFamily === "Helvetica") {
        foundHelvetica = true;
      }
    });

    expect(foundHelvetica).toBe(true);
  });
});

// Full PDF → SVG flow test
describe("PDF to SVG font rendering", () => {

  it("PDF with cidOrdering Japan1 renders correct font-family in SVG", () => {
    const pdfText = {
      type: "text" as const,
      text: "日本語テスト",
      x: 10,
      y: 80,
      width: 60,
      height: 12,
      fontName: "MSGothic",
      fontSize: 12,
      graphicsState: createDefaultGraphicsState(),
      cidOrdering: "Japan1" as const,
    };

    const context = {
      pdfWidth: 100,
      pdfHeight: 100,
      slideWidth: px(200),
      slideHeight: px(200),
    };

    // PDF → SpShape
    const shape = convertTextToShape(pdfText, context, "1");
    const slide: Slide = { shapes: [shape] };

    // SpShape → SVG
    const { container } = render(
      <SlideRendererSvg
        slide={slide}
        slideSize={{ width: px(200), height: px(200) }}
        colorContext={{ colorScheme: {}, colorMap: {} }}
        resources={{
          getTarget: () => undefined,
          getType: () => undefined,
          resolve: () => undefined,
          getMimeType: () => undefined,
          getFilePath: () => undefined,
          readFile: () => null,
        }}
      />
    );

    // Verify SVG output
    const textElements = container.querySelectorAll("text, tspan");
    expect(textElements.length).toBeGreaterThan(0);

    let foundMSGothic = false;
    textElements.forEach((el) => {
      const fontFamily = el.getAttribute("font-family");
      console.log("PDF→SVG font-family:", fontFamily);
      if (fontFamily?.includes("MS Gothic")) {
        foundMSGothic = true;
      }
    });

    expect(foundMSGothic).toBe(true);
  });

  it("PDF with Chinese font renders correct font-family in SVG", () => {
    const pdfText = {
      type: "text" as const,
      text: "中文测试",
      x: 10,
      y: 80,
      width: 60,
      height: 12,
      fontName: "SimSun",
      fontSize: 12,
      graphicsState: createDefaultGraphicsState(),
      cidOrdering: "GB1" as const,
    };

    const context = {
      pdfWidth: 100,
      pdfHeight: 100,
      slideWidth: px(200),
      slideHeight: px(200),
    };

    const shape = convertTextToShape(pdfText, context, "1");
    const slide: Slide = { shapes: [shape] };

    const { container } = render(
      <SlideRendererSvg
        slide={slide}
        slideSize={{ width: px(200), height: px(200) }}
        colorContext={{ colorScheme: {}, colorMap: {} }}
        resources={{
          getTarget: () => undefined,
          getType: () => undefined,
          resolve: () => undefined,
          getMimeType: () => undefined,
          getFilePath: () => undefined,
          readFile: () => null,
        }}
      />
    );

    const textElements = container.querySelectorAll("text, tspan");
    let foundSimSun = false;
    textElements.forEach((el) => {
      const fontFamily = el.getAttribute("font-family");
      console.log("Chinese PDF→SVG font-family:", fontFamily);
      if (fontFamily?.includes("SimSun")) {
        foundSimSun = true;
      }
    });

    expect(foundSimSun).toBe(true);
  });
});
