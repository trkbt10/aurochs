/**
 * @file Linear gradient builder unit tests
 */

import { linearGradient } from "./linear-gradient";
import { PAINT_TYPE_VALUES } from "../../constants";

describe("LinearGradientBuilder", () => {
  it("creates linear gradient with defaults", () => {
    const result = linearGradient().build();

    expect(result.type).toEqual({ value: PAINT_TYPE_VALUES.GRADIENT_LINEAR, name: "GRADIENT_LINEAR" });
    expect(result.stops).toHaveLength(2);
    expect(result.transform).toBeDefined();
  });

  it("outputs stops in Kiwi ColorStop format", () => {
    const result = linearGradient()
      .stops([
        { color: { r: 1, g: 0, b: 0, a: 1 }, position: 0 },
        { color: { r: 0, g: 0, b: 1, a: 1 }, position: 1 },
      ])
      .build();

    expect(result.stops).toHaveLength(2);
    expect(result.stops[0].color).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    expect(result.stops[0].position).toBe(0);
    expect(result.stops[1].position).toBe(1);
  });

  it("computes correct transform for default direction (left to right)", () => {
    // Default: start=(0, 0.5), end=(1, 0.5)
    const result = linearGradient().build();
    const t = result.transform;

    // Gradient (0,0) → end = (1, 0.5): m02=1, m12=0.5
    expect(t.m02).toBeCloseTo(1);
    expect(t.m12).toBeCloseTo(0.5);

    // Gradient (1,0) → start = (0, 0.5): m00 + m02 = 0 → m00 = -1
    expect(t.m00).toBeCloseTo(-1);
    expect(t.m10).toBeCloseTo(0);
  });

  it("computes correct transform for 90-degree angle (top to bottom)", () => {
    const result = linearGradient().angle(90).build();
    const t = result.transform;

    // 90° → start ≈ (0.5, 0), end ≈ (0.5, 1)
    // m02 = end.x = 0.5, m12 = end.y = 1
    expect(t.m02).toBeCloseTo(0.5);
    expect(t.m12).toBeCloseTo(1);

    // m00 = start.x - end.x = 0, m10 = start.y - end.y = -1
    expect(t.m00).toBeCloseTo(0);
    expect(t.m10).toBeCloseTo(-1);
  });

  it("sets custom stops and sorts by position", () => {
    const result = linearGradient()
      .addStop({ color: { r: 1, g: 0, b: 0, a: 1 }, position: 0 })
      .addStop({ color: { r: 0, g: 0, b: 1, a: 1 }, position: 1 })
      .addStop({ color: { r: 0, g: 1, b: 0, a: 1 }, position: 0.5 })
      .build();

    // 2 defaults + 3 added = 5 stops
    expect(result.stops).toHaveLength(5);
    expect(result.stops[2].position).toBe(0.5);
  });

  it("sets custom direction", () => {
    const result = linearGradient().direction({ startX: 0, startY: 0, endX: 1, endY: 1 }).build();
    const t = result.transform;

    // m02 = end.x = 1, m12 = end.y = 1
    expect(t.m02).toBeCloseTo(1);
    expect(t.m12).toBeCloseTo(1);

    // m00 = start.x - end.x = -1, m10 = start.y - end.y = -1
    expect(t.m00).toBeCloseTo(-1);
    expect(t.m10).toBeCloseTo(-1);
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
    expect(result.stops.length).toBe(4);
  });
});
