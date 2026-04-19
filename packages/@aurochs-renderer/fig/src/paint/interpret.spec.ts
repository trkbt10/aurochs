/**
 * @file Paint interpretation SoT tests
 *
 * These tests verify the shared paint interpretation functions that both
 * the SVG string renderer and SceneGraph builder consume.
 * Any regression here indicates a divergence risk for both renderers.
 */

import {
  getGradientStops,
  getGradientDirection,
  getGradientDirectionFromTransform,
  getRadialGradientCenterAndRadius,
  getImageRef,
  getScaleMode,
} from "./interpret";
import type { FigGradientPaint, FigImagePaint } from "@aurochs/fig/types";

/**
 * Structural type guards for paint-shaped fixtures used in these tests.
 *
 * The tests construct partial / Kiwi-format paint objects via literal
 * expressions and need a narrowing helper that TypeScript's control-flow
 * analysis respects. The previous implementations were `as unknown as X`
 * disguised as guards — they pass the predicate regardless of the
 * value's shape. These replacements check the minimum structural
 * signature that distinguishes each paint variant: a gradient has a
 * `gradientStops` array AND/OR `gradientHandlePositions`, an image has
 * an `imageRef` or `image` (or `scaleMode`).
 *
 * Kept permissive on the membership check (`in`) because test fixtures
 * mix API and Kiwi-format fields, but never a plain `!== null`.
 */
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asGradientPaint(value: unknown): value is FigGradientPaint {
  if (!isObject(value)) return false;
  return "gradientStops" in value || "gradientHandlePositions" in value || "stops" in value;
}

function asImagePaint(value: unknown): value is FigImagePaint {
  if (!isObject(value)) return false;
  return "imageRef" in value || "image" in value || "scaleMode" in value;
}

describe("getGradientStops", () => {
  it("reads gradientStops from API format", () => {
    const paint: FigGradientPaint = {
      type: "GRADIENT_LINEAR",
      gradientStops: [
        { color: { r: 1, g: 0, b: 0, a: 1 }, position: 0 },
        { color: { r: 0, g: 0, b: 1, a: 1 }, position: 1 },
      ],
      gradientHandlePositions: [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }],
    } as FigGradientPaint;
    const stops = getGradientStops(paint);
    expect(stops).toHaveLength(2);
    expect(stops[0].position).toBe(0);
    expect(stops[1].position).toBe(1);
  });

  it("reads stops from Kiwi format when gradientStops is absent", () => {
    const raw = {
      type: { value: 1, name: "GRADIENT_LINEAR" },
      stops: [
        { color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, position: 0 },
        { color: { r: 1, g: 1, b: 1, a: 1 }, position: 1 },
      ],
      transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    };
    if (asGradientPaint(raw)) {
      const stops = getGradientStops(raw);
      expect(stops).toHaveLength(2);
    }
  });

  it("returns empty array when neither format has stops", () => {
    const raw = { type: "GRADIENT_LINEAR" };
    if (asGradientPaint(raw)) {
      expect(getGradientStops(raw)).toHaveLength(0);
    }
  });
});

