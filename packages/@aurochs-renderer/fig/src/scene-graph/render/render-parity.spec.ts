/**
 * @file Render module parity tests
 *
 * Verifies that scene-graph/render/ functions are the SINGLE source of truth
 * for SceneGraph → SVG attribute conversion. Both SVG string and React
 * renderers consume these functions exclusively.
 *
 * These tests validate:
 * 1. Exhaustive handling of all Fill types
 * 2. Exhaustive handling of all Effect types
 * 3. Consistent output format for both consumers
 * 4. New types added to SceneGraph unions cause compile errors if unhandled
 */

import type {
  Fill,
  SolidFill,
  LinearGradientFill,
  RadialGradientFill,
  ImageFill,
  Effect,
  Stroke,
  Color,
  AffineMatrix,
  PathContour,
} from "../types";
import {
  resolveFill,
  resolveTopFill,
  resolveStroke,
  resolveEffects,
  colorToHex,
  matrixToSvgTransform,
  contourToSvgD,
  type IdGenerator,
} from "./index";

// =============================================================================
// Test Helpers
// =============================================================================

function createIdGenerator(): IdGenerator {
  // eslint-disable-next-line no-restricted-syntax -- mutable closure counter for sequential ID generation
  let counter = 0;
  return {
    getNextId(prefix: string): string {
      return `${prefix}-${counter++}`;
    },
  };
}

const WHITE: Color = { r: 1, g: 1, b: 1, a: 1 };
const RED: Color = { r: 1, g: 0, b: 0, a: 1 };
const BLACK_50: Color = { r: 0, g: 0, b: 0, a: 0.5 };

// =============================================================================
// Fill Resolution Tests
// =============================================================================

