/**
 * @file src/pdf/importer/slide-builder.spec.ts
 */

import type { PdfPage, PdfText } from "@oxen/pdf/domain";
import { createDefaultGraphicsState } from "@oxen/pdf/domain";
import type { Slide } from "@oxen-office/pptx/domain/slide/types";
import { px } from "@oxen-office/ooxml/domain/units";
import { convertPageToShapes } from "../converter/pdf-to-shapes";
import {
  buildSlideFromPage,
  createPageNumberShape,
  createSlideWithId,
  createSlidesWithIds,
  determineSlideSize,
} from "./slide-builder";

const graphicsState = createDefaultGraphicsState();

const options = {
  slideWidth: px(100),
  slideHeight: px(100),
} as const;

function createTextPage(pageNumber: number, text: string): PdfPage {
  const elem: PdfText = {
    type: "text",
    text,
    x: 10,
    y: 10,
    width: 20,
    height: 5,
    fontName: "ArialMT",
    fontSize: 12,
    graphicsState,
  };

  return {
    pageNumber,
    width: 100,
    height: 100,
    elements: [elem] as const,
  };
}

describe("buildSlideFromPage", () => {
  it("converts PdfPage into Slide using convertPageToShapes", () => {
    const page = createTextPage(1, "Hello");
    const expected = convertPageToShapes(page, options);

    const slide = buildSlideFromPage(page, { ...options, setBackground: false });

    expect(slide.shapes).toEqual(expected);
    expect(slide.background).toBeUndefined();
  });

  it("applies background when setBackground is true", () => {
    const page = createTextPage(1, "Hello");

    const slide = buildSlideFromPage(page, {
      ...options,
      setBackground: true,
      backgroundColor: { r: 255, g: 0, b: 0 },
    });

    expect(slide.background).toEqual({
      fill: {
        type: "solidFill",
        color: { spec: { type: "srgb", value: "FF0000" } },
      },
    });
  });

  it("uses white background by default when enabled", () => {
    const page = createTextPage(1, "Hello");

    const slide = buildSlideFromPage(page, { ...options, setBackground: true });

    expect(slide.background).toEqual({
      fill: {
        type: "solidFill",
        color: { spec: { type: "srgb", value: "FFFFFF" } },
      },
    });
  });
});

describe("SlideWithId helpers", () => {
  it("creates SlideWithId from a Slide and SlideId", () => {
    const slide: Slide = { shapes: [] as const };

    const withId = createSlideWithId(slide, "10");
    expect(withId).toEqual({ id: "10", slide });
  });

  it("creates SlideWithId[] from multiple slides", () => {
    const s1: Slide = { shapes: [] as const };
    const s2: Slide = { shapes: [] as const };

    const withIds = createSlidesWithIds([s1, s2] as const, 3);
    expect(withIds.map((s) => s.id)).toEqual(["3", "4"]);
  });
});

describe("determineSlideSize", () => {
  it("converts PDF points to pixels when no preferred size given", () => {
    // PDF uses points (1pt = 96/72 px ≈ 1.333px)
    // 1600pt → 2133px, 900pt → 1200px
    expect(determineSlideSize(1600, 900)).toEqual({ width: px(2133), height: px(1200) });
    // 1024pt → 1365px, 768pt → 1024px
    expect(determineSlideSize(1024, 768)).toEqual({ width: px(1365), height: px(1024) });
  });

  it("returns preferred size when provided", () => {
    const preferred = { width: px(111), height: px(222) } as const;
    expect(determineSlideSize(100, 100, preferred)).toBe(preferred);
  });
});

describe("createPageNumberShape", () => {
  it("creates a text box shape for displaying page number", () => {
    const slideSize = { width: px(960), height: px(540) } as const;
    const shape = createPageNumberShape(2, slideSize, "pn-1");

    expect(shape.nonVisual.textBox).toBe(true);
    expect(shape.properties.fill).toEqual({ type: "noFill" });
    expect(shape.properties.transform).toMatchObject({
      x: px(960 - 50 - 10),
      y: px(540 - 30 - 10),
      width: px(50),
      height: px(30),
    });

    const run = shape.textBody?.paragraphs[0]?.runs[0];
    expect(run).toMatchObject({ type: "text", text: "2" });
  });
});

describe("multiple pages", () => {
  it("builds slides for each page and assigns IDs", () => {
    const p1 = createTextPage(1, "P1");
    const p2 = createTextPage(2, "P2");

    const slides = [buildSlideFromPage(p1, options), buildSlideFromPage(p2, options)] as const;
    const withIds = createSlidesWithIds(slides, 5);

    expect(withIds).toHaveLength(2);
    expect(withIds[0]?.id).toBe("5");
    expect(withIds[1]?.id).toBe("6");
  });
});

