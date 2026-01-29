/**
 * @file Tests for PDF→PPTX coordinate transforms
 */

import { px } from "@oxen-office/ooxml/domain/units";
import type { ConversionContext } from "./transform-converter";
import { convertBBox, convertMatrix, convertPoint, convertSize, createFitContext } from "./transform-converter";

function createConsoleWarnSpy(): Readonly<{
  readonly calls: readonly ReadonlyArray<unknown>[];
  readonly restore: () => void;
}> {
  const calls: ReadonlyArray<unknown>[] = [];
  const original = console.warn;

  console.warn = (...args: unknown[]) => {
    calls.push(args);
  };

  const restore = (): void => {
    console.warn = original;
  };

  return { calls, restore };
}

describe("convertPoint", () => {
  it("flips Y-axis (PDF bottom-left → PPTX top-left)", () => {
    const context = createFitContext(100, 1000, px(100), px(500), "stretch");

    expect(convertPoint({ x: 0, y: 0 }, context)).toEqual({ x: px(0), y: px(500) });
    expect(convertPoint({ x: 0, y: 1000 }, context)).toEqual({ x: px(0), y: px(0) });
    expect(convertPoint({ x: 0, y: 250 }, context)).toEqual({ x: px(0), y: px(375) });
  });

  it("scales X/Y based on page and slide sizes", () => {
    const context = createFitContext(200, 400, px(400), px(800), "stretch");

    expect(convertPoint({ x: 50, y: 100 }, context)).toEqual({ x: px(100), y: px(600) });
  });
});

describe("convertSize", () => {
  it("scales width/height without flipping Y-axis", () => {
    const context = createFitContext(200, 400, px(400), px(800), "stretch");

    expect(convertSize(10, 20, context)).toEqual({ width: px(20), height: px(40) });
  });
});

describe("convertBBox", () => {
  it("converts a PDF bbox into PPTX bounds with normalization", () => {
    const context = createFitContext(200, 400, px(200), px(400), "stretch");

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
    expect(context.offsetX).toBe(px(0));
    expect(context.offsetY).toBe(px(75));
  });

  it("cover: expands by width when PDF is wider than slide", () => {
    const context = createFitContext(200, 100, px(300), px(300), "cover");
    expect(context.slideWidth).toBe(px(600));
    expect(context.slideHeight).toBe(px(300));
    expect(context.offsetX).toBe(px(-150));
    expect(context.offsetY).toBe(px(0));
  });

  it("stretch: keeps given slide dimensions", () => {
    const context = createFitContext(200, 100, px(300), px(300), "stretch");
    expect(context.slideWidth).toBe(px(300));
    expect(context.slideHeight).toBe(px(300));
    expect(context.offsetX).toBe(px(0));
    expect(context.offsetY).toBe(px(0));
  });

  it("throws for invalid PDF size", () => {
    expect(() => createFitContext(0, 100, px(300), px(300), "contain")).toThrow("Invalid pdfWidth");
    expect(() => createFitContext(100, 0, px(300), px(300), "contain")).toThrow("Invalid pdfHeight");
  });

  it("throws for invalid slide size", () => {
    expect(() => createFitContext(100, 100, px(0), px(300), "contain")).toThrow("Invalid slideWidth");
    expect(() => createFitContext(100, 100, px(300), px(0), "contain")).toThrow("Invalid slideHeight");
  });
});

describe("conversion guards", () => {
  it("throws for invalid context dimensions", () => {
    expect(() =>
      convertPoint(
        { x: 0, y: 0 },
        {
          ...createFitContext(1, 1, px(1), px(1), "stretch"),
          pdfWidth: 0,
        },
      )
    ).toThrow("Invalid pdfWidth");

    expect(() =>
      convertPoint(
        { x: 0, y: 0 },
        {
          ...createFitContext(1, 1, px(1), px(1), "stretch"),
          pdfHeight: 0,
        },
      )
    ).toThrow("Invalid pdfHeight");

    expect(() =>
      convertPoint(
        { x: 0, y: 0 },
        {
          ...createFitContext(100, 100, px(100), px(100), "stretch"),
          scaleX: 0,
        },
      )
    ).toThrow("Invalid scaleX");

    expect(() =>
      convertPoint(
        { x: 0, y: 0 },
        {
          ...createFitContext(100, 100, px(100), px(100), "stretch"),
          scaleY: 0,
        },
      )
    ).toThrow("Invalid scaleY");
  });
});