describe("Fill resolution (shared SoT)", () => {
  it("handles solid fill", () => {
    const fill: SolidFill = { type: "solid", color: RED, opacity: 1 };
    const ids = createIdGenerator();
    const result = resolveFill(fill, ids);

    expect(result.attrs.fill).toBe("#ff0000");
    expect(result.attrs.fillOpacity).toBeUndefined();
    expect(result.def).toBeUndefined();
  });

  it("handles solid fill with opacity", () => {
    const fill: SolidFill = { type: "solid", color: RED, opacity: 0.5 };
    const ids = createIdGenerator();
    const result = resolveFill(fill, ids);

    expect(result.attrs.fill).toBe("#ff0000");
    expect(result.attrs.fillOpacity).toBe(0.5);
  });

  it("handles linear gradient fill", () => {
    const fill: LinearGradientFill = {
      type: "linear-gradient",
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
      stops: [
        { position: 0, color: RED },
        { position: 1, color: WHITE },
      ],
      opacity: 1,
    };
    const ids = createIdGenerator();
    const result = resolveFill(fill, ids);

    expect(result.attrs.fill).toBe("url(#lg-0)");
    expect(result.def).toBeDefined();
    expect(result.def!.type).toBe("linear-gradient");
    if (result.def!.type === "linear-gradient") {
      expect(result.def!.x1).toBe("0%");
      expect(result.def!.y1).toBe("0%");
      expect(result.def!.x2).toBe("100%");
      expect(result.def!.y2).toBe("100%");
      expect(result.def!.stops).toHaveLength(2);
      expect(result.def!.stops[0].stopColor).toBe("#ff0000");
    }
  });

  it("handles radial gradient fill", () => {
    const fill: RadialGradientFill = {
      type: "radial-gradient",
      center: { x: 0.5, y: 0.5 },
      radius: 0.5,
      stops: [
        { position: 0, color: RED },
        { position: 1, color: WHITE },
      ],
      opacity: 1,
    };
    const ids = createIdGenerator();
    const result = resolveFill(fill, ids);

    expect(result.attrs.fill).toBe("url(#rg-0)");
    expect(result.def!.type).toBe("radial-gradient");
  });

  it("handles image fill", () => {
    const fill: ImageFill = {
      type: "image",
      imageRef: "test-ref",
      data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      mimeType: "image/png",
      scaleMode: "FILL",
      opacity: 1,
    };
    const ids = createIdGenerator();
    const result = resolveFill(fill, ids);

    expect(result.attrs.fill).toBe("url(#img-0)");
    expect(result.def!.type).toBe("image");
  });

  it("resolveTopFill returns fill=none for empty fills", () => {
    const ids = createIdGenerator();
    const result = resolveTopFill([], ids);

    expect(result.attrs.fill).toBe("none");
    expect(result.def).toBeUndefined();
  });

  it("resolveTopFill uses the last fill", () => {
    const fills: Fill[] = [
      { type: "solid", color: RED, opacity: 1 },
      { type: "solid", color: WHITE, opacity: 1 },
    ];
    const ids = createIdGenerator();
    const result = resolveTopFill(fills, ids);

    expect(result.attrs.fill).toBe("#ffffff");
  });

function buildFillForType(type: Fill["type"]): Fill {
  switch (type) {
    case "solid":
      return { type: "solid", color: RED, opacity: 1 };
    case "linear-gradient":
      return { type: "linear-gradient", start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, stops: [], opacity: 1 };
    case "radial-gradient":
      return { type: "radial-gradient", center: { x: 0.5, y: 0.5 }, radius: 0.5, stops: [], opacity: 1 };
    case "image":
      return { type: "image", imageRef: "", data: new Uint8Array(0), mimeType: "image/png", scaleMode: "FILL", opacity: 1 };
  }
}

function _buildEffectForType(type: Effect["type"]): Effect {
  switch (type) {
    case "drop-shadow":
      return { type: "drop-shadow", offset: { x: 0, y: 0 }, radius: 0, color: BLACK_50 };
    case "inner-shadow":
      return { type: "inner-shadow", offset: { x: 0, y: 0 }, radius: 0, color: BLACK_50 };
    case "layer-blur":
      return { type: "layer-blur", radius: 0 };
    case "background-blur":
      return { type: "background-blur", radius: 0 };
  }
}

  /**
   * COMPILE-TIME EXHAUSTIVENESS CHECK
   *
   * If a new Fill type is added to the Fill union in types.ts,
   * resolveFill() will fail to compile because the switch statement
   * won't cover the new variant (the `never` check catches it).
   *
   * This test documents that guarantee. It can't test the compile-time
   * behavior at runtime, but it verifies all current types are handled.
   */
  it("handles all Fill types (exhaustive)", () => {
    const allTypes: Fill["type"][] = ["solid", "linear-gradient", "radial-gradient", "image"];
    const ids = createIdGenerator();

    for (const type of allTypes) {
      const fill = buildFillForType(type);
      const result = resolveFill(fill, ids);
      expect(result.attrs.fill).toBeDefined();
    }
  });
});

// =============================================================================
// Stroke Resolution Tests
// =============================================================================

describe("Stroke resolution (shared SoT)", () => {
  it("resolves all stroke properties", () => {
    const stroke: Stroke = {
      color: RED,
      width: 2,
      opacity: 0.8,
      linecap: "round",
      linejoin: "bevel",
      dashPattern: [4, 2],
    };
    const result = resolveStroke(stroke);

    expect(result.stroke).toBe("#ff0000");
    expect(result.strokeWidth).toBe(2);
    expect(result.strokeOpacity).toBe(0.8);
    expect(result.strokeLinecap).toBe("round");
    expect(result.strokeLinejoin).toBe("bevel");
    expect(result.strokeDasharray).toBe("4 2");
  });

  it("omits default values", () => {
    const stroke: Stroke = {
      color: RED,
      width: 1,
      opacity: 1,
      linecap: "butt",
      linejoin: "miter",
    };
    const result = resolveStroke(stroke);

    expect(result.strokeOpacity).toBeUndefined();
    expect(result.strokeLinecap).toBeUndefined();
    expect(result.strokeLinejoin).toBeUndefined();
    expect(result.strokeDasharray).toBeUndefined();
  });
});

// =============================================================================
// Effects Resolution Tests
// =============================================================================

