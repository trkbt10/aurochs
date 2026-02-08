/**
 * @file Linear gradient builder unit tests
 */

import { linearGradient } from "./linear-gradient";
import { PAINT_TYPE_VALUES, BLEND_MODE_VALUES } from "../../constants";

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

  it("chains multiple methods", () => {
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
});