describe("convertMatrix", () => {
  const context = createFitContext(800, 600, px(800), px(600), "stretch");

  type Point = { readonly x: number; readonly y: number };

  function getExpectedCorners(
    ctm: readonly [number, number, number, number, number, number],
    conversionContext: ConversionContext,
  ): { readonly tl: Point; readonly tr: Point; readonly bl: Point; readonly br: Point } {
    const [a, b, c, d, e, f] = ctm;
    const pdfTl = { x: c + e, y: d + f };
    const pdfTr = { x: a + c + e, y: b + d + f };
    const pdfBl = { x: e, y: f };
    const pdfBr = { x: a + e, y: b + f };

    const tl = convertPoint(pdfTl, conversionContext);
    const tr = convertPoint(pdfTr, conversionContext);
    const bl = convertPoint(pdfBl, conversionContext);
    const br = convertPoint(pdfBr, conversionContext);

    return {
      tl: { x: tl.x as number, y: tl.y as number },
      tr: { x: tr.x as number, y: tr.y as number },
      bl: { x: bl.x as number, y: bl.y as number },
      br: { x: br.x as number, y: br.y as number },
    };
  }

  function applyTransformToCorner(
    transform: ReturnType<typeof convertMatrix>,
    corner: "tl" | "tr" | "bl" | "br",
  ): Point {
    const x = transform.x as number;
    const y = transform.y as number;
    const width = transform.width as number;
    const height = transform.height as number;
    const rotationRad = ((transform.rotation as number) * Math.PI) / 180;

    const cx = x + width / 2;
    const cy = y + height / 2;

    const local = getLocalCornerPoint(corner, width, height);

    const flipped = {
      x: transform.flipH ? -local.x : local.x,
      y: transform.flipV ? -local.y : local.y,
    };

    // Clockwise rotation in a y-down coordinate system.
    const sin = Math.sin(rotationRad);
    const cos = Math.cos(rotationRad);
    const rotated = {
      x: flipped.x * cos - flipped.y * sin,
      y: flipped.x * sin + flipped.y * cos,
    };

    return { x: cx + rotated.x, y: cy + rotated.y };
  }

  function getLocalCornerPoint(corner: "tl" | "tr" | "bl" | "br", width: number, height: number): Point {
    if (corner === "tl") {
      return { x: -width / 2, y: -height / 2 };
    }
    if (corner === "tr") {
      return { x: width / 2, y: -height / 2 };
    }
    if (corner === "bl") {
      return { x: -width / 2, y: height / 2 };
    }
    return { x: width / 2, y: height / 2 };
  }

  function expectPointClose(actual: Point, expected: Point): void {
    expect(actual.x).toBeCloseTo(expected.x, 6);
    expect(actual.y).toBeCloseTo(expected.y, 6);
  }

  function expectTransformMatchesCorners(
    transform: ReturnType<typeof convertMatrix>,
    corners: { readonly tl: Point; readonly tr: Point; readonly bl: Point; readonly br: Point },
  ): void {
    expectPointClose(applyTransformToCorner(transform, "tl"), corners.tl);
    expectPointClose(applyTransformToCorner(transform, "tr"), corners.tr);
    expectPointClose(applyTransformToCorner(transform, "bl"), corners.bl);
    expectPointClose(applyTransformToCorner(transform, "br"), corners.br);
  }

  it("supports simple scale transform (a>0, d>0, b=c=0)", () => {
    const ctm = [200, 0, 0, 150, 100, 200] as const;
    const expected = getExpectedCorners(ctm, context);
    const result = convertMatrix(ctm, context);

    expect(result.flipH).toBe(false);
    expect(result.flipV).toBe(false);
    expect(result.rotation as number).toBe(0);
    expect(result.x).toBe(px(100));
    expect(result.y).toBe(px(250));
    expect(result.width).toBe(px(200));
    expect(result.height).toBe(px(150));
    expectTransformMatchesCorners(result, expected);
  });

  it("supports horizontal flip (a<0)", () => {
    const ctm = [-200, 0, 0, 150, 300, 200] as const;
    const expected = getExpectedCorners(ctm, context);
    const result = convertMatrix(ctm, context);

    expect(result.flipH).toBe(true);
    expect(result.flipV).toBe(false);
    expect(Math.abs(result.rotation as number)).toBeCloseTo(0, 6);
    expectTransformMatchesCorners(result, expected);
  });

  it("supports vertical flip (d<0)", () => {
    const ctm = [200, 0, 0, -150, 100, 350] as const;
    const expected = getExpectedCorners(ctm, context);
    const result = convertMatrix(ctm, context);

    expect(result.flipH).toBe(false);
    expect(result.flipV).toBe(true);
    expect(Math.abs(result.rotation as number)).toBeCloseTo(0, 6);
    expectTransformMatchesCorners(result, expected);
  });

  it("supports 90° rotation (a=0, b=1, c=-1, d=0) with scaling", () => {
    const ctm = [0, 200, -150, 0, 300, 100] as const;
    const expected = getExpectedCorners(ctm, context);
    const result = convertMatrix(ctm, context);

    expect(result.flipH).toBe(false);
    expect(result.flipV).toBe(false);
    expect(Math.abs(Math.abs(result.rotation as number) - 90)).toBeLessThan(1e-6);
    expectTransformMatchesCorners(result, expected);
  });

  it("supports 180° rotation", () => {
    const ctm = [-200, 0, 0, -150, 300, 350] as const;
    const expected = getExpectedCorners(ctm, context);
    const result = convertMatrix(ctm, context);

    expect(result.flipH).toBe(false);
    expect(result.flipV).toBe(false);
    expect(Math.abs(Math.abs(result.rotation as number) - 180)).toBeLessThan(1e-6);
    expectTransformMatchesCorners(result, expected);
  });

  it("supports 45° rotation", () => {
    const angle = Math.PI / 4;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const width = 200;
    const height = 100;
    const ctm = [width * cos, width * sin, -height * sin, height * cos, 250, 150] as const;

    const expected = getExpectedCorners(ctm, context);
    const result = convertMatrix(ctm, context);

    expect(result.flipH).toBe(false);
    expect(result.flipV).toBe(false);
    expect(Math.abs(Math.abs(result.rotation as number) - 45)).toBeLessThan(1e-6);
    expectTransformMatchesCorners(result, expected);
  });

  it("warns and falls back for shear transforms", () => {
    const warnSpy = createConsoleWarnSpy();

    const ctm = [200, 0, 50, 150, 100, 200] as const;
    const expected = getExpectedCorners(ctm, context);
    const result = convertMatrix(ctm, context);

    expect(warnSpy.calls.length).toBeGreaterThan(0);

    const xs = [expected.tl.x, expected.tr.x, expected.bl.x, expected.br.x];
    const ys = [expected.tl.y, expected.tr.y, expected.bl.y, expected.br.y];
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    expect(result.rotation as number).toBe(0);
    expect(result.flipH).toBe(false);
    expect(result.flipV).toBe(false);
    expect(result.x as number).toBeCloseTo(minX, 6);
    expect(result.y as number).toBeCloseTo(minY, 6);
    expect(result.width as number).toBeCloseTo(maxX - minX, 6);
    expect(result.height as number).toBeCloseTo(maxY - minY, 6);

    warnSpy.restore();
  });

  it("supports composite transform (rotation + non-uniform scale) when representable", () => {
    const angle = (30 * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const width = 240;
    const height = 120;
    const ctm = [width * cos, width * sin, -height * sin, height * cos, 200, 100] as const;

    const expected = getExpectedCorners(ctm, context);
    const result = convertMatrix(ctm, context);

    expect(result.flipH).toBe(false);
    expect(result.flipV).toBe(false);
    expect(Math.abs(Math.abs(result.rotation as number) - 30)).toBeLessThan(1e-6);
    expectTransformMatchesCorners(result, expected);
  });

  it("falls back when slide scaling introduces shear (scaleX ≠ scaleY with rotation)", () => {
    const warnSpy = createConsoleWarnSpy();

    const scaledContext = createFitContext(400, 300, px(800), px(450), "stretch");

    const ctm = [100, 100, -50, 50, 100, 100] as const;
    const expected = getExpectedCorners(ctm, scaledContext);
    const result = convertMatrix(ctm, scaledContext);

    expect(warnSpy.calls.length).toBeGreaterThan(0);

    const xs = [expected.tl.x, expected.tr.x, expected.bl.x, expected.br.x];
    const ys = [expected.tl.y, expected.tr.y, expected.bl.y, expected.br.y];
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    expect(result.rotation as number).toBe(0);
    expect(result.x as number).toBeCloseTo(minX, 6);
    expect(result.y as number).toBeCloseTo(minY, 6);
    expect(result.width as number).toBeCloseTo(maxX - minX, 6);
    expect(result.height as number).toBeCloseTo(maxY - minY, 6);

    warnSpy.restore();
  });
});