describe("Effects resolution (shared SoT)", () => {
  it("returns undefined for empty effects", () => {
    const ids = createIdGenerator();
    const result = resolveEffects([], ids);
    expect(result).toBeUndefined();
  });

  it("resolves drop shadow", () => {
    const effects: Effect[] = [{
      type: "drop-shadow",
      offset: { x: 2, y: 4 },
      radius: 8,
      color: BLACK_50,
    }];
    const ids = createIdGenerator();
    const result = resolveEffects(effects, ids);

    expect(result).toBeDefined();
    expect(result!.filterAttr).toBe("url(#filter-0)");
    expect(result!.primitives.length).toBeGreaterThan(0);
    // Should have feFlood, feColorMatrix, feOffset, feGaussianBlur, feColorMatrix, feBlend, feBlend
    expect(result!.primitives).toHaveLength(7);
  });

  it("resolves inner shadow", () => {
    const effects: Effect[] = [{
      type: "inner-shadow",
      offset: { x: 0, y: 2 },
      radius: 4,
      color: BLACK_50,
    }];
    const ids = createIdGenerator();
    const result = resolveEffects(effects, ids);

    expect(result).toBeDefined();
    // Should have shape setup (2) + inner shadow primitives (6) = 8
    expect(result!.primitives).toHaveLength(8);
  });

  it("resolves layer blur", () => {
    const effects: Effect[] = [{
      type: "layer-blur",
      radius: 10,
    }];
    const ids = createIdGenerator();
    const result = resolveEffects(effects, ids);

    expect(result).toBeDefined();
    expect(result!.primitives).toHaveLength(1);
    expect(result!.primitives[0].type).toBe("feGaussianBlur");
  });

  it("skips background blur (not supported in SVG)", () => {
    const effects: Effect[] = [{
      type: "background-blur",
      radius: 10,
    }];
    const ids = createIdGenerator();
    const result = resolveEffects(effects, ids);

    expect(result).toBeUndefined();
  });

  it("handles all Effect types (exhaustive)", () => {
    const allTypes: Effect["type"][] = ["drop-shadow", "inner-shadow", "layer-blur", "background-blur"];
    const ids = createIdGenerator();

    for (const type of allTypes) {
      const effect = buildEffectForType(type);
      // Should not throw
      resolveEffects([effect], ids);
    }
  });
});

// =============================================================================
// Color, Transform, Path Tests
// =============================================================================

describe("Color conversion (shared SoT)", () => {
  it("converts to hex correctly", () => {
    expect(colorToHex({ r: 1, g: 0, b: 0, a: 1 })).toBe("#ff0000");
    expect(colorToHex({ r: 0, g: 1, b: 0, a: 1 })).toBe("#00ff00");
    expect(colorToHex({ r: 0, g: 0, b: 1, a: 1 })).toBe("#0000ff");
    expect(colorToHex({ r: 0, g: 0, b: 0, a: 1 })).toBe("#000000");
    expect(colorToHex({ r: 1, g: 1, b: 1, a: 1 })).toBe("#ffffff");
  });
});

describe("Transform conversion (shared SoT)", () => {
  it("returns undefined for identity", () => {
    const identity: AffineMatrix = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };
    expect(matrixToSvgTransform(identity)).toBeUndefined();
  });

  it("formats non-identity matrix", () => {
    const m: AffineMatrix = { m00: 2, m01: 0, m02: 10, m10: 0, m11: 2, m12: 20 };
    expect(matrixToSvgTransform(m)).toBe("matrix(2,0,0,2,10,20)");
  });
});

describe("Path serialization (shared SoT)", () => {
  it("serializes path commands", () => {
    const contour: PathContour = {
      commands: [
        { type: "M", x: 0, y: 0 },
        { type: "L", x: 100, y: 0 },
        { type: "L", x: 100, y: 100 },
        { type: "Z" },
      ],
      windingRule: "nonzero",
    };
    expect(contourToSvgD(contour)).toBe("M0 0L100 0L100 100Z");
  });

  it("serializes cubic bezier", () => {
    const contour: PathContour = {
      commands: [
        { type: "M", x: 0, y: 0 },
        { type: "C", x1: 10, y1: 20, x2: 30, y2: 40, x: 50, y: 60 },
      ],
      windingRule: "nonzero",
    };
    expect(contourToSvgD(contour)).toBe("M0 0C10 20 30 40 50 60");
  });
});
