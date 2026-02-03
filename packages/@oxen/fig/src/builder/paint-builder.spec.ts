/**
 * @file Paint builder unit tests
 */

import {
  solidPaint,
  solidPaintHex,
  linearGradient,
  radialGradient,
  angularGradient,
  diamondGradient,
  imagePaint,
  stroke,
} from "./paint-builder";
import { PAINT_TYPE_VALUES, BLEND_MODE_VALUES, SCALE_MODE_VALUES } from "../constants";

describe("SolidPaintBuilder", () => {
  it("creates solid paint with Color object", () => {
    const result = solidPaint({ r: 1, g: 0, b: 0, a: 1 }).build();

    expect(result.type).toEqual({ value: PAINT_TYPE_VALUES.SOLID, name: "SOLID" });
    expect(result.color).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    expect(result.opacity).toBe(1);
    expect(result.visible).toBe(true);
    expect(result.blendMode).toEqual({ value: BLEND_MODE_VALUES.NORMAL, name: "NORMAL" });
  });

  it("creates solid paint with alpha", () => {
    const result = solidPaint({ r: 0, g: 1, b: 0, a: 0.5 }).build();

    expect(result.color).toEqual({ r: 0, g: 1, b: 0, a: 0.5 });
  });

  it("sets opacity", () => {
    const result = solidPaint({ r: 0, g: 0, b: 1, a: 1 }).opacity(0.7).build();

    expect(result.opacity).toBe(0.7);
  });

  it("sets visibility", () => {
    const result = solidPaint({ r: 0, g: 0, b: 0, a: 1 }).visible(false).build();

    expect(result.visible).toBe(false);
  });

  it("sets blend mode", () => {
    const result = solidPaint({ r: 1, g: 1, b: 1, a: 1 }).blendMode("MULTIPLY").build();

    expect(result.blendMode).toEqual({ value: BLEND_MODE_VALUES.MULTIPLY, name: "MULTIPLY" });
  });

  it("clamps opacity to 0-1 range", () => {
    expect(solidPaint({ r: 0, g: 0, b: 0, a: 1 }).opacity(-0.5).build().opacity).toBe(0);
    expect(solidPaint({ r: 0, g: 0, b: 0, a: 1 }).opacity(1.5).build().opacity).toBe(1);
  });
});

describe("solidPaintHex", () => {
  it("parses hex color with hash", () => {
    const result = solidPaintHex("#ff0000").build();

    expect(result.color).toEqual({ r: 1, g: 0, b: 0, a: 1 });
  });

  it("parses hex color without hash", () => {
    const result = solidPaintHex("00ff00").build();

    expect(result.color).toEqual({ r: 0, g: 1, b: 0, a: 1 });
  });

  it("handles invalid hex gracefully", () => {
    const result = solidPaintHex("invalid").build();

    expect(result.color).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });
});

describe("LinearGradientBuilder", () => {
  it("creates linear gradient with defaults", () => {
    const result = linearGradient().build();

    expect(result.type).toEqual({ value: PAINT_TYPE_VALUES.GRADIENT_LINEAR, name: "GRADIENT_LINEAR" });
    expect(result.gradientStops).toHaveLength(2);
    expect(result.gradientHandlePositions).toHaveLength(2);
  });

  it("sets gradient angle", () => {
    const result = linearGradient().angle(90).build();

    // 90 degrees = top to bottom
    expect(result.gradientHandlePositions![0].x).toBeCloseTo(0.5);
    expect(result.gradientHandlePositions![0].y).toBeCloseTo(0);
    expect(result.gradientHandlePositions![1].x).toBeCloseTo(0.5);
    expect(result.gradientHandlePositions![1].y).toBeCloseTo(1);
  });

  it("sets custom stops", () => {
    const result = linearGradient()
      .stops([
        { color: { r: 1, g: 0, b: 0, a: 1 }, position: 0 },
        { color: { r: 0, g: 1, b: 0, a: 1 }, position: 0.5 },
        { color: { r: 0, g: 0, b: 1, a: 1 }, position: 1 },
      ])
      .build();

    expect(result.gradientStops).toHaveLength(3);
    expect(result.gradientStops[1].position).toBe(0.5);
  });

  it("adds stops and sorts by position", () => {
    const result = linearGradient()
      .addStop({ color: { r: 1, g: 0, b: 0, a: 1 }, position: 0 })
      .addStop({ color: { r: 0, g: 0, b: 1, a: 1 }, position: 1 })
      .addStop({ color: { r: 0, g: 1, b: 0, a: 1 }, position: 0.5 })
      .build();

    expect(result.gradientStops).toHaveLength(5); // 2 defaults + 3 added
    expect(result.gradientStops[2].position).toBe(0.5);
  });

  it("sets custom direction", () => {
    const result = linearGradient().direction({ startX: 0, startY: 0, endX: 1, endY: 1 }).build();

    expect(result.gradientHandlePositions![0]).toEqual({ x: 0, y: 0 });
    expect(result.gradientHandlePositions![1]).toEqual({ x: 1, y: 1 });
  });
});