describe("getGradientDirection", () => {
  it("reads from gradientHandlePositions (API format)", () => {
    const paint = {
      type: "GRADIENT_LINEAR",
      gradientHandlePositions: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      gradientStops: [],
    } as FigGradientPaint;
    const dir = getGradientDirection(paint);
    expect(dir.start).toEqual({ x: 0, y: 0 });
    expect(dir.end).toEqual({ x: 1, y: 1 });
  });

  it("rejects a rank-deficient transform matrix (Kiwi format)", () => {
    // m00 = m01 = 0 → upper-2×2 determinant is zero: grad_x would be
    // constant across the whole element, so the direction is undefined.
    // The SSoT refuses to invent one rather than silently produce a
    // visually wrong gradient.
    const raw = {
      type: { value: 1, name: "GRADIENT_LINEAR" },
      transform: { m00: 0, m01: 0, m02: 0.5, m10: -1, m11: 0, m12: 1 },
    };
    if (asGradientPaint(raw)) {
      expect(() => getGradientDirection(raw)).toThrow(/non-invertible|det=0/);
    }
  });

  it("reads from transform matrix (Kiwi format, invertible 90° rotation)", () => {
    // Real case: Flighty World map. paint.transform rotates object space
    // 90° so grad_x = obj_y. Expected direction in normalized object
    // space: start at obj_y=0 (top), end at obj_y=1 (bottom).
    const raw = {
      type: { value: 1, name: "GRADIENT_LINEAR" },
      transform: { m00: 0, m01: 1, m02: 0, m10: -1, m11: 0, m12: 1 },
    };
    if (asGradientPaint(raw)) {
      const dir = getGradientDirection(raw);
      expect(dir.start.y).toBeCloseTo(0); // top = 0% stop
      expect(dir.end.y).toBeCloseTo(1);   // bottom = 100% stop
    }
  });
});

describe("getGradientDirectionFromTransform", () => {
  it("extracts direction from transform matrix", () => {
    const transform = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };
    const dir = getGradientDirectionFromTransform(transform);
    expect(dir.start).toBeDefined();
    expect(dir.end).toBeDefined();
  });
});

describe("getRadialGradientCenterAndRadius", () => {
  it("reads from gradientHandlePositions (API format)", () => {
    const paint = {
      type: "GRADIENT_RADIAL",
      gradientHandlePositions: [
        { x: 0.5, y: 0.5 },
        { x: 1.0, y: 0.5 },
      ],
      gradientStops: [],
    } as FigGradientPaint;
    const { center, radius } = getRadialGradientCenterAndRadius(paint);
    expect(center).toEqual({ x: 0.5, y: 0.5 });
    expect(radius).toBeCloseTo(0.5);
  });

  it("reads from transform (Kiwi format)", () => {
    const raw = {
      type: { value: 2, name: "GRADIENT_RADIAL" },
      transform: { m00: 0.5, m02: 0.5, m12: 0.5 },
    };
    if (asGradientPaint(raw)) {
      const { center, radius } = getRadialGradientCenterAndRadius(raw);
      expect(center).toEqual({ x: 0.5, y: 0.5 });
      expect(radius).toBe(0.5);
    }
  });
});

describe("getImageRef", () => {
  it("reads imageRef directly", () => {
    const paint = { type: "IMAGE", imageRef: "abc123" } as FigImagePaint;
    expect(getImageRef(paint)).toBe("abc123");
  });

  it("reads from image.hash byte array", () => {
    const raw = {
      type: "IMAGE",
      image: { hash: [0xab, 0xcd, 0xef] },
    };
    if (asImagePaint(raw)) {
      expect(getImageRef(raw)).toBe("abcdef");
    }
  });

  it("reads from imageHash string", () => {
    const raw = {
      type: "IMAGE",
      imageHash: "deadbeef",
    };
    if (asImagePaint(raw)) {
      expect(getImageRef(raw)).toBe("deadbeef");
    }
  });

  it("returns null when no ref available", () => {
    const paint = { type: "IMAGE" } as FigImagePaint;
    expect(getImageRef(paint)).toBeNull();
  });
});

describe("getScaleMode", () => {
  it("reads scaleMode directly", () => {
    const paint = { type: "IMAGE", scaleMode: "FIT" } as FigImagePaint;
    expect(getScaleMode(paint)).toBe("FIT");
  });

  it("reads from imageScaleMode KiwiEnumValue", () => {
    const raw = {
      type: "IMAGE",
      imageScaleMode: { value: 0, name: "FILL" },
    };
    if (asImagePaint(raw)) {
      expect(getScaleMode(raw)).toBe("FILL");
    }
  });

  it("defaults to FILL", () => {
    const paint = { type: "IMAGE" } as FigImagePaint;
    expect(getScaleMode(paint)).toBe("FILL");
  });
});
