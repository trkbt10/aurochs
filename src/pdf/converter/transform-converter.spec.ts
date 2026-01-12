/**
 * @file Tests for PDF→PPTX coordinate transforms
 */

import { px } from "../../ooxml/domain/units";
import { convertBBox, convertPoint, convertSize, createFitContext } from "./transform-converter";

describe("convertPoint", () => {
  it("flips Y-axis (PDF bottom-left → PPTX top-left)", () => {
    const context = {
      pdfWidth: 100,
      pdfHeight: 1000,
      slideWidth: px(100),
      slideHeight: px(500),
    } as const;

    expect(convertPoint({ x: 0, y: 0 }, context)).toEqual({ x: px(0), y: px(500) });
    expect(convertPoint({ x: 0, y: 1000 }, context)).toEqual({ x: px(0), y: px(0) });
    expect(convertPoint({ x: 0, y: 250 }, context)).toEqual({ x: px(0), y: px(375) });
  });

  it("scales X/Y based on page and slide sizes", () => {
    const context = {
      pdfWidth: 200,
      pdfHeight: 400,
      slideWidth: px(400),
      slideHeight: px(800),
    } as const;

    expect(convertPoint({ x: 50, y: 100 }, context)).toEqual({ x: px(100), y: px(600) });
  });
});

describe("convertSize", () => {
  it("scales width/height without flipping Y-axis", () => {
    const context = {
      pdfWidth: 200,
      pdfHeight: 400,
      slideWidth: px(400),
      slideHeight: px(800),
    } as const;

    expect(convertSize(10, 20, context)).toEqual({ width: px(20), height: px(40) });
  });
});

describe("convertBBox", () => {
  it("converts a PDF bbox into PPTX bounds with normalization", () => {
    const context = {
      pdfWidth: 200,
      pdfHeight: 400,
      slideWidth: px(200),
      slideHeight: px(400),
    } as const;

    expect(convertBBox([10, 20, 110, 220], context)).toEqual({
      x: px(10),
      y: px(180),
      width: px(100),
      height: px(200),
    });
  });
});

describe("createFitContext", () => {
  it("contain: fits by width when PDF is wider than slide", () => {
    const context = createFitContext(200, 100, px(300), px(300), "contain");
    expect(context.slideWidth).toBe(px(300));
    expect(context.slideHeight).toBe(px(150));
  });

  it("cover: expands by width when PDF is wider than slide", () => {
    const context = createFitContext(200, 100, px(300), px(300), "cover");
    expect(context.slideWidth).toBe(px(600));
    expect(context.slideHeight).toBe(px(300));
  });

  it("stretch: keeps given slide dimensions", () => {
    const context = createFitContext(200, 100, px(300), px(300), "stretch");
    expect(context.slideWidth).toBe(px(300));
    expect(context.slideHeight).toBe(px(300));
  });

  it("throws for invalid PDF size", () => {
    expect(() => createFitContext(0, 100, px(300), px(300), "contain")).toThrow("Invalid pdfWidth");
    expect(() => createFitContext(100, 0, px(300), px(300), "contain")).toThrow("Invalid pdfHeight");
  });
});

describe("conversion guards", () => {
  it("throws for invalid context dimensions", () => {
    expect(() =>
      convertPoint(
        { x: 0, y: 0 },
        { pdfWidth: 0, pdfHeight: 100, slideWidth: px(100), slideHeight: px(100) }
      )
    ).toThrow("Invalid pdfWidth");

    expect(() =>
      convertPoint(
        { x: 0, y: 0 },
        { pdfWidth: 100, pdfHeight: 0, slideWidth: px(100), slideHeight: px(100) }
      )
    ).toThrow("Invalid pdfHeight");

    expect(() =>
      convertPoint(
        { x: 0, y: 0 },
        { pdfWidth: 100, pdfHeight: 100, slideWidth: px(0), slideHeight: px(100) }
      )
    ).toThrow("Invalid slideWidth");

    expect(() =>
      convertPoint(
        { x: 0, y: 0 },
        { pdfWidth: 100, pdfHeight: 100, slideWidth: px(100), slideHeight: px(0) }
      )
    ).toThrow("Invalid slideHeight");
  });
});

describe("convertMatrix", () => {
  // Import convertMatrix for testing
  const { convertMatrix } = require("./transform-converter");

  const context = {
    pdfWidth: 800,
    pdfHeight: 600,
    slideWidth: px(800),
    slideHeight: px(600),
  } as const;

  it("positions image correctly with positive height (d > 0)", () => {
    // CTM = [width, 0, 0, height, x, y]
    // Image at (100, 200) with size 200x150
    // In PDF: bottom-left at (100, 200), top-left at (100, 350)
    // After Y-flip: top-left should be at (100, 600 - 350) = (100, 250)
    const result = convertMatrix([200, 0, 0, 150, 100, 200], context);

    expect(result.x).toBe(px(100));
    expect(result.y).toBe(px(250)); // 600 - (200 + 150)
    expect(result.width).toBe(px(200));
    expect(result.height).toBe(px(150));
    expect(result.flipV).toBe(false);
  });

  it("positions image correctly with negative height (d < 0, Y-flipped in PDF)", () => {
    // CTM = [width, 0, 0, -height, x, y]
    // Image at (100, 350) with size 200x150, flipped
    // In PDF: top at (100, 350), extends downward to (100, 200)
    // After Y-flip: top-left should be at (100, 600 - 350) = (100, 250)
    const result = convertMatrix([200, 0, 0, -150, 100, 350], context);

    expect(result.x).toBe(px(100));
    expect(result.y).toBe(px(250)); // 600 - 350
    expect(result.width).toBe(px(200));
    expect(result.height).toBe(px(150)); // Absolute value
    expect(result.flipV).toBe(true);
  });

  it("handles image at origin (0, 0)", () => {
    // Image at bottom-left corner of PDF page
    const result = convertMatrix([100, 0, 0, 100, 0, 0], context);

    expect(result.x).toBe(px(0));
    expect(result.y).toBe(px(500)); // 600 - 100
    expect(result.width).toBe(px(100));
    expect(result.height).toBe(px(100));
    expect(result.flipV).toBe(false);
  });

  it("handles image at top of page", () => {
    // Image at top-left corner of PDF page (y = pageHeight - imageHeight)
    const result = convertMatrix([100, 0, 0, 100, 0, 500], context);

    expect(result.x).toBe(px(0));
    expect(result.y).toBe(px(0)); // 600 - (500 + 100)
    expect(result.width).toBe(px(100));
    expect(result.height).toBe(px(100));
  });

  it("scales coordinates when slide and PDF sizes differ", () => {
    const scaledContext = {
      pdfWidth: 400,
      pdfHeight: 300,
      slideWidth: px(800),
      slideHeight: px(600),
    } as const;

    // Image at (50, 100) with size 100x80 in PDF (400x300)
    // In PDF: top-left at (50, 180)
    // After scale (2x): x=100, y_flipped = (300 - 180) * 2 = 240
    const result = convertMatrix([100, 0, 0, 80, 50, 100], scaledContext);

    expect(result.x).toBe(px(100)); // 50 * 2
    expect(result.y).toBe(px(240)); // (300 - 180) * 2
    expect(result.width).toBe(px(200)); // 100 * 2
    expect(result.height).toBe(px(160)); // 80 * 2
  });
});