describe("RadialGradientBuilder", () => {
  it("creates radial gradient with defaults", () => {
    const result = radialGradient().build();

    expect(result.type).toEqual({ value: PAINT_TYPE_VALUES.GRADIENT_RADIAL, name: "GRADIENT_RADIAL" });
    expect(result.gradientStops).toHaveLength(2);
    expect(result.gradientHandlePositions).toHaveLength(3);
  });

  it("sets center position", () => {
    const result = radialGradient().center(0.25, 0.75).build();

    expect(result.gradientHandlePositions![0]).toEqual({ x: 0.25, y: 0.75 });
  });

  it("sets uniform radius", () => {
    const result = radialGradient().center(0.5, 0.5).radius(0.3).build();

    expect(result.gradientHandlePositions![1].x).toBeCloseTo(0.8);
    expect(result.gradientHandlePositions![2].y).toBeCloseTo(0.8);
  });

  it("sets elliptical radius", () => {
    const result = radialGradient().center(0.5, 0.5).ellipticalRadius(0.4, 0.2).build();

    expect(result.gradientHandlePositions![1].x).toBeCloseTo(0.9);
    expect(result.gradientHandlePositions![2].y).toBeCloseTo(0.7);
  });
});

describe("AngularGradientBuilder", () => {
  it("creates angular gradient with rainbow defaults", () => {
    const result = angularGradient().build();

    expect(result.type).toEqual({ value: PAINT_TYPE_VALUES.GRADIENT_ANGULAR, name: "GRADIENT_ANGULAR" });
    expect(result.gradientStops.length).toBeGreaterThan(2);
  });

  it("sets center position", () => {
    const result = angularGradient().center(0.3, 0.7).build();

    expect(result.gradientHandlePositions![0]).toEqual({ x: 0.3, y: 0.7 });
  });

  it("sets rotation", () => {
    const result = angularGradient().rotation(45).build();

    const rad = (45 * Math.PI) / 180;
    expect(result.gradientHandlePositions![1].x).toBeCloseTo(0.5 + Math.cos(rad) * 0.5);
  });
});

describe("DiamondGradientBuilder", () => {
  it("creates diamond gradient with defaults", () => {
    const result = diamondGradient().build();

    expect(result.type).toEqual({ value: PAINT_TYPE_VALUES.GRADIENT_DIAMOND, name: "GRADIENT_DIAMOND" });
    expect(result.gradientStops).toHaveLength(2);
    expect(result.gradientHandlePositions).toHaveLength(3);
  });

  it("sets center and size", () => {
    const result = diamondGradient().center(0.5, 0.5).size(0.3).build();

    expect(result.gradientHandlePositions![0]).toEqual({ x: 0.5, y: 0.5 });
    expect(result.gradientHandlePositions![1]).toEqual({ x: 0.8, y: 0.5 });
    expect(result.gradientHandlePositions![2]).toEqual({ x: 0.5, y: 0.8 });
  });
});

