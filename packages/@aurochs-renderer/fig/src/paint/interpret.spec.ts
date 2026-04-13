/**
 * @file Paint interpretation SoT tests
 *
 * These tests verify the shared paint interpretation functions that both
 * the SVG string renderer and SceneGraph builder consume.
 * Any regression here indicates a divergence risk for both renderers.
 */

import { describe, it, expect } from "vitest";
import {
  getGradientStops,
  getGradientDirection,
  getGradientDirectionFromTransform,
  getRadialGradientCenterAndRadius,
  getImageRef,
  getScaleMode,
} from "./interpret";
import type { FigGradientPaint, FigImagePaint } from "@aurochs/fig/types";

describe("getGradientStops", () => {
  it("reads gradientStops from API format", () => {
    const paint = {
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
    const paint = {
      type: { value: 1, name: "GRADIENT_LINEAR" },
      stops: [
        { color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, position: 0 },
        { color: { r: 1, g: 1, b: 1, a: 1 }, position: 1 },
      ],
      transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    } as unknown as FigGradientPaint;
    const stops = getGradientStops(paint);
    expect(stops).toHaveLength(2);
  });

  it("returns empty array when neither format has stops", () => {
    const paint = { type: "GRADIENT_LINEAR" } as unknown as FigGradientPaint;
    expect(getGradientStops(paint)).toHaveLength(0);
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

  it("reads from transform matrix (Kiwi format)", () => {
    const paint = {
      type: { value: 1, name: "GRADIENT_LINEAR" },
      transform: { m00: 0, m01: 0, m02: 0.5, m10: -1, m11: 0, m12: 1 },
    } as unknown as FigGradientPaint;
    const dir = getGradientDirection(paint);
    // grad0 = (m02, m12) = (0.5, 1), grad1 = (m00+m02, m10+m12) = (0.5, 0)
    // swapped: start = grad1, end = grad0
    expect(dir.start.x).toBeCloseTo(0.5);
    expect(dir.start.y).toBeCloseTo(0);
    expect(dir.end.x).toBeCloseTo(0.5);
    expect(dir.end.y).toBeCloseTo(1);
  });
});

describe("getGradientDirectionFromTransform", () => {
  it("returns default for undefined transform", () => {
    const dir = getGradientDirectionFromTransform(undefined);
    // Default: top-to-bottom gradient
    expect(dir.start).toEqual({ x: 0, y: 0 });
    expect(dir.end).toEqual({ x: 0, y: 1 });
  });

  it("handles identity transform", () => {
    const dir = getGradientDirectionFromTransform({ m00: 1, m02: 0, m10: 0, m12: 0 });
    // grad0=(0,0), grad1=(1,0), swapped: start=(1,0), end=(0,0)
    expect(dir.start).toEqual({ x: 1, y: 0 });
    expect(dir.end).toEqual({ x: 0, y: 0 });
  });
});

describe("getRadialGradientCenterAndRadius", () => {
  it("reads from handles (API format)", () => {
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
    const paint = {
      type: { value: 2, name: "GRADIENT_RADIAL" },
      transform: { m00: 0.5, m02: 0.5, m12: 0.5 },
    } as unknown as FigGradientPaint;
    const { center, radius } = getRadialGradientCenterAndRadius(paint);
    expect(center).toEqual({ x: 0.5, y: 0.5 });
    expect(radius).toBe(0.5);
  });
});

describe("getImageRef", () => {
  it("reads imageRef directly", () => {
    const paint = { type: "IMAGE", imageRef: "abc123" } as FigImagePaint;
    expect(getImageRef(paint)).toBe("abc123");
  });

  it("reads from image.hash byte array", () => {
    const paint = {
      type: "IMAGE",
      image: { hash: [0xab, 0xcd, 0xef] },
    } as unknown as FigImagePaint;
    expect(getImageRef(paint)).toBe("abcdef");
  });

  it("reads from imageHash string", () => {
    const paint = {
      type: "IMAGE",
      imageHash: "deadbeef",
    } as unknown as FigImagePaint;
    expect(getImageRef(paint)).toBe("deadbeef");
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
    const paint = {
      type: "IMAGE",
      imageScaleMode: { value: 0, name: "FILL" },
    } as unknown as FigImagePaint;
    expect(getScaleMode(paint)).toBe("FILL");
  });

  it("defaults to FILL", () => {
    const paint = { type: "IMAGE" } as FigImagePaint;
    expect(getScaleMode(paint)).toBe("FILL");
  });
});