describe("ImagePaintBuilder", () => {
  it("creates image paint with reference", () => {
    const result = imagePaint("image-ref-123").build();

    expect(result.type).toEqual({ value: PAINT_TYPE_VALUES.IMAGE, name: "IMAGE" });
    expect(result.imageRef).toBe("image-ref-123");
    expect(result.scaleMode).toEqual({ value: SCALE_MODE_VALUES.FILL, name: "FILL" });
  });

  it("sets scale mode", () => {
    const result = imagePaint("ref").scaleMode("FIT").build();

    expect(result.scaleMode).toEqual({ value: SCALE_MODE_VALUES.FIT, name: "FIT" });
  });

  it("sets scale mode to TILE", () => {
    const result = imagePaint("ref").scaleMode("TILE").build();

    expect(result.scaleMode).toEqual({ value: SCALE_MODE_VALUES.TILE, name: "TILE" });
  });

  it("sets rotation", () => {
    const result = imagePaint("ref").rotation(45).build();

    expect(result.rotation).toBe(45);
  });

  it("sets scale factor", () => {
    const result = imagePaint("ref").scale(2).build();

    expect(result.scalingFactor).toBe(2);
  });

  it("sets filters", () => {
    const result = imagePaint("ref")
      .filters({
        exposure: 0.5,
        contrast: 0.2,
        saturation: -0.3,
      })
      .build();

    expect(result.filters?.exposure).toBe(0.5);
    expect(result.filters?.contrast).toBe(0.2);
    expect(result.filters?.saturation).toBe(-0.3);
  });

  it("omits default rotation and scale", () => {
    const result = imagePaint("ref").build();

    expect(result.rotation).toBeUndefined();
    expect(result.scalingFactor).toBeUndefined();
  });
});

describe("StrokeBuilder", () => {
  it("creates stroke with defaults", () => {
    const result = stroke().build();

    expect(result.weight).toBe(1);
    expect(result.paints).toHaveLength(1);
    expect(result.paints[0].type).toEqual({ value: PAINT_TYPE_VALUES.SOLID, name: "SOLID" });
  });

  it("creates stroke with color", () => {
    const result = stroke({ r: 1, g: 0, b: 0, a: 1 }).build();

    expect(result.paints[0].color).toEqual({ r: 1, g: 0, b: 0, a: 1 });
  });

  it("sets weight", () => {
    const result = stroke().weight(3).build();

    expect(result.weight).toBe(3);
  });

  it("sets cap style", () => {
    const result = stroke().cap("ROUND").build();

    expect(result.cap).toEqual({ value: 1, name: "ROUND" });
  });

  it("sets join style", () => {
    const result = stroke().join("BEVEL").build();

    expect(result.join).toEqual({ value: 1, name: "BEVEL" });
  });

  it("sets alignment", () => {
    const result = stroke().align("OUTSIDE").build();

    expect(result.align).toEqual({ value: 2, name: "OUTSIDE" });
  });

  it("sets dash pattern", () => {
    const result = stroke().dash([5, 3, 2, 3]).build();

    expect(result.dashPattern).toEqual([5, 3, 2, 3]);
  });

  it("sets miter limit", () => {
    const result = stroke().miterLimit(10).build();

    expect(result.miterLimit).toBe(10);
  });

  it("omits default miter limit", () => {
    const result = stroke().build();

    expect(result.miterLimit).toBeUndefined();
  });

  it("sets stroke opacity", () => {
    const result = stroke().opacity(0.5).build();

    expect(result.paints[0].opacity).toBe(0.5);
  });

  it("sets stroke blend mode", () => {
    const result = stroke().blendMode("SCREEN").build();

    expect(result.paints[0].blendMode).toEqual({ value: BLEND_MODE_VALUES.SCREEN, name: "SCREEN" });
  });
});

describe("Paint builder chaining", () => {
  it("chains multiple methods on linear gradient", () => {
    const result = linearGradient()
      .angle(45)
      .addStop({ color: { r: 1, g: 0, b: 0, a: 1 }, position: 0 })
      .addStop({ color: { r: 0, g: 0, b: 1, a: 1 }, position: 1 })
      .opacity(0.8)
      .blendMode("OVERLAY")
      .build();

    expect(result.opacity).toBe(0.8);
    expect(result.blendMode.name).toBe("OVERLAY");
    expect(result.gradientStops.length).toBe(4);
  });

  it("chains multiple methods on stroke", () => {
    const result = stroke({ r: 0, g: 0, b: 0, a: 1 })
      .weight(2)
      .cap("SQUARE")
      .join("ROUND")
      .align("INSIDE")
      .dash([4, 2])
      .build();

    expect(result.weight).toBe(2);
    expect(result.cap?.name).toBe("SQUARE");
    expect(result.join?.name).toBe("ROUND");
    expect(result.align?.name).toBe("INSIDE");
    expect(result.dashPattern).toEqual([4, 2]);
  });
});
